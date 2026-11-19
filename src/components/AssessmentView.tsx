'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, GraduationCap, HelpCircle, RotateCcw } from 'lucide-react'
import { TargetLanguageText } from './TargetLanguageText'
import type {
  AnswerRecord,
  AssessmentQuestion,
  AssessmentResult,
  CEFRLevel,
  LanguageMeta,
} from '@/lib/types'

interface AssessmentPayload {
  target_language: string
  meta: LanguageMeta
  questions: AssessmentQuestion[]
  last_assessment: AssessmentResult | null
}

interface AssessmentViewProps {
  activeLanguage: string
  onCompleted: () => Promise<void>
  onJumpToPlan: () => void
}

export function AssessmentView({
  activeLanguage,
  onCompleted,
  onJumpToPlan,
}: AssessmentViewProps) {
  const [data, setData] = useState<AssessmentPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { choice: string | null; dontKnow: boolean }>>(
    {}
  )
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [planBusy, setPlanBusy] = useState(false)
  const [planMessage, setPlanMessage] = useState<string | null>(null)

  const loadQuiz = useCallback(async () => {
    setLoading(true)
    setCurrentIdx(0)
    setAnswers({})
    setPlanMessage(null)
    try {
      const res = await fetch('/api/assessment', { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json()) as AssessmentPayload
        setData(json)
        setResult(json.last_assessment)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQuiz()
  }, [activeLanguage, loadQuiz])

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-8 text-sm text-[var(--fl-muted)]">
        Loading placement quiz...
      </div>
    )
  }

  const questions = data.questions
  const current = questions[currentIdx]
  const answeredCount = Object.keys(answers).length

  const selectChoice = (choice: string) => {
    if (!current) return
    setAnswers((prev) => ({
      ...prev,
      [current.id]: { choice, dontKnow: false },
    }))
  }

  const markDontKnow = () => {
    if (!current) return
    setAnswers((prev) => ({
      ...prev,
      [current.id]: { choice: null, dontKnow: true },
    }))
  }

  const submitQuiz = async () => {
    setSubmitting(true)
    try {
      const payload: AnswerRecord[] = questions.map((q) => {
        const ans = answers[q.id]
        const dontKnow = ans ? ans.dontKnow : true
        const correct = !dontKnow && ans?.choice === q.correct
        return {
          question_id: q.id,
          skill: q.skill,
          difficulty: q.difficulty,
          correct,
          dont_know: dontKnow,
        }
      })

      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      })
      if (res.ok) {
        const json = (await res.json()) as { result: AssessmentResult }
        setResult(json.result)
        await onCompleted()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const applyLevelToPlan = async (level: CEFRLevel) => {
    setPlanBusy(true)
    setPlanMessage(null)
    try {
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cefr_level: level, duration_weeks: 8, days_per_week: 5 }),
      })
      if (res.ok) {
        setPlanMessage(`Created an 8-week ${level} study plan for ${data.meta.name}.`)
        await onCompleted()
        onJumpToPlan()
      }
    } finally {
      setPlanBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--fl-muted)]">
            <span>
              {data.meta.flag} {data.meta.name}
            </span>
            <span>·</span>
            <span className="font-code">Deterministic CEFR A1–C2</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--fl-text)]">
            Adaptive Placement Quiz
          </h1>
          <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">
            Answer 12 questions across grammar, vocabulary, and reading—or declare knowledge gaps
            with &ldquo;I don&apos;t know&rdquo; so your study plan targets them accurately.
          </p>
        </div>

        {result && (
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setCurrentIdx(0)
              setAnswers({})
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fl-border-strong)] bg-[var(--fl-surface-elevated)] px-3.5 py-2 text-sm font-medium text-[var(--fl-text)] hover:bg-[var(--fl-surface-subtle)]"
          >
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
          </button>
        )}
      </div>

      {/* Results View */}
      {result ? (
        <section className="space-y-5 rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--fl-border)] pb-4">
            <div className="flex items-center gap-4">
              <div className="font-code flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--fl-accent)] text-2xl font-bold text-[var(--fl-accent-contrast)]">
                {result.cefr_level}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--fl-text)]">
                  Placement Complete — Recommended Level {result.cefr_level}
                </h2>
                <p className="mt-0.5 text-sm text-[var(--fl-text-secondary)]">{result.analysis}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={planBusy}
              onClick={() => applyLevelToPlan(result.cefr_level)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--fl-accent)] px-4 py-2.5 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)] disabled:opacity-50"
            >
              <GraduationCap className="h-4 w-4" />
              {planBusy ? 'Building Plan...' : `Build ${result.cefr_level} Study Plan`}
            </button>
          </div>

          {planMessage && (
            <div className="rounded-lg border border-[var(--fl-success)] bg-[var(--fl-success-soft)] px-4 py-2 text-sm text-[var(--fl-success)]">
              {planMessage}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {(['grammar', 'vocabulary', 'reading'] as const).map((skill) => {
              const pct = Math.round((result.skill_profile[skill] ?? 0) * 100)
              const isStrength = result.strengths.includes(skill)
              const isWeakness = result.weaknesses.includes(skill)
              return (
                <div
                  key={skill}
                  className="rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize text-[var(--fl-text)]">
                      {skill}
                    </span>
                    <span className="font-code text-sm font-semibold text-[var(--fl-text)]">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--fl-surface-subtle)]">
                    <div
                      className="h-full rounded-full bg-[var(--fl-accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--fl-muted)]">
                    {isStrength
                      ? 'Strength'
                      : isWeakness
                        ? 'Priority focus area'
                        : 'Developing skill'}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      ) : current ? (
        /* Active Quiz Card */
        <section className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--fl-border)] pb-4">
            <div className="flex items-center gap-2">
              <span className="font-code rounded bg-[var(--fl-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--fl-accent)]">
                {current.difficulty}
              </span>
              <span className="font-code rounded bg-[var(--fl-surface-subtle)] px-2 py-0.5 text-xs uppercase text-[var(--fl-text-secondary)]">
                {current.skill}
              </span>
            </div>
            <span className="font-code text-xs text-[var(--fl-muted)]">
              Question {currentIdx + 1} of {questions.length} · {answeredCount} answered
            </span>
          </div>

          <div className="mt-5">
            <h2 className="text-lg font-medium text-[var(--fl-text)]">
              <TargetLanguageText text={current.question} languageCode={data.target_language} />
            </h2>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {current.options.map((opt) => {
                const selected = answers[current.id]?.choice === opt && !answers[current.id]?.dontKnow
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => selectChoice(opt)}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selected
                        ? 'border-[var(--fl-accent)] bg-[var(--fl-accent-soft)] font-medium text-[var(--fl-text)]'
                        : 'border-[var(--fl-border)] bg-[var(--fl-surface)] text-[var(--fl-text)] hover:border-[var(--fl-accent)]'
                    }`}
                  >
                    <TargetLanguageText text={opt} languageCode={data.target_language} />
                  </button>
                )
              })}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={markDontKnow}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  answers[current.id]?.dontKnow
                    ? 'border-[var(--fl-warning)] bg-[var(--fl-warning-soft)] text-[var(--fl-warning)]'
                    : 'border-[var(--fl-border)] bg-[var(--fl-surface)] text-[var(--fl-muted)] hover:text-[var(--fl-text)]'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                I don&apos;t know (declare gap)
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--fl-border)] pt-4">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="rounded-lg border border-[var(--fl-border)] px-3.5 py-2 text-sm font-medium text-[var(--fl-text-secondary)] hover:bg-[var(--fl-surface-subtle)] disabled:opacity-40"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fl-control)] px-4 py-2 text-sm font-medium text-[var(--fl-control-text)] hover:bg-[var(--fl-control-hover)]"
                >
                  Next Question
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                disabled={submitting || answeredCount === 0}
                onClick={submitQuiz}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)] disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? 'Scoring...' : 'Finish & Score Quiz'}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
