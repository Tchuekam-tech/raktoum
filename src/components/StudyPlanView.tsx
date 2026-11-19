'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { TargetLanguageText } from './TargetLanguageText'
import {
  AssessmentQuestion,
  CEFRLevel,
  CEFR_LEVELS,
  DayPlan,
  GrammarTopic,
  LanguageMeta,
  StudyPlan,
  VocabularyEntry,
} from '@/lib/types'

interface StudyPlanApiResponse {
  target_language: string
  meta: LanguageMeta
  plan: StudyPlan | null
  unit_counts: Record<CEFRLevel, number>
}

interface LessonDetailPayload {
  target_language: string
  slot: DayPlan
  grammar_topics: GrammarTopic[]
  vocabulary_words: VocabularyEntry[]
  exercises: AssessmentQuestion[]
}

interface StudyPlanViewProps {
  activeLanguage: string
  initialLessonSlot: number | null
  onClearInitialLesson: () => void
  onPlanUpdated: () => Promise<void>
}

export function StudyPlanView({
  activeLanguage,
  initialLessonSlot,
  onClearInitialLesson,
  onPlanUpdated,
}: StudyPlanViewProps) {
  const [data, setData] = useState<StudyPlanApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(1)

  // Builder form state
  const [builderOpen, setBuilderOpen] = useState(false)
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('A1')
  const [durationWeeks, setDurationWeeks] = useState(4)
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [builderError, setBuilderError] = useState<string | null>(null)
  const [builderBusy, setBuilderBusy] = useState(false)

  // Lesson runner modal state
  const [lessonDetail, setLessonDetail] = useState<LessonDetailPayload | null>(null)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, string>>({})
  const [completing, setCompleting] = useState(false)
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set())
  const [completionBanner, setCompletionBanner] = useState<string | null>(null)

  const loadPlan = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/study-plan', { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json()) as StudyPlanApiResponse
        setData(json)
        if (json.plan) {
          setCefrLevel(json.plan.cefr_level)
          const firstIncomplete = json.plan.weekly_plan.find((w) =>
            w.days.some((d) => !d.completed)
          )
          setSelectedWeek(firstIncomplete?.week ?? 1)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlan()
  }, [activeLanguage, loadPlan])

  const openLesson = useCallback(async (slotIndex: number) => {
    setLessonLoading(true)
    setExerciseAnswers({})
    setCompletionBanner(null)
    try {
      const res = await fetch(`/api/lessons/complete?slot=${slotIndex}`, { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json()) as LessonDetailPayload
        setLessonDetail(json)
      }
    } finally {
      setLessonLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialLessonSlot !== null) {
      openLesson(initialLessonSlot)
      onClearInitialLesson()
    }
  }, [initialLessonSlot, openLesson, onClearInitialLesson])

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setBuilderBusy(true)
    setBuilderError(null)
    try {
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cefr_level: cefrLevel,
          duration_weeks: durationWeeks,
          days_per_week: daysPerWeek,
        }),
      })
      const json = (await res.json()) as { plan?: StudyPlan; error?: string }
      if (!res.ok) {
        setBuilderError(json.error ?? 'Could not build study plan')
        return
      }
      setBuilderOpen(false)
      await loadPlan()
      await onPlanUpdated()
    } finally {
      setBuilderBusy(false)
    }
  }

  const handleCompleteLesson = async () => {
    if (!lessonDetail) return
    setCompleting(true)
    try {
      const res = await fetch('/api/lessons/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_index: lessonDetail.slot.slot_index }),
      })
      if (res.ok) {
        const json = (await res.json()) as { xp_awarded: number; already_completed: boolean }
        setCompletionBanner(
          json.already_completed
            ? 'Lesson already completed — great review!'
            : `Lesson completed! +${json.xp_awarded} XP added to your ${data?.meta.name ?? ''} progress.`
        )
        setLessonDetail({
          ...lessonDetail,
          slot: { ...lessonDetail.slot, completed: true },
        })
        await loadPlan()
        await onPlanUpdated()
      }
    } finally {
      setCompleting(false)
    }
  }

  const handleSaveVocabCard = async (entry: VocabularyEntry) => {
    const res = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: entry.word,
        definition: entry.definition,
        example_sentence: entry.example,
        source: 'lesson',
      }),
    })
    if (res.ok) {
      setSavedCards((prev) => new Set(prev).add(entry.word))
      await onPlanUpdated()
    }
  }

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-8 text-sm text-[var(--fl-muted)]">
        Loading study plan...
      </div>
    )
  }

  const activeWeekObj =
    data.plan?.weekly_plan.find((w) => w.week === selectedWeek) ?? data.plan?.weekly_plan[0] ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--fl-muted)]">
            <span>
              {data.meta.flag} {data.meta.name}
            </span>
            <span>·</span>
            <span className="font-code">{data.plan?.cefr_level ?? 'A1'}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--fl-text)]">
            {data.plan ? data.plan.title : 'Study Plan'}
          </h1>
          <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">
            Deterministic A1–C2 curriculum schedule reserving the final slot for the level completion
            test.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setBuilderError(null)
            setBuilderOpen((v) => !v)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--fl-control)] px-3.5 py-2 text-sm font-medium text-[var(--fl-control-text)] transition-colors hover:bg-[var(--fl-control-hover)]"
        >
          <Calendar className="h-4 w-4" />
          {builderOpen ? 'Close Plan Builder' : 'Configure New Plan'}
        </button>
      </div>

      {/* Deterministic Study Plan Builder */}
      {builderOpen && (
        <form
          onSubmit={handleGeneratePlan}
          className="rounded-xl border border-[var(--fl-accent)] bg-[var(--fl-surface-elevated)] p-5"
        >
          <h2 className="text-base font-semibold text-[var(--fl-text)]">
            Build Deterministic Study Plan ({data.meta.name})
          </h2>
          <p className="mt-1 text-xs text-[var(--fl-muted)]">
            Each curriculum unit receives a fair teaching quota plus one final completion test slot.
          </p>

          {builderError && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-[var(--fl-danger)] bg-[var(--fl-danger-soft)] px-3 py-2 text-sm text-[var(--fl-danger)]"
            >
              {builderError}
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="plan-cefr"
                className="block text-xs font-medium text-[var(--fl-text-secondary)]"
              >
                CEFR Level
              </label>
              <select
                id="plan-cefr"
                value={cefrLevel}
                onChange={(e) => setCefrLevel(e.target.value as CEFRLevel)}
                className="mt-1 w-full rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2 text-sm text-[var(--fl-text)]"
              >
                {CEFR_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl} ({data.unit_counts[lvl]} units)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="plan-weeks"
                className="block text-xs font-medium text-[var(--fl-text-secondary)]"
              >
                Duration (weeks)
              </label>
              <select
                id="plan-weeks"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2 text-sm text-[var(--fl-text)]"
              >
                {[4, 8, 12, 16].map((w) => (
                  <option key={w} value={w}>
                    {w} weeks
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="plan-days"
                className="block text-xs font-medium text-[var(--fl-text-secondary)]"
              >
                Days per week
              </label>
              <select
                id="plan-days"
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2 text-sm text-[var(--fl-text)]"
              >
                {[3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {d} days / week ({durationWeeks * d} total slots)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setBuilderOpen(false)}
              className="rounded-lg border border-[var(--fl-border)] px-3.5 py-2 text-sm font-medium text-[var(--fl-text-secondary)] hover:bg-[var(--fl-surface-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={builderBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {builderBusy ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>
        </form>
      )}

      {/* Week selector tabs */}
      {data.plan && (
        <div className="space-y-4">
          <div
            role="tablist"
            aria-label="Study plan weeks"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {data.plan.weekly_plan.map((week) => {
              const doneInWeek = week.days.filter((d) => d.completed).length
              const isSelected = week.week === (activeWeekObj?.week ?? 1)
              return (
                <button
                  key={week.week}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => setSelectedWeek(week.week)}
                  className={`shrink-0 rounded-lg border px-3.5 py-2 text-left transition-colors ${
                    isSelected
                      ? 'border-[var(--fl-accent)] bg-[var(--fl-accent)] text-[var(--fl-accent-contrast)]'
                      : 'border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] text-[var(--fl-text)] hover:border-[var(--fl-accent)]'
                  }`}
                >
                  <div className="font-code text-xs font-semibold">Week {week.week}</div>
                  <div
                    className={`mt-0.5 text-[11px] ${
                      isSelected ? 'opacity-90' : 'text-[var(--fl-muted)]'
                    }`}
                  >
                    {doneInWeek}/{week.days.length} done
                  </div>
                </button>
              )
            })}
          </div>

          {activeWeekObj && (
            <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--fl-border)] pb-3">
                <div>
                  <span className="font-code text-xs uppercase text-[var(--fl-accent)]">
                    Week {activeWeekObj.week}
                  </span>
                  <h2 className="text-lg font-semibold text-[var(--fl-text)]">
                    {activeWeekObj.theme}
                  </h2>
                </div>
                <span className="font-code text-xs text-[var(--fl-muted)]">
                  {activeWeekObj.days.length} sessions
                </span>
              </div>

              <div className="grid gap-3">
                {activeWeekObj.days.map((day) => (
                  <div
                    key={day.slot_index}
                    className={`flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center ${
                      day.completed
                        ? 'border-[var(--fl-border)] bg-[var(--fl-surface)]'
                        : 'border-[var(--fl-border)] bg-[var(--fl-surface-elevated)]'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-code font-semibold text-[var(--fl-accent)]">
                          Day {day.day}
                        </span>
                        <span className="font-code rounded bg-[var(--fl-surface-subtle)] px-2 py-0.5 uppercase text-[var(--fl-text-secondary)]">
                          {day.lesson_type}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[var(--fl-muted)]">
                          <Clock className="h-3 w-3" />
                          {day.estimated_minutes}m
                        </span>
                        {day.completed && (
                          <span className="inline-flex items-center gap-1 font-medium text-[var(--fl-success)]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-[var(--fl-text)]">{day.title}</h3>
                      {day.objectives.length > 0 && (
                        <ul className="space-y-0.5 text-xs text-[var(--fl-muted)]">
                          {day.objectives.map((obj, idx) => (
                            <li key={idx}>• {obj}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openLesson(day.slot_index)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                        day.completed
                          ? 'border border-[var(--fl-border-strong)] bg-[var(--fl-surface-elevated)] text-[var(--fl-text)] hover:bg-[var(--fl-surface-subtle)]'
                          : 'bg-[var(--fl-accent)] text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)]'
                      }`}
                    >
                      {day.completed ? 'Review Lesson' : 'Start Lesson'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Lesson Runner Modal */}
      {(lessonLoading || lessonDetail) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-runner-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--fl-border)] px-5 py-4">
              <div>
                <div className="font-code text-xs uppercase text-[var(--fl-accent)]">
                  {lessonDetail
                    ? `Week ${lessonDetail.slot.week} · Day ${lessonDetail.slot.day} · ${lessonDetail.slot.lesson_type}`
                    : 'Loading lesson'}
                </div>
                <h2
                  id="lesson-runner-title"
                  className="mt-0.5 text-lg font-semibold text-[var(--fl-text)]"
                >
                  {lessonDetail?.slot.title ?? 'Preparing curriculum lesson...'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close lesson"
                onClick={() => setLessonDetail(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--fl-border)] text-[var(--fl-text-secondary)] hover:bg-[var(--fl-surface-subtle)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {lessonLoading || !lessonDetail ? (
              <div className="p-8 text-sm text-[var(--fl-muted)]">Loading unit materials...</div>
            ) : (
              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                {completionBanner && (
                  <div
                    role="status"
                    className="rounded-lg border border-[var(--fl-success)] bg-[var(--fl-success-soft)] px-4 py-3 text-sm font-medium text-[var(--fl-success)]"
                  >
                    {completionBanner}
                  </div>
                )}

                {/* Unit Grammar Focus */}
                {lessonDetail.grammar_topics.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--fl-text)]">
                      <BookOpen className="h-4 w-4 text-[var(--fl-accent)]" />
                      Grammar Focus
                    </h3>
                    {lessonDetail.grammar_topics.map((topic) => (
                      <div
                        key={topic.slug}
                        className="rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[var(--fl-text)]">{topic.title}</h4>
                          <span className="font-code text-xs text-[var(--fl-muted)]">
                            {topic.level} · {topic.category}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">
                          {topic.summary}
                        </p>
                        {topic.structure && (
                          <div className="font-code mt-2 rounded bg-[var(--fl-surface-subtle)] px-2.5 py-1.5 text-xs text-[var(--fl-text)]">
                            {topic.structure}
                          </div>
                        )}
                        {topic.rules.length > 0 && (
                          <ul className="mt-2.5 space-y-1 text-xs text-[var(--fl-text-secondary)]">
                            {topic.rules.slice(0, 3).map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {/* Unit Vocabulary */}
                {lessonDetail.vocabulary_words.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--fl-text)]">
                      Key Vocabulary ({lessonDetail.vocabulary_words.length})
                    </h3>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {lessonDetail.vocabulary_words.map((entry) => {
                        const isSaved = savedCards.has(entry.word)
                        return (
                          <div
                            key={entry.word}
                            className="flex flex-col justify-between rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-3"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <TargetLanguageText
                                  text={entry.word}
                                  languageCode={lessonDetail.target_language}
                                  className="font-semibold text-[var(--fl-text)]"
                                  showSpeakButton
                                />
                                <span className="font-code text-[11px] text-[var(--fl-muted)]">
                                  {entry.pos}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[var(--fl-text-secondary)]">
                                {entry.definition}
                              </p>
                              <p className="mt-1 text-xs italic text-[var(--fl-muted)]">
                                <TargetLanguageText
                                  text={entry.example}
                                  languageCode={lessonDetail.target_language}
                                />
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isSaved}
                              onClick={() => handleSaveVocabCard(entry)}
                              className="mt-2.5 inline-flex w-fit items-center gap-1 rounded border border-[var(--fl-border-strong)] bg-[var(--fl-surface-elevated)] px-2 py-1 text-xs font-medium text-[var(--fl-text)] hover:border-[var(--fl-accent)] disabled:opacity-60"
                            >
                              <Plus className="h-3 w-3" />
                              {isSaved ? 'Added to Deck' : 'Add Flashcard'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Interactive Unit Practice Check */}
                {lessonDetail.exercises.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--fl-text)]">
                      Practice Check ({lessonDetail.exercises.length} questions)
                    </h3>
                    {lessonDetail.exercises.map((ex, idx) => {
                      const picked = exerciseAnswers[ex.id]
                      const isRight = picked === ex.correct
                      return (
                        <div
                          key={ex.id}
                          className="rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-4"
                        >
                          <p className="text-sm font-medium text-[var(--fl-text)]">
                            {idx + 1}.{' '}
                            <TargetLanguageText
                              text={ex.question}
                              languageCode={lessonDetail.target_language}
                            />
                          </p>
                          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                            {ex.options.map((opt) => {
                              const selected = picked === opt
                              let style =
                                'border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] text-[var(--fl-text)] hover:border-[var(--fl-accent)]'
                              if (picked) {
                                if (opt === ex.correct) {
                                  style =
                                    'border-[var(--fl-success)] bg-[var(--fl-success-soft)] text-[var(--fl-success)] font-medium'
                                } else if (selected && !isRight) {
                                  style =
                                    'border-[var(--fl-danger)] bg-[var(--fl-danger-soft)] text-[var(--fl-danger)]'
                                }
                              }
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setExerciseAnswers((prev) => ({ ...prev, [ex.id]: opt }))
                                  }
                                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${style}`}
                                >
                                  <TargetLanguageText
                                    text={opt}
                                    languageCode={lessonDetail.target_language}
                                  />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </section>
                )}
              </div>
            )}

            {lessonDetail && (
              <div className="flex items-center justify-between border-t border-[var(--fl-border)] bg-[var(--fl-surface)] px-5 py-3.5">
                <span className="text-xs text-[var(--fl-muted)]">
                  {Object.keys(exerciseAnswers).length}/{lessonDetail.exercises.length} practice
                  questions answered
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLessonDetail(null)}
                    className="rounded-lg border border-[var(--fl-border)] px-3.5 py-2 text-sm font-medium text-[var(--fl-text-secondary)] hover:bg-[var(--fl-surface-subtle)]"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={completing}
                    onClick={handleCompleteLesson}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {lessonDetail.slot.completed
                      ? 'Completed'
                      : completing
                        ? 'Saving...'
                        : 'Complete Lesson (+40 XP)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
