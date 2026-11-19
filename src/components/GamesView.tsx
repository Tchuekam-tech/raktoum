'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Gamepad2, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { TargetLanguageText } from './TargetLanguageText'
import { CEFRLevel, CEFR_LEVELS, GameSessionRecord, LanguageMeta } from '@/lib/types'

interface VocabPairItem {
  id: string
  word: string
  definition: string
  ipa: string | null
}

interface ErrorDetectiveItem {
  id: string
  topic_title: string
  level: CEFRLevel
  wrong: string
  correct: string
  note: string
}

interface SentenceOrderItem {
  id: string
  target: string
  hint: string
  tokens: string[]
  uses_word_spacing: boolean
}

interface GamesPayload {
  target_language: string
  meta: LanguageMeta
  cefr_level: CEFRLevel
  vocab_pairs: VocabPairItem[]
  error_detective: ErrorDetectiveItem[]
  sentence_order: SentenceOrderItem[]
  history: GameSessionRecord[]
}

interface GamesViewProps {
  activeLanguage: string
  onSessionRecorded: () => Promise<void>
}

function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items]
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function GamesView({ activeLanguage, onSessionRecorded }: GamesViewProps) {
  const [mode, setMode] = useState<'vocab_pairs' | 'error_detective' | 'sentence_order'>(
    'vocab_pairs'
  )
  const [level, setLevel] = useState<CEFRLevel>('A1')
  const [data, setData] = useState<GamesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Vocab Pairs state
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [pairMistakes, setPairMistakes] = useState(0)
  const [pairFinished, setPairFinished] = useState(false)

  // Error Detective state
  const [errIndex, setErrIndex] = useState(0)
  const [errChoice, setErrChoice] = useState<string | null>(null)
  const [errScore, setErrScore] = useState(0)
  const [errFinished, setErrFinished] = useState(false)

  // Sentence Order state
  const [sentIndex, setSentIndex] = useState(0)
  const [pickedIndices, setPickedIndices] = useState<number[]>([])
  const [sentChecked, setSentChecked] = useState<boolean | null>(null)
  const [sentScore, setSentScore] = useState(0)
  const [sentFinished, setSentFinished] = useState(false)

  const resetAllGames = useCallback(() => {
    setSelectedWordId(null)
    setMatchedIds(new Set())
    setPairMistakes(0)
    setPairFinished(false)
    setErrIndex(0)
    setErrChoice(null)
    setErrScore(0)
    setErrFinished(false)
    setSentIndex(0)
    setPickedIndices([])
    setSentChecked(null)
    setSentScore(0)
    setSentFinished(false)
    setStatusMessage(null)
  }, [])

  const loadGames = useCallback(async () => {
    setLoading(true)
    resetAllGames()
    try {
      const res = await fetch(`/api/games?level=${level}`, { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json()) as GamesPayload
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [level, resetAllGames])

  useEffect(() => {
    loadGames()
  }, [activeLanguage, loadGames])

  const shuffledDefinitions = useMemo(() => {
    if (!data) return []
    return deterministicShuffle(data.vocab_pairs, 42)
  }, [data])

  const saveScore = async (
    gameType: GameSessionRecord['game_type'],
    score: number,
    total: number
  ) => {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type: gameType,
        cefr_level: data?.cefr_level ?? level,
        score,
        total,
      }),
    })
    if (res.ok) {
      const json = (await res.json()) as { session: GameSessionRecord }
      setStatusMessage(
        `Session saved! Score ${score}/${total} — earned +${json.session.xp_earned} XP.`
      )
      await onSessionRecorded()
      const refreshed = await fetch(`/api/games?level=${level}`, { cache: 'no-store' })
      if (refreshed.ok) {
        setData((await refreshed.json()) as GamesPayload)
      }
    }
  }

  const handleDefinitionClick = async (defItem: VocabPairItem) => {
    if (!selectedWordId || matchedIds.has(defItem.id) || !data) return
    if (selectedWordId === defItem.id) {
      const nextMatched = new Set(matchedIds).add(defItem.id)
      setMatchedIds(nextMatched)
      setSelectedWordId(null)
      if (nextMatched.size === data.vocab_pairs.length && !pairFinished) {
        setPairFinished(true)
        const score = Math.max(1, data.vocab_pairs.length - pairMistakes)
        await saveScore('vocab_pairs', score, data.vocab_pairs.length)
      }
    } else {
      setPairMistakes((m) => m + 1)
    }
  }

  const currentErrorItem = data?.error_detective[errIndex] ?? null
  const errorOptions = useMemo(() => {
    if (!currentErrorItem) return []
    return deterministicShuffle(
      [
        { label: currentErrorItem.correct, isCorrect: true },
        { label: currentErrorItem.wrong, isCorrect: false },
      ],
      errIndex + 17
    )
  }, [currentErrorItem, errIndex])

  const handleErrorPick = (label: string, isCorrect: boolean) => {
    if (errChoice) return
    setErrChoice(label)
    if (isCorrect) setErrScore((s) => s + 1)
  }

  const handleNextError = async () => {
    if (!data) return
    if (errIndex + 1 >= data.error_detective.length) {
      setErrFinished(true)
      await saveScore('error_detective', errScore, data.error_detective.length)
    } else {
      setErrIndex((i) => i + 1)
      setErrChoice(null)
    }
  }

  const currentSentence = data?.sentence_order[sentIndex] ?? null
  const scrambledTokens = useMemo(() => {
    if (!currentSentence) return []
    return deterministicShuffle(
      currentSentence.tokens.map((tok, idx) => ({ tok, idx })),
      sentIndex + 99
    )
  }, [currentSentence, sentIndex])

  const handleCheckSentence = () => {
    if (!currentSentence) return
    const built = pickedIndices.map((idx) => scrambledTokens[idx].tok)
    const joiner = currentSentence.uses_word_spacing ? ' ' : ''
    const ok = built.join(joiner) === currentSentence.tokens.join(joiner)
    setSentChecked(ok)
    if (ok) setSentScore((s) => s + 1)
  }

  const handleNextSentence = async () => {
    if (!data) return
    if (sentIndex + 1 >= data.sentence_order.length) {
      setSentFinished(true)
      await saveScore('sentence_order', sentScore, data.sentence_order.length)
    } else {
      setSentIndex((i) => i + 1)
      setPickedIndices([])
      setSentChecked(null)
    }
  }

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-8 text-sm text-[var(--fl-muted)]">
        Loading practice games...
      </div>
    )
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
            <span className="font-code">Plan-owned XP</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--fl-text)]">Practice Games</h1>
          <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">
            Generated from your active language&apos;s real curriculum vocabulary, grammar mistakes,
            and phrasebook sentences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Select CEFR level for games"
            value={level}
            onChange={(e) => setLevel(e.target.value as CEFRLevel)}
            className="rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] px-3 py-2 text-sm text-[var(--fl-text)]"
          >
            {CEFR_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                Level {lvl}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetAllGames}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fl-border-strong)] bg-[var(--fl-surface-elevated)] px-3 py-2 text-sm font-medium text-[var(--fl-text)] hover:bg-[var(--fl-surface-subtle)]"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="Practice game modes"
        className="flex flex-wrap gap-2 rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-2.5"
      >
        {(
          [
            { id: 'vocab_pairs', label: 'Vocabulary Pairs' },
            { id: 'error_detective', label: 'Error Detective' },
            { id: 'sentence_order', label: 'Sentence Order' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={mode === tab.id}
            onClick={() => {
              setMode(tab.id)
              setStatusMessage(null)
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              mode === tab.id
                ? 'bg-[var(--fl-accent)] text-[var(--fl-accent-contrast)]'
                : 'text-[var(--fl-text-secondary)] hover:bg-[var(--fl-surface-subtle)]'
            }`}
          >
            <Gamepad2 className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-lg border border-[var(--fl-success)] bg-[var(--fl-success-soft)] px-4 py-3 text-sm font-medium text-[var(--fl-success)]"
        >
          {statusMessage}
        </div>
      )}

      {/* 1. Vocabulary Pairs */}
      {mode === 'vocab_pairs' && (
        <section className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--fl-text)]">Vocabulary Pairs</h2>
              <p className="text-xs text-[var(--fl-muted)]">
                Select a word on the left, then click its matching definition on the right.
              </p>
            </div>
            <span className="font-code text-xs text-[var(--fl-muted)]">
              Matched: {matchedIds.size}/{data.vocab_pairs.length} · Mistakes: {pairMistakes}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-[var(--fl-muted)]">Words</div>
              {data.vocab_pairs.map((item) => {
                const isMatched = matchedIds.has(item.id)
                const isSelected = selectedWordId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => setSelectedWordId(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                      isMatched
                        ? 'border-[var(--fl-success)] bg-[var(--fl-success-soft)] text-[var(--fl-success)]'
                        : isSelected
                          ? 'border-[var(--fl-accent)] bg-[var(--fl-accent-soft)] font-semibold text-[var(--fl-text)]'
                          : 'border-[var(--fl-border)] bg-[var(--fl-surface)] text-[var(--fl-text)] hover:border-[var(--fl-accent)]'
                    }`}
                  >
                    <TargetLanguageText text={item.word} languageCode={data.target_language} />
                    {isMatched && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  </button>
                )
              })}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-[var(--fl-muted)]">
                Definitions
              </div>
              {shuffledDefinitions.map((item) => {
                const isMatched = matchedIds.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isMatched || !selectedWordId}
                    onClick={() => handleDefinitionClick(item)}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                      isMatched
                        ? 'border-[var(--fl-success)] bg-[var(--fl-success-soft)] text-[var(--fl-success)]'
                        : selectedWordId
                          ? 'border-[var(--fl-border)] bg-[var(--fl-surface)] text-[var(--fl-text)] hover:border-[var(--fl-accent)]'
                          : 'border-[var(--fl-border)] bg-[var(--fl-surface)] text-[var(--fl-muted)] opacity-80'
                    }`}
                  >
                    {item.definition}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* 2. Error Detective */}
      {mode === 'error_detective' && (
        <section className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-6">
          {errFinished ? (
            <div className="py-6 text-center">
              <Trophy className="mx-auto h-10 w-10 text-[var(--fl-accent)]" />
              <h2 className="mt-3 text-lg font-semibold text-[var(--fl-text)]">
                Error Detective Complete — {errScore}/{data.error_detective.length}
              </h2>
              <button
                type="button"
                onClick={resetAllGames}
                className="mt-4 rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)]"
              >
                Play Again
              </button>
            </div>
          ) : currentErrorItem ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-code text-xs uppercase text-[var(--fl-accent)]">
                  Topic: {currentErrorItem.topic_title} ({currentErrorItem.level})
                </span>
                <span className="font-code text-xs text-[var(--fl-muted)]">
                  Round {errIndex + 1} / {data.error_detective.length}
                </span>
              </div>

              <h2 className="text-base font-semibold text-[var(--fl-text)]">
                Which sentence is grammatically correct?
              </h2>

              <div className="grid gap-3">
                {errorOptions.map((opt) => {
                  let cls =
                    'border-[var(--fl-border)] bg-[var(--fl-surface)] text-[var(--fl-text)] hover:border-[var(--fl-accent)]'
                  if (errChoice) {
                    if (opt.isCorrect) {
                      cls =
                        'border-[var(--fl-success)] bg-[var(--fl-success-soft)] text-[var(--fl-success)] font-medium'
                    } else if (errChoice === opt.label) {
                      cls =
                        'border-[var(--fl-danger)] bg-[var(--fl-danger-soft)] text-[var(--fl-danger)]'
                    }
                  }
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleErrorPick(opt.label, opt.isCorrect)}
                      className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${cls}`}
                    >
                      <TargetLanguageText text={opt.label} languageCode={data.target_language} />
                    </button>
                  )
                })}
              </div>

              {errChoice && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-3.5">
                  <p className="text-sm text-[var(--fl-text-secondary)]">
                    <strong>Explanation:</strong> {currentErrorItem.note}
                  </p>
                  <button
                    type="button"
                    onClick={handleNextError}
                    className="rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)]"
                  >
                    {errIndex + 1 >= data.error_detective.length ? 'Finish Round' : 'Next'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--fl-muted)]">
              No error-detective items found for this level.
            </p>
          )}
        </section>
      )}

      {/* 3. Sentence Order */}
      {mode === 'sentence_order' && (
        <section className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-6">
          {sentFinished ? (
            <div className="py-6 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-[var(--fl-accent)]" />
              <h2 className="mt-3 text-lg font-semibold text-[var(--fl-text)]">
                Sentence Order Complete — {sentScore}/{data.sentence_order.length}
              </h2>
              <button
                type="button"
                onClick={resetAllGames}
                className="mt-4 rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)]"
              >
                Play Again
              </button>
            </div>
          ) : currentSentence ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--fl-muted)]">
                  Context: {currentSentence.hint}
                </span>
                <span className="font-code text-xs text-[var(--fl-muted)]">
                  Sentence {sentIndex + 1} / {data.sentence_order.length}
                </span>
              </div>

              <div className="min-h-14 rounded-lg border border-dashed border-[var(--fl-border-strong)] bg-[var(--fl-surface)] p-3">
                {pickedIndices.length === 0 ? (
                  <span className="text-sm text-[var(--fl-muted)]">
                    Click tokens below in the right order...
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pickedIndices.map((sIdx, pos) => (
                      <button
                        key={`${sIdx}-${pos}`}
                        type="button"
                        disabled={sentChecked !== null}
                        onClick={() =>
                          setPickedIndices((prev) => prev.filter((_, i) => i !== pos))
                        }
                        className="rounded-md border border-[var(--fl-accent)] bg-[var(--fl-accent-soft)] px-2.5 py-1 text-sm font-medium text-[var(--fl-text)]"
                      >
                        <TargetLanguageText
                          text={scrambledTokens[sIdx].tok}
                          languageCode={data.target_language}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {scrambledTokens.map((item, sIdx) => {
                  const used = pickedIndices.includes(sIdx)
                  return (
                    <button
                      key={`${item.idx}-${sIdx}`}
                      type="button"
                      disabled={used || sentChecked !== null}
                      onClick={() => setPickedIndices((prev) => [...prev, sIdx])}
                      className="rounded-md border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-1.5 text-sm text-[var(--fl-text)] hover:border-[var(--fl-accent)] disabled:opacity-35"
                    >
                      <TargetLanguageText text={item.tok} languageCode={data.target_language} />
                    </button>
                  )
                })}
              </div>

              {sentChecked !== null && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    sentChecked
                      ? 'border-[var(--fl-success)] bg-[var(--fl-success-soft)] text-[var(--fl-success)]'
                      : 'border-[var(--fl-danger)] bg-[var(--fl-danger-soft)] text-[var(--fl-danger)]'
                  }`}
                >
                  {sentChecked ? (
                    'Exact match!'
                  ) : (
                    <span>
                      Expected:{' '}
                      <TargetLanguageText
                        text={currentSentence.target}
                        languageCode={data.target_language}
                        className="font-semibold"
                      />
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                {sentChecked === null ? (
                  <button
                    type="button"
                    disabled={pickedIndices.length !== scrambledTokens.length}
                    onClick={handleCheckSentence}
                    className="rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)] disabled:opacity-40"
                  >
                    Check Order
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextSentence}
                    className="rounded-lg bg-[var(--fl-accent)] px-4 py-2 text-sm font-medium text-[var(--fl-accent-contrast)] hover:bg-[var(--fl-accent-hover)]"
                  >
                    {sentIndex + 1 >= data.sentence_order.length ? 'Finish Round' : 'Next Sentence'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--fl-muted)]">No sentence challenges available.</p>
          )}
        </section>
      )}

      {/* Language-Specific Game History */}
      {data.history.length > 0 && (
        <section className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-5">
          <h2 className="text-sm font-semibold text-[var(--fl-text)]">
            Recent {data.meta.name} Game Sessions
          </h2>
          <div className="mt-3 divide-y divide-[var(--fl-border)]">
            {data.history.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium capitalize text-[var(--fl-text)]">
                    {s.game_type.replace('_', ' ')}
                  </span>
                  <span className="font-code ml-2 text-xs text-[var(--fl-muted)]">
                    {s.cefr_level}
                  </span>
                </div>
                <div className="font-code text-xs text-[var(--fl-text-secondary)]">
                  {s.score}/{s.total} · +{s.xp_earned} XP
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
