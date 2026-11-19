'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Eye, Layers, Plus, Search, Trash2 } from 'lucide-react'
import { TargetLanguageText } from './TargetLanguageText'
import type { Flashcard, LanguageMeta } from '@/lib/types'

interface FlashcardsPayload {
  target_language: string
  meta: LanguageMeta
  flashcards: Flashcard[]
  due_flashcards: Flashcard[]
  due_count: number
  total_count: number
}

interface FlashcardsViewProps {
  activeLanguage: string
  onUpdated: () => Promise<void>
}

const QUALITY_OPTIONS = [
  { quality: 1, label: 'Again', hint: 'Reset (1d)' },
  { quality: 3, label: 'Hard', hint: 'Pass' },
  { quality: 4, label: 'Good', hint: 'Standard SM-2' },
  { quality: 5, label: 'Easy', hint: 'Boost EF' },
]

export function FlashcardsView({ activeLanguage, onUpdated }: FlashcardsViewProps) {
  const [data, setData] = useState<FlashcardsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // New card form
  const [showAdd, setShowAdd] = useState(false)
  const [word, setWord] = useState('')
  const [definition, setDefinition] = useState('')
  const [example, setExample] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const loadCards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/flashcards', { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json()) as FlashcardsPayload
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setRevealed(false)
    setLastFeedback(null)
    loadCards()
  }, [activeLanguage, loadCards])

  const handleReview = async (cardId: string, quality: number) => {
    setReviewBusy(true)
    try {
      const res = await fetch(`/api/flashcards/${encodeURIComponent(cardId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality }),
      })
      if (res.ok) {
        const json = (await res.json()) as { card: Flashcard; xp_awarded: number }
        setLastFeedback(
          `Reviewed "${json.card.word}" — next review in ${json.card.interval}d (EF ${json.card.ease_factor.toFixed(2)}, +${json.xp_awarded} XP).`
        )
        setRevealed(false)
        await loadCards()
        await onUpdated()
      }
    } finally {
      setReviewBusy(false)
    }
  }

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!word.trim() || !definition.trim()) {
      setFormError('Both word/phrase and definition are required.')
      return
    }
    setFormError(null)
    const res = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: word.trim(),
        definition: definition.trim(),
        example_sentence: example.trim(),
        source: 'manual',
      }),
    })
    if (res.ok) {
      setWord('')
      setDefinition('')
      setExample('')
      setShowAdd(false)
      await loadCards()
      await onUpdated()
    } else {
      const err = (await res.json()) as { error?: string }
      setFormError(err.error ?? 'Could not add card')
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/flashcards/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await loadCards()
    await onUpdated()
  }

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-8 text-sm text-[var(--fl-muted)]">
        Loading SM-2 flashcard deck...
      </div>
    )
  }

  const currentDue = data.due_flashcards[0] ?? null
  const filteredDeck = data.flashcards.filter((c) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      c.word.toLowerCase().includes(q) ||
      c.definition.toLowerCase().includes(q) ||
      c.example_sentence.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--fl-muted)]">
            <span>
              {data.meta.flag} {data.meta.name}
            </span>
            <span>·</span>
            <span className="font-code">
              {data.due_count} due / {data.total_count} total
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--fl-text)]">SM-2 Flashcards</h1>
          <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">
            Spaced-repetition review queue isolated to {data.meta.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fl-control)] px-3.5 py-2 text-sm font-medium text-[var(--fl-control-text)] hover:bg-[var(--fl-control-hover)]"
        >
          <Plus className="h-4 w-4" />
          {showAdd ? 'Cancel' : 'New Flashcard'}
        </button>
      </div>

      {/* Add flashcard form */}
      {showAdd && (
        <form
          onSubmit={handleCreateCard}
          className="rounded-xl border border-[var(--fl-accent)] bg-[var(--fl-surface-elevated)] p-5"
        >
          <h2 className="text-base font-semibold text-[var(--fl-text)]">
            Add Flashcard to {data.meta.name} Deck
          </h2>
          {formError && (
            <div
              role="alert"
              className="mt-2 rounded-lg border border-[var(--fl-danger)] bg-[var(--fl-danger-soft)] px-3 py-2 text-sm text-[var(--fl-danger)]"
            >
              {formError}
            </div>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="fc-word"
                className="block text-xs font-medium text-[var(--fl-text-secondary)]"
              >
                Word or phrase ({data.meta.self_name})
              </label>
              <input
                id="fc-word"
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g. Good afternoon"
                className="mt-1 w-full rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2 text-sm text-[var(--fl-text)]"
              />
            </div>
            <div>
              <label
                htmlFor="fc-definition"
                className="block text-xs font-medium text-[var(--fl-text-secondary)]"
              >
                Definition / Translation
              </label>
              <input
                id="fc-definition"
                type="text"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Meaning in your native language"
                className="mt-1 w-full rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2 text-sm text-[var(--fl-text)]"
              />
            </div>
          </div>
          <div className="mt-3">
            <label
              htmlFor="fc-example"
              className="block text-xs font-medium text-[var(--fl-text-secondary)]"
            >
              Example sentence (optional)
            </label>
            <input
              id="fc-example"
              type="text"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Natural example sentence"
              className="mt-1 w-full rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2 text-sm text-[var(--fl-text)]"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)]"
            >
              Save Flashcard
            </button>
          </div>
        </form>
      )}

      {lastFeedback && (
        <div
          role="status"
          className="rounded-lg border border-[var(--fl-success)] bg-[var(--fl-success-soft)] px-4 py-2.5 text-sm text-[var(--fl-success)]"
        >
          {lastFeedback}
        </div>
      )}

      {/* Active SM-2 Review Card */}
      <section className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-6">
        {currentDue ? (
          <div className="mx-auto max-w-xl text-center">
            <div className="font-code text-xs uppercase text-[var(--fl-muted)]">
              Due for review · Repetitions: {currentDue.repetitions} · EF:{' '}
              {currentDue.ease_factor.toFixed(2)}
            </div>

            <div className="mt-5">
              <TargetLanguageText
                text={currentDue.word}
                languageCode={data.target_language}
                as="h2"
                className="text-3xl font-semibold text-[var(--fl-text)]"
                showSpeakButton
              />
            </div>

            {revealed ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-4 text-left">
                  <p className="text-base font-medium text-[var(--fl-text)]">
                    {currentDue.definition}
                  </p>
                  <p className="mt-2 text-sm italic text-[var(--fl-text-secondary)]">
                    <TargetLanguageText
                      text={currentDue.example_sentence}
                      languageCode={data.target_language}
                    />
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.quality}
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => handleReview(currentDue.id, opt.quality)}
                      className="rounded-lg border border-[var(--fl-border-strong)] bg-[var(--fl-surface)] px-3 py-2.5 text-center transition-colors hover:border-[var(--fl-accent)] hover:bg-[var(--fl-accent-soft)] disabled:opacity-50"
                    >
                      <div className="text-sm font-semibold text-[var(--fl-text)]">{opt.label}</div>
                      <div className="font-code mt-0.5 text-[11px] text-[var(--fl-muted)]">
                        {opt.hint}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--fl-accent)] px-5 py-2.5 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)]"
                >
                  <Eye className="h-4 w-4" />
                  Reveal Answer
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-9 w-9 text-[var(--fl-success)]" />
            <h2 className="mt-3 text-lg font-semibold text-[var(--fl-text)]">
              All caught up for today!
            </h2>
            <p className="mt-1 text-sm text-[var(--fl-muted)]">
              No cards are currently due in {data.meta.name}. Add new cards above or from Grammar &
              Vocabulary.
            </p>
          </div>
        )}
      </section>

      {/* Deck Browser */}
      <section className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-[var(--fl-text)]">
            <Layers className="h-4 w-4 text-[var(--fl-accent)]" />
            All Cards ({filteredDeck.length})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[var(--fl-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter deck..."
              aria-label="Filter flashcards"
              className="w-full rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] py-1.5 pr-3 pl-8 text-sm text-[var(--fl-text)]"
            />
          </div>
        </div>

        <div className="divide-y divide-[var(--fl-border)]">
          {filteredDeck.map((card) => (
            <div key={card.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <TargetLanguageText
                    text={card.word}
                    languageCode={data.target_language}
                    className="font-semibold text-[var(--fl-text)]"
                    showSpeakButton
                  />
                  <span className="font-code text-xs text-[var(--fl-muted)]">
                    Next: {card.next_review} · Int: {card.interval}d
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">{card.definition}</p>
                <p className="mt-0.5 text-xs italic text-[var(--fl-muted)]">
                  <TargetLanguageText
                    text={card.example_sentence}
                    languageCode={data.target_language}
                  />
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete flashcard "${card.word}"`}
                onClick={() => handleDelete(card.id)}
                className="mt-1 shrink-0 text-[var(--fl-muted)] hover:text-[var(--fl-danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
