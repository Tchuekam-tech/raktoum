'use client'

import React, { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Flame,
  Gamepad2,
  GraduationCap,
  Layers,
  MessageSquare,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-react'
import type {
  AssessmentResult,
  DailyProgress,
  DayPlan,
  GameSessionRecord,
  LanguageMeta,
  LanguageWorkspaceSummary,
  StudyPlan,
  TutorMemory,
} from '@/lib/types'

export type NavTab =
  | 'dashboard'
  | 'study-plan'
  | 'assessment'
  | 'flashcards'
  | 'resources'
  | 'games'
  | 'situations'

export interface DashboardPayload {
  active_language: string
  meta: LanguageMeta
  summary: LanguageWorkspaceSummary
  plan: StudyPlan | null
  next_lesson: DayPlan | null
  last_assessment: AssessmentResult | null
  last_7_days: DailyProgress[]
  due_flashcards_count: number
  total_flashcards_count: number
  recent_games: GameSessionRecord[]
  saved_grammar_count: number
  dataset_counts: {
    grammar_topics: number
    vocabulary_sets: number
    phrasebook_categories: number
    assessment_questions: number
  }
  memories: TutorMemory[]
  languages_overview: {
    active_language: string
    languages: LanguageWorkspaceSummary[]
    all_supported_languages: LanguageMeta[]
  }
}

interface DashboardViewProps {
  data: DashboardPayload
  onNavigate: (tab: NavTab) => void
  onOpenLesson: (slotIndex: number) => void
  onRefresh: () => Promise<void>
}

export function DashboardView({
  data,
  onNavigate,
  onOpenLesson,
  onRefresh,
}: DashboardViewProps) {
  const [memoryInput, setMemoryInput] = useState('')
  const [memoryBusy, setMemoryBusy] = useState(false)

  const maxDailyXp = Math.max(40, ...data.last_7_days.map((d) => d.xp_earned))

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memoryInput.trim()) return
    setMemoryBusy(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: memoryInput.trim() }),
      })
      if (res.ok) {
        setMemoryInput('')
        await onRefresh()
      }
    } finally {
      setMemoryBusy(false)
    }
  }

  const handleDeleteMemory = async (id: string) => {
    setMemoryBusy(true)
    try {
      await fetch(`/api/memories?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await onRefresh()
    } finally {
      setMemoryBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top welcome + active next lesson hero strip (solid surface, zero gradients) */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col justify-between rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-5 lg:col-span-2">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--fl-muted)]">
              <span className="font-code rounded bg-[var(--fl-accent-soft)] px-2 py-0.5 text-[var(--fl-accent)]">
                {data.plan?.cefr_level ?? 'A1'}
              </span>
              <span>
                {data.meta.flag} {data.meta.name}
                {data.meta.self_name !== data.meta.name ? ` (${data.meta.self_name})` : ''}
              </span>
              <span>·</span>
              <span className="font-code">{data.active_language}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--fl-text)]">
              {data.plan ? data.plan.title : `Start your ${data.meta.name} study plan`}
            </h1>
            <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">
              {data.next_lesson
                ? `Next up: Week ${data.next_lesson.week}, Day ${data.next_lesson.day} — ${data.next_lesson.title}`
                : 'You have completed every lesson in this study plan. Take a placement quiz or start the next CEFR level.'}
            </p>
          </div>

          {data.plan && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--fl-muted)]">
                <span>
                  Plan progress: {data.plan.progress_day} / {data.plan.total_days} days completed
                </span>
                <span className="font-code font-medium text-[var(--fl-text)]">
                  {data.plan.completion_pct}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--fl-surface-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--fl-accent)] transition-all"
                  style={{ width: `${Math.min(100, data.plan.completion_pct)}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {data.next_lesson ? (
              <button
                type="button"
                onClick={() => onOpenLesson(data.next_lesson!.slot_index)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] transition-colors hover:bg-[var(--fl-accent-hover)]"
              >
                Continue Lesson
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('study-plan')}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] transition-colors hover:bg-[var(--fl-accent-hover)]"
              >
                Open Study Plan
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('assessment')}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--fl-border-strong)] bg-[var(--fl-surface)] px-3.5 py-2 text-sm font-medium text-[var(--fl-text)] transition-colors hover:bg-[var(--fl-surface-subtle)]"
            >
              <GraduationCap className="h-4 w-4 text-[var(--fl-accent)]" />
              Placement Quiz
            </button>
          </div>
        </div>

        {/* Metrics column */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--fl-muted)]">
              <span>Today&apos;s XP</span>
              <Trophy className="h-4 w-4 text-[var(--fl-accent)]" />
            </div>
            <p className="font-code mt-2 text-2xl font-semibold text-[var(--fl-text)]">
              {data.summary.progress.today_xp}
            </p>
            <p className="mt-1 text-xs text-[var(--fl-muted)]">
              {data.summary.progress.total_xp} total XP
            </p>
          </div>

          <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--fl-muted)]">
              <span>UTC Streak</span>
              <Flame className="h-4 w-4 text-[var(--fl-accent)]" />
            </div>
            <p className="font-code mt-2 text-2xl font-semibold text-[var(--fl-text)]">
              {data.summary.progress.current_streak}d
            </p>
            <p className="mt-1 text-xs text-[var(--fl-muted)]">Active days</p>
          </div>

          <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--fl-muted)]">
              <span>Lessons Done</span>
              <CheckCircle2 className="h-4 w-4 text-[var(--fl-accent)]" />
            </div>
            <p className="font-code mt-2 text-2xl font-semibold text-[var(--fl-text)]">
              {data.summary.progress.lessons_completed}
            </p>
            <p className="mt-1 text-xs text-[var(--fl-muted)]">In {data.meta.name}</p>
          </div>

          <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--fl-muted)]">
              <span>Due Cards</span>
              <Layers className="h-4 w-4 text-[var(--fl-accent)]" />
            </div>
            <p className="font-code mt-2 text-2xl font-semibold text-[var(--fl-text)]">
              {data.due_flashcards_count}
            </p>
            <p className="mt-1 text-xs text-[var(--fl-muted)]">
              {data.total_flashcards_count} in deck
            </p>
          </div>
        </div>
      </section>

      {/* Quick-launch practice modules */}
      <section aria-label="Learning modules" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('flashcards')}
          className="flex flex-col justify-between rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4 text-left transition-colors hover:border-[var(--fl-accent)]"
        >
          <div className="flex items-center justify-between">
            <Layers className="h-5 w-5 text-[var(--fl-accent)]" />
            <span className="font-code text-xs text-[var(--fl-muted)]">
              {data.due_flashcards_count} due
            </span>
          </div>
          <div className="mt-3">
            <h2 className="font-semibold text-[var(--fl-text)]">SM-2 Flashcards</h2>
            <p className="mt-0.5 text-xs text-[var(--fl-muted)]">
              Spaced repetition reviews tailored to {data.meta.name}.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('resources')}
          className="flex flex-col justify-between rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4 text-left transition-colors hover:border-[var(--fl-accent)]"
        >
          <div className="flex items-center justify-between">
            <BookOpen className="h-5 w-5 text-[var(--fl-accent)]" />
            <span className="font-code text-xs text-[var(--fl-muted)]">
              {data.dataset_counts.grammar_topics} topics
            </span>
          </div>
          <div className="mt-3">
            <h2 className="font-semibold text-[var(--fl-text)]">Grammar & Vocab</h2>
            <p className="mt-0.5 text-xs text-[var(--fl-muted)]">
              {data.dataset_counts.vocabulary_sets} vocabulary sets &{' '}
              {data.dataset_counts.phrasebook_categories} phrasebooks.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('games')}
          className="flex flex-col justify-between rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4 text-left transition-colors hover:border-[var(--fl-accent)]"
        >
          <div className="flex items-center justify-between">
            <Gamepad2 className="h-5 w-5 text-[var(--fl-accent)]" />
            <span className="font-code text-xs text-[var(--fl-muted)]">3 games</span>
          </div>
          <div className="mt-3">
            <h2 className="font-semibold text-[var(--fl-text)]">Practice Games</h2>
            <p className="mt-0.5 text-xs text-[var(--fl-muted)]">
              Vocabulary Pairs, Error Detective & Sentence Order.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('situations')}
          className="flex flex-col justify-between rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4 text-left transition-colors hover:border-[var(--fl-accent)]"
        >
          <div className="flex items-center justify-between">
            <MessageSquare className="h-5 w-5 text-[var(--fl-accent)]" />
            <span className="font-code text-xs text-[var(--fl-muted)]">50 scenarios</span>
          </div>
          <div className="mt-3">
            <h2 className="font-semibold text-[var(--fl-text)]">Lingu Situations</h2>
            <p className="mt-0.5 text-xs text-[var(--fl-muted)]">
              Rehearse everyday conversations with Lingu.
            </p>
          </div>
        </button>
      </section>

      {/* Bottom grid: 7-day UTC activity + Global Lingu Memories */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--fl-text)]">7-Day Activity (UTC)</h2>
              <p className="text-xs text-[var(--fl-muted)]">
                XP earned in {data.meta.name} over the last 7 UTC days
              </p>
            </div>
            <span className="font-code text-xs text-[var(--fl-muted)]">
              {data.last_7_days.reduce((s, d) => s + d.xp_earned, 0)} XP / 7d
            </span>
          </div>

          <div className="mt-6 grid grid-cols-7 items-end gap-2" style={{ height: '140px' }}>
            {data.last_7_days.map((day) => {
              const heightPct = day.xp_earned > 0 ? Math.max(12, Math.round((day.xp_earned / maxDailyXp) * 100)) : 6
              const shortLabel = day.date.slice(5)
              return (
                <div key={day.date} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="font-code text-[11px] text-[var(--fl-muted)]">
                    {day.xp_earned > 0 ? day.xp_earned : '0'}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      title={`${day.date}: ${day.xp_earned} XP`}
                      className={`w-full rounded-t-md transition-all ${
                        day.xp_earned > 0
                          ? 'bg-[var(--fl-accent)]'
                          : 'bg-[var(--fl-surface-subtle)]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="font-code text-[10px] text-[var(--fl-muted)]">{shortLabel}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Global Lingu Memories */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-[var(--fl-accent)]" />
                <h2 className="font-semibold text-[var(--fl-text)]">Lingu Tutor Memories</h2>
              </div>
              <span className="font-code text-xs text-[var(--fl-muted)]">Global across languages</span>
            </div>
            <p className="mt-1 text-xs text-[var(--fl-muted)]">
              User-controlled notes Lingu remembers across every language you study.
            </p>

            <ul className="mt-3 space-y-2">
              {data.memories.length === 0 ? (
                <li className="rounded-lg border border-dashed border-[var(--fl-border)] px-3 py-3 text-xs text-[var(--fl-muted)]">
                  No memories saved yet. Add a preference below.
                </li>
              ) : (
                data.memories.slice(0, 4).map((mem) => (
                  <li
                    key={mem.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2 text-sm text-[var(--fl-text-secondary)]"
                  >
                    <span>{mem.content}</span>
                    <button
                      type="button"
                      disabled={memoryBusy}
                      aria-label={`Delete memory "${mem.content.slice(0, 24)}"`}
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="mt-0.5 shrink-0 text-[var(--fl-muted)] hover:text-[var(--fl-danger)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <form onSubmit={handleAddMemory} className="mt-4 flex gap-2">
            <input
              type="text"
              value={memoryInput}
              onChange={(e) => setMemoryInput(e.target.value)}
              placeholder="Add a learning note for Lingu..."
              aria-label="New tutor memory"
              className="flex-1 rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-1.5 text-sm text-[var(--fl-text)] placeholder:text-[var(--fl-muted)] focus:border-[var(--fl-accent)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={memoryBusy || !memoryInput.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--fl-control)] px-3 py-1.5 text-sm font-medium text-[var(--fl-control-text)] transition-colors hover:bg-[var(--fl-control-hover)] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Save
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
