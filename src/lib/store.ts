import crypto from 'node:crypto'
import { getAllLanguagesMeta, getLanguageDataset, getLanguageMeta, isSupportedLanguage } from './data-loader'
import { addUtcDays, formatUtcDate, isCardDue, sm2Update } from './sm2'
import { buildStudyPlan, computeStreak } from './study-plan'
import {
  AssessmentResult,
  CEFRLevel,
  DailyProgress,
  DEFAULT_TARGET_LANGUAGE,
  Flashcard,
  GameSessionRecord,
  LanguageWorkspaceSummary,
  StudyPlan,
  TutorMemory,
} from './types'

export interface LanguageScopedState {
  target_language: string
  plan: StudyPlan | null
  last_assessment: AssessmentResult | null
  flashcards: Flashcard[]
  progress_by_date: Map<string, DailyProgress>
  game_sessions: GameSessionRecord[]
  saved_grammar_slugs: Set<string>
}

export interface GlobalAppState {
  active_language: string
  native_language: string
  user_name: string
  languages: Map<string, LanguageScopedState>
  memories: TutorMemory[]
}

const globalForStore = globalThis as unknown as { __freelingoStore?: GlobalAppState }

function seedLanguageState(code: string, withStarterActivity: boolean): LanguageScopedState {
  const meta = getLanguageMeta(code)
  const dataset = getLanguageDataset(code)
  const a1Units = dataset.curriculum.A1 ?? []

  // Choose a valid week count that fits all A1 units + completion test at 5 days/week.
  const minWeeks = Math.max(4, Math.ceil((a1Units.length + 1) / 5))
  const durationWeeks = [4, 8, 12, 16].find((w) => w >= minWeeks) ?? minWeeks

  const plan =
    a1Units.length > 0
      ? buildStudyPlan({
          id: `plan-${code.toLowerCase()}-1`,
          targetLanguage: code,
          languageName: meta.name,
          cefrLevel: 'A1',
          durationWeeks,
          daysPerWeek: 5,
          units: a1Units,
          i18n: meta.i18n,
        })
      : null

  const today = new Date()
  const todayStr = formatUtcDate(today)

  // Seed 6 authentic flashcards from the language's real A1 vocabulary sets.
  const seedWords = dataset.vocabulary
    .filter((set) => set.level === 'A1')
    .flatMap((set) => set.words)
    .filter((entry) => entry.word.length > 1)
    .slice(0, 6)

  const flashcards: Flashcard[] = seedWords.map((entry, idx) => ({
    id: `fc-${code.toLowerCase()}-${idx + 1}`,
    target_language: code,
    word: entry.word,
    definition: entry.definition,
    example_sentence: entry.example,
    translation: entry.definition,
    source: 'vocabulary',
    repetitions: idx < 2 ? 1 : 0,
    interval: 1,
    ease_factor: 2.5,
    next_review: idx < 4 ? todayStr : addUtcDays(today, 2),
    created_at: new Date().toISOString(),
  }))

  const progressByDate = new Map<string, DailyProgress>()

  if (withStarterActivity && plan) {
    // Mark first 2 lessons complete so the learner sees active progress immediately.
    let marked = 0
    for (const week of plan.weekly_plan) {
      for (const day of week.days) {
        if (marked < 2) {
          day.completed = true
          day.completed_at = new Date(Date.now() - (2 - marked) * 86_400_000).toISOString()
          marked += 1
        }
      }
    }
    plan.progress_day = marked
    plan.completion_pct = Number(((marked / plan.total_days) * 100).toFixed(1))

    const dMinus2 = addUtcDays(today, -2)
    const dMinus1 = addUtcDays(today, -1)
    progressByDate.set(dMinus2, {
      date: dMinus2,
      xp_earned: 55,
      lessons_completed: 1,
      flashcards_reviewed: 4,
      games_completed: 0,
    })
    progressByDate.set(dMinus1, {
      date: dMinus1,
      xp_earned: 70,
      lessons_completed: 1,
      flashcards_reviewed: 6,
      games_completed: 1,
    })
    progressByDate.set(todayStr, {
      date: todayStr,
      xp_earned: 20,
      lessons_completed: 0,
      flashcards_reviewed: 2,
      games_completed: 0,
    })
  }

  return {
    target_language: code,
    plan,
    last_assessment: null,
    flashcards,
    progress_by_date: progressByDate,
    game_sessions: [],
    saved_grammar_slugs: new Set(dataset.grammar.slice(0, 3).map((g) => g.slug)),
  }
}

export function getStore(): GlobalAppState {
  if (!globalForStore.__freelingoStore) {
    const languages = new Map<string, LanguageScopedState>()
    // Canonical default target language is always en-GB (never en-US).
    languages.set(DEFAULT_TARGET_LANGUAGE, seedLanguageState(DEFAULT_TARGET_LANGUAGE, true))

    globalForStore.__freelingoStore = {
      active_language: DEFAULT_TARGET_LANGUAGE,
      native_language: 'en',
      user_name: 'Learner',
      languages,
      memories: [
        {
          id: 'mem-1',
          content: 'Prefers concise grammar explanations with everyday conversational examples.',
          study_plan_id: `plan-${DEFAULT_TARGET_LANGUAGE.toLowerCase()}-1`,
          created_at: new Date().toISOString(),
        },
      ],
    }
  }
  return globalForStore.__freelingoStore
}

export function getActiveLanguageState(explicitLanguage?: string): LanguageScopedState {
  const store = getStore()
  const code =
    explicitLanguage && store.languages.has(explicitLanguage)
      ? explicitLanguage
      : store.active_language
  const existing = store.languages.get(code)
  if (existing) return existing
  const fallback = seedLanguageState(DEFAULT_TARGET_LANGUAGE, false)
  store.languages.set(DEFAULT_TARGET_LANGUAGE, fallback)
  store.active_language = DEFAULT_TARGET_LANGUAGE
  return fallback
}

export function addUserLanguage(targetLanguage: string): LanguageScopedState {
  if (!isSupportedLanguage(targetLanguage)) {
    throw new Error(`Unsupported target language: ${targetLanguage}`)
  }
  const store = getStore()
  const existing = store.languages.get(targetLanguage)
  if (existing) return existing

  const created = seedLanguageState(targetLanguage, false)
  store.languages.set(targetLanguage, created)
  return created
}

export function switchUserLanguage(targetLanguage: string): LanguageScopedState {
  const store = getStore()
  if (!store.languages.has(targetLanguage)) {
    addUserLanguage(targetLanguage)
  }
  store.active_language = targetLanguage
  return store.languages.get(targetLanguage)!
}

export function removeUserLanguage(targetLanguage: string): void {
  const store = getStore()
  if (store.languages.size <= 1) {
    throw new Error('Cannot delete the only language')
  }
  if (store.active_language === targetLanguage) {
    throw new Error('Cannot delete the active language')
  }
  if (!store.languages.has(targetLanguage)) {
    throw new Error('Language not found')
  }
  store.languages.delete(targetLanguage)
}

export function recordActivity(
  langState: LanguageScopedState,
  delta: Partial<Pick<DailyProgress, 'xp_earned' | 'lessons_completed' | 'flashcards_reviewed' | 'games_completed'>>
): DailyProgress {
  const todayStr = formatUtcDate(new Date())
  const current = langState.progress_by_date.get(todayStr) ?? {
    date: todayStr,
    xp_earned: 0,
    lessons_completed: 0,
    flashcards_reviewed: 0,
    games_completed: 0,
  }
  const updated: DailyProgress = {
    date: todayStr,
    xp_earned: current.xp_earned + (delta.xp_earned ?? 0),
    lessons_completed: current.lessons_completed + (delta.lessons_completed ?? 0),
    flashcards_reviewed: current.flashcards_reviewed + (delta.flashcards_reviewed ?? 0),
    games_completed: current.games_completed + (delta.games_completed ?? 0),
  }
  langState.progress_by_date.set(todayStr, updated)
  return updated
}

export function buildLast7Days(langState: LanguageScopedState): DailyProgress[] {
  const today = new Date()
  const days: DailyProgress[] = []
  for (let offset = 6; offset >= 0; offset--) {
    const iso = addUtcDays(today, -offset)
    const entry = langState.progress_by_date.get(iso) ?? {
      date: iso,
      xp_earned: 0,
      lessons_completed: 0,
      flashcards_reviewed: 0,
      games_completed: 0,
    }
    days.push(entry)
  }
  return days
}

export function summarizeLanguage(langState: LanguageScopedState, isActive: boolean): LanguageWorkspaceSummary {
  const todayStr = formatUtcDate(new Date())
  const entries = [...langState.progress_by_date.values()]
  const totalXp = entries.reduce((sum, e) => sum + e.xp_earned, 0)
  const todayXp = langState.progress_by_date.get(todayStr)?.xp_earned ?? 0
  const lessonsCompleted = entries.reduce((sum, e) => sum + e.lessons_completed, 0)
  const activeDates = entries.filter((e) => e.xp_earned > 0).map((e) => e.date)
  const currentStreak = computeStreak(activeDates, todayStr)
  const dueFlashcards = langState.flashcards.filter((c) => isCardDue(c)).length

  return {
    target_language: langState.target_language,
    meta: getLanguageMeta(langState.target_language),
    is_active: isActive,
    plan: langState.plan
      ? {
          id: langState.plan.id,
          cefr_level: langState.plan.cefr_level,
          progress_day: langState.plan.progress_day,
          total_days: langState.plan.total_days,
          completion_pct: langState.plan.completion_pct,
        }
      : null,
    progress: {
      total_xp: totalXp,
      today_xp: todayXp,
      current_streak: currentStreak,
      lessons_completed: lessonsCompleted,
      due_flashcards: dueFlashcards,
    },
  }
}

export function listUserLanguagesSummary(): {
  active_language: string
  languages: LanguageWorkspaceSummary[]
  all_supported_languages: ReturnType<typeof getAllLanguagesMeta>
} {
  const store = getStore()
  const languages = [...store.languages.values()].map((ls) =>
    summarizeLanguage(ls, ls.target_language === store.active_language)
  )
  return {
    active_language: store.active_language,
    languages,
    all_supported_languages: getAllLanguagesMeta(),
  }
}

export function createNewPlanForLanguage(params: {
  targetLanguage?: string
  cefrLevel: CEFRLevel
  durationWeeks: number
  daysPerWeek: number
}): StudyPlan {
  const langState = getActiveLanguageState(params.targetLanguage)
  const meta = getLanguageMeta(langState.target_language)
  const dataset = getLanguageDataset(langState.target_language)
  const units = dataset.curriculum[params.cefrLevel] ?? []

  const plan = buildStudyPlan({
    id: `plan-${langState.target_language.toLowerCase()}-${crypto.randomBytes(3).toString('hex')}`,
    targetLanguage: langState.target_language,
    languageName: meta.name,
    cefrLevel: params.cefrLevel,
    durationWeeks: params.durationWeeks,
    daysPerWeek: params.daysPerWeek,
    units,
    i18n: meta.i18n,
  })
  langState.plan = plan
  return plan
}

export function completeLessonSlot(
  slotIndex: number,
  targetLanguage?: string
): { plan: StudyPlan; xp_awarded: number; already_completed: boolean } {
  const langState = getActiveLanguageState(targetLanguage)
  if (!langState.plan) {
    throw new Error('No active study plan')
  }

  let foundDay = null
  for (const week of langState.plan.weekly_plan) {
    for (const day of week.days) {
      if (day.slot_index === slotIndex) {
        foundDay = day
        break
      }
    }
  }
  if (!foundDay) {
    throw new Error('Lesson slot not found')
  }

  if (foundDay.completed) {
    return { plan: langState.plan, xp_awarded: 0, already_completed: true }
  }

  foundDay.completed = true
  foundDay.completed_at = new Date().toISOString()

  const completedCount = langState.plan.weekly_plan
    .flatMap((w) => w.days)
    .filter((d) => d.completed).length

  langState.plan.progress_day = completedCount
  langState.plan.completion_pct = Number(
    ((completedCount / Math.max(1, langState.plan.total_days)) * 100).toFixed(1)
  )

  const xpAwarded = foundDay.unit_id === 'completion-test' ? 100 : 40
  recordActivity(langState, { xp_earned: xpAwarded, lessons_completed: 1 })

  return { plan: langState.plan, xp_awarded: xpAwarded, already_completed: false }
}

export function createFlashcard(params: {
  word: string
  definition: string
  example_sentence: string
  translation?: string
  source?: Flashcard['source']
  targetLanguage?: string
}): Flashcard {
  const langState = getActiveLanguageState(params.targetLanguage)
  const word = params.word.trim()
  const definition = params.definition.trim()
  if (!word || !definition) {
    throw new Error('Word and definition are required')
  }

  const card: Flashcard = {
    id: `fc-${crypto.randomBytes(4).toString('hex')}`,
    target_language: langState.target_language,
    word,
    definition,
    example_sentence: (params.example_sentence || '').trim() || `Example with ${word}.`,
    translation: (params.translation || definition).trim(),
    source: params.source ?? 'manual',
    repetitions: 0,
    interval: 1,
    ease_factor: 2.5,
    next_review: formatUtcDate(new Date()),
    created_at: new Date().toISOString(),
  }
  langState.flashcards.unshift(card)
  return card
}

export function reviewFlashcard(
  cardId: string,
  quality: number,
  targetLanguage?: string
): { card: Flashcard; xp_awarded: number } {
  const langState = getActiveLanguageState(targetLanguage)
  const idx = langState.flashcards.findIndex((c) => c.id === cardId)
  if (idx === -1) {
    throw new Error('Flashcard not found')
  }
  const updated = sm2Update(langState.flashcards[idx], quality)
  langState.flashcards[idx] = updated
  const xpAwarded = quality >= 3 ? 10 : 5
  recordActivity(langState, { xp_earned: xpAwarded, flashcards_reviewed: 1 })
  return { card: updated, xp_awarded: xpAwarded }
}

export function deleteFlashcard(cardId: string, targetLanguage?: string): void {
  const langState = getActiveLanguageState(targetLanguage)
  const before = langState.flashcards.length
  langState.flashcards = langState.flashcards.filter((c) => c.id !== cardId)
  if (langState.flashcards.length === before) {
    throw new Error('Flashcard not found')
  }
}

export function recordGameSession(params: {
  game_type: GameSessionRecord['game_type']
  cefr_level: CEFRLevel
  score: number
  total: number
  targetLanguage?: string
}): GameSessionRecord {
  const langState = getActiveLanguageState(params.targetLanguage)
  const xpEarned = Math.max(10, Math.round((params.score / Math.max(1, params.total)) * 35))
  const session: GameSessionRecord = {
    id: `game-${crypto.randomBytes(4).toString('hex')}`,
    target_language: langState.target_language,
    game_type: params.game_type,
    cefr_level: params.cefr_level,
    score: params.score,
    total: params.total,
    xp_earned: xpEarned,
    completed_at: new Date().toISOString(),
  }
  langState.game_sessions.unshift(session)
  recordActivity(langState, { xp_earned: xpEarned, games_completed: 1 })
  return session
}

export function toggleSavedGrammarTopic(slug: string, targetLanguage?: string): string[] {
  const langState = getActiveLanguageState(targetLanguage)
  if (langState.saved_grammar_slugs.has(slug)) {
    langState.saved_grammar_slugs.delete(slug)
  } else {
    langState.saved_grammar_slugs.add(slug)
  }
  return [...langState.saved_grammar_slugs]
}

export function addTutorMemory(content: string): TutorMemory {
  const store = getStore()
  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error('Memory content cannot be empty')
  }
  const activeState = getActiveLanguageState()
  const mem: TutorMemory = {
    id: `mem-${crypto.randomBytes(3).toString('hex')}`,
    content: trimmed,
    study_plan_id: activeState.plan?.id ?? null,
    created_at: new Date().toISOString(),
  }
  store.memories.unshift(mem)
  return mem
}

export function deleteTutorMemory(id: string): void {
  const store = getStore()
  store.memories = store.memories.filter((m) => m.id !== id)
}
