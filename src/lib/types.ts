export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export type LessonType =
  | 'grammar'
  | 'vocabulary'
  | 'reading'
  | 'writing'
  | 'listening'
  | 'speaking'
  | 'review'

export const LESSON_TYPES: LessonType[] = [
  'grammar',
  'vocabulary',
  'reading',
  'writing',
  'listening',
  'speaking',
  'review',
]

export const DEFAULT_TARGET_LANGUAGE = 'en-GB'
export const COMPLETION_UNIT_ID = 'completion-test'

export interface CurriculumI18n {
  lesson_title: string
  test_unit_title: string
  test_title: string
  test_objectives: string[]
}

export interface LanguageMeta {
  code: string
  name: string
  self_name: string
  iso639: string
  flag: string
  script: string
  romanization: string
  uses_word_spacing: boolean
  reading_length_unit: string
  i18n: CurriculumI18n
}

export interface CurriculumUnit {
  id: string
  level: CEFRLevel
  unit_number: number
  title: string
  grammar_points: string[]
  vocabulary_set_ids: string[]
  lesson_types: LessonType[]
  competency_checklist: string[]
  default_weeks: number
  prerequisite_unit: string | null
}

export type Skill = 'grammar' | 'vocabulary' | 'reading'

export interface AssessmentQuestion {
  id: string
  skill: Skill
  difficulty: CEFRLevel
  question: string
  options: string[]
  correct: string
  grammar_slug: string | null
}

export interface AnswerRecord {
  question_id: string
  skill: Skill
  difficulty: CEFRLevel
  correct: boolean
  dont_know?: boolean
}

export interface AssessmentResult {
  cefr_level: CEFRLevel
  score: number
  skill_profile: Record<Skill, number>
  strengths: Skill[]
  weaknesses: Skill[]
  analysis: string
}

export interface GrammarExample {
  text: string
  translation?: string | null
  note?: string | null
}

export interface GrammarMistake {
  wrong: string
  correct: string
  note: string
}

export interface GrammarTopic {
  slug: string
  title: string
  level: CEFRLevel
  category: string
  summary: string
  explanation: string
  structure?: string | null
  rules: string[]
  examples: GrammarExample[]
  common_mistakes: GrammarMistake[]
  related: string[]
}

export interface VocabularyEntry {
  word: string
  pos: string
  definition: string
  example: string
  ipa?: string | null
  frequency_rank?: number | null
}

export interface VocabularySet {
  id: string
  level: CEFRLevel
  topic: string
  unit_ref: string
  words: VocabularyEntry[]
}

export type Register = 'formal' | 'neutral' | 'informal'

export interface PhrasebookEntry {
  text: string
  context: string
  register: Register
  unit_ref?: string | null
  romanization?: string | null
}

export interface PhrasebookCategory {
  id: string
  level: CEFRLevel
  situation: string
  icon: string
  phrases: PhrasebookEntry[]
}

export interface Situation {
  id: string
  category: string
  title: string
  scenario: string
  role: string
  objective: string
}

export interface LanguageDataset {
  code: string
  curriculum: Record<CEFRLevel, CurriculumUnit[]>
  assessment: AssessmentQuestion[]
  grammar: GrammarTopic[]
  vocabulary: VocabularySet[]
  phrasebook: PhrasebookCategory[]
}

export interface DayPlan {
  slot_index: number
  week: number
  day: number
  unit_id: string
  unit_title: string
  lesson_type: LessonType
  title: string
  objectives: string[]
  estimated_minutes: number
  grammar_points: string[]
  vocabulary_set_ids: string[]
  completed: boolean
  completed_at?: string | null
}

export interface WeekPlan {
  week: number
  theme: string
  days: DayPlan[]
}

export interface StudyPlan {
  id: string
  target_language: string
  title: string
  cefr_level: CEFRLevel
  duration_weeks: number
  days_per_week: number
  ends_with_test: boolean
  progress_day: number
  total_days: number
  completion_pct: number
  created_at: string
  weekly_plan: WeekPlan[]
}

export interface Flashcard {
  id: string
  target_language: string
  word: string
  definition: string
  example_sentence: string
  translation: string
  source: 'manual' | 'vocabulary' | 'phrasebook' | 'lesson'
  repetitions: number
  interval: number
  ease_factor: number
  next_review: string // YYYY-MM-DD (UTC)
  created_at: string
}

export interface DailyProgress {
  date: string // YYYY-MM-DD (UTC)
  xp_earned: number
  lessons_completed: number
  flashcards_reviewed: number
  games_completed: number
}

export interface GameSessionRecord {
  id: string
  target_language: string
  game_type: 'vocab_pairs' | 'error_detective' | 'sentence_order'
  cefr_level: CEFRLevel
  score: number
  total: number
  xp_earned: number
  completed_at: string
}

export interface LanguageWorkspaceSummary {
  target_language: string
  meta: LanguageMeta
  is_active: boolean
  plan: {
    id: string
    cefr_level: CEFRLevel
    progress_day: number
    total_days: number
    completion_pct: number
  } | null
  progress: {
    total_xp: number
    today_xp: number
    current_streak: number
    lessons_completed: number
    due_flashcards: number
  }
}

export interface TutorMemory {
  id: string
  content: string
  study_plan_id: string | null
  created_at: string
}
