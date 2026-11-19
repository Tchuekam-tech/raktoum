'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Send, Target, X } from 'lucide-react'
import { TargetLanguageText } from './TargetLanguageText'
import type { CEFRLevel, LanguageMeta, Situation } from '@/lib/types'

interface SituationsPayload {
  target_language: string
  meta: LanguageMeta
  cefr_level: CEFRLevel
  categories: string[]
  situations: Situation[]
}

interface ChatTurn {
  role: 'lingu' | 'learner'
  text: string
  coachTip?: string
}

interface SituationsViewProps {
  activeLanguage: string
  onXpEarned: () => Promise<void>
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All (50)',
  daily_life: 'Daily Life',
  travel: 'Travel',
  shopping: 'Shopping & Services',
  social: 'Social Life',
  work: 'Work',
}

export function SituationsView({ activeLanguage, onXpEarned }: SituationsViewProps) {
  const [category, setCategory] = useState('all')
  const [data, setData] = useState<SituationsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  // Active role-play state
  const [activeSituation, setActiveSituation] = useState<Situation | null>(null)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [suggestedPhrases, setSuggestedPhrases] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const loadSituations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/situations?category=${encodeURIComponent(category)}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        setData((await res.json()) as SituationsPayload)
      }
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    setActiveSituation(null)
    loadSituations()
  }, [activeLanguage, loadSituations])

  const startSituation = async (sit: Situation) => {
    setActiveSituation(sit)
    setTurns([])
    setSuggestedPhrases([])
    setSending(true)
    try {
      const res = await fetch('/api/situations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation_id: sit.id, message: '', turn_count: 0 }),
      })
      if (res.ok) {
        const json = (await res.json()) as {
          reply: string
          coach_tip: string
          suggested_phrases: string[]
        }
        setTurns([{ role: 'lingu', text: json.reply, coachTip: json.coach_tip }])
        setSuggestedPhrases(json.suggested_phrases)
      }
    } finally {
      setSending(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSituation || !input.trim()) return
    const text = input.trim()
    setInput('')
    const learnerTurnCount = turns.filter((t) => t.role === 'learner').length + 1
    setTurns((prev) => [...prev, { role: 'learner', text }])
    setSending(true)
    try {
      const res = await fetch('/api/situations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation_id: activeSituation.id,
          message: text,
          turn_count: learnerTurnCount,
        }),
      })
      if (res.ok) {
        const json = (await res.json()) as {
          reply: string
          coach_tip: string
          suggested_phrases: string[]
          xp_awarded: number
        }
        setTurns((prev) => [...prev, { role: 'lingu', text: json.reply, coachTip: json.coach_tip }])
        setSuggestedPhrases(json.suggested_phrases)
        if (json.xp_awarded > 0) {
          await onXpEarned()
        }
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--fl-muted)]">
          <span>
            {data?.meta.flag} {data?.meta.name ?? activeLanguage}
          </span>
          <span>·</span>
          <span className="font-code">{data?.cefr_level ?? 'A1'} Role-Plays with Lingu</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--fl-text)]">Everyday Situations</h1>
        <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">
          Choose from 50 practical scenarios across daily life, travel, shopping, social life, and
          work.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', ...(data?.categories ?? [])].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              category === cat
                ? 'border-[var(--fl-accent)] bg-[var(--fl-accent)] text-[var(--fl-accent-contrast)]'
                : 'border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] text-[var(--fl-text-secondary)] hover:border-[var(--fl-accent)]'
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-8 text-sm text-[var(--fl-muted)]">
          Loading situations...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Situations Grid */}
          <div className={`grid gap-3 sm:grid-cols-2 ${activeSituation ? 'lg:col-span-1 lg:grid-cols-1' : 'lg:col-span-3 lg:grid-cols-3'}`}>
            {data.situations.map((sit) => {
              const selected = activeSituation?.id === sit.id
              return (
                <button
                  key={sit.id}
                  type="button"
                  onClick={() => startSituation(sit)}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? 'border-[var(--fl-accent)] bg-[var(--fl-accent-soft)]'
                      : 'border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] hover:border-[var(--fl-accent)]'
                  }`}
                >
                  <div>
                    <span className="font-code text-[11px] uppercase text-[var(--fl-accent)]">
                      {CATEGORY_LABELS[sit.category] ?? sit.category}
                    </span>
                    <h2 className="mt-1 font-semibold text-[var(--fl-text)]">{sit.title}</h2>
                    <p className="mt-1 text-xs text-[var(--fl-text-secondary)]">{sit.scenario}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--fl-accent)]">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Practise with Lingu
                  </div>
                </button>
              )
            })}
          </div>

          {/* Active Rehearsal Panel */}
          {activeSituation && (
            <section className="flex h-[580px] flex-col rounded-xl border border-[var(--fl-accent)] bg-[var(--fl-surface-elevated)] lg:col-span-2">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--fl-border)] p-4">
                <div className="flex items-start gap-3">
                  <img
                    src="/logo.png"
                    alt="Lingu tutor avatar"
                    className="h-10 w-10 rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] object-contain p-1"
                  />
                  <div>
                    <h2 className="font-semibold text-[var(--fl-text)]">{activeSituation.title}</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--fl-text-secondary)]">
                      <Target className="h-3.5 w-3.5 shrink-0 text-[var(--fl-accent)]" />
                      {activeSituation.objective}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close role-play"
                  onClick={() => setActiveSituation(null)}
                  className="rounded-lg border border-[var(--fl-border)] p-1.5 text-[var(--fl-muted)] hover:bg-[var(--fl-surface-subtle)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {turns.map((turn, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      turn.role === 'learner' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                        turn.role === 'learner'
                          ? 'bg-[var(--fl-accent)] text-[var(--fl-accent-contrast)]'
                          : 'border border-[var(--fl-border)] bg-[var(--fl-surface)] text-[var(--fl-text)]'
                      }`}
                    >
                      {turn.text}
                    </div>
                    {turn.coachTip && (
                      <p className="mt-1 max-w-[85%] text-xs text-[var(--fl-muted)]">
                        {turn.coachTip}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {suggestedPhrases.length > 0 && (
                <div className="border-t border-[var(--fl-border)] bg-[var(--fl-surface)] px-4 py-2">
                  <div className="mb-1.5 text-[11px] font-medium text-[var(--fl-muted)]">
                    Helpful {data.meta.name} phrases (click to insert):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedPhrases.map((phrase, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInput(phrase)}
                        className="rounded-md border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] px-2.5 py-1 text-xs text-[var(--fl-text)] hover:border-[var(--fl-accent)]"
                      >
                        <TargetLanguageText text={phrase} languageCode={data.target_language} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form
                onSubmit={sendMessage}
                className="flex gap-2 border-t border-[var(--fl-border)] p-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Reply in ${data.meta.name}...`}
                  aria-label="Reply to Lingu"
                  className="flex-1 rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2 text-sm text-[var(--fl-text)] focus:border-[var(--fl-accent)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)] disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
