'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck, Check, Plus, Search } from 'lucide-react'
import { TargetLanguageText } from './TargetLanguageText'
import {
  CEFR_LEVELS,
  GrammarTopic,
  LanguageMeta,
  PhrasebookCategory,
  VocabularySet,
} from '@/lib/types'

interface ResourcesPayload {
  target_language: string
  meta: LanguageMeta
  grammar: GrammarTopic[]
  vocabulary: VocabularySet[]
  phrasebook: PhrasebookCategory[]
  saved_grammar_slugs: string[]
}

interface ResourcesViewProps {
  activeLanguage: string
  onFlashcardAdded: () => Promise<void>
}

export function ResourcesView({ activeLanguage, onFlashcardAdded }: ResourcesViewProps) {
  const [subTab, setSubTab] = useState<'grammar' | 'vocabulary' | 'phrasebook'>('grammar')
  const [level, setLevel] = useState<string>('ALL')
  const [query, setQuery] = useState('')
  const [data, setData] = useState<ResourcesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedGrammarSlug, setSelectedGrammarSlug] = useState<string | null>(null)
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set())

  const loadResources = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ level, q: query })
      const res = await fetch(`/api/resources?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json()) as ResourcesPayload
        setData(json)
        setSelectedGrammarSlug((prev) =>
          json.grammar.some((g) => g.slug === prev) ? prev : (json.grammar[0]?.slug ?? null)
        )
      }
    } finally {
      setLoading(false)
    }
  }, [level, query])

  useEffect(() => {
    loadResources()
  }, [activeLanguage, loadResources])

  const handleToggleGrammarBookmark = async (slug: string) => {
    const res = await fetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    if (res.ok && data) {
      const json = (await res.json()) as { saved_grammar_slugs: string[] }
      setData({ ...data, saved_grammar_slugs: json.saved_grammar_slugs })
    }
  }

  const handleAddCard = async (
    word: string,
    definition: string,
    example: string,
    source: 'vocabulary' | 'phrasebook'
  ) => {
    const res = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word,
        definition,
        example_sentence: example,
        source,
      }),
    })
    if (res.ok) {
      setAddedWords((prev) => new Set(prev).add(word))
      await onFlashcardAdded()
    }
  }

  const selectedTopic =
    data?.grammar.find((g) => g.slug === selectedGrammarSlug) ?? data?.grammar[0] ?? null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--fl-muted)]">
            <span>
              {data?.meta.flag} {data?.meta.name ?? activeLanguage}
            </span>
            <span>·</span>
            <span className="font-code">A1–C2 Reference Library</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--fl-text)]">
            Grammar, Vocabulary & Phrasebook
          </h1>
        </div>
      </div>

      {/* Sub-navigation & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-3">
        <div role="tablist" aria-label="Resource sections" className="flex gap-1.5">
          {(
            [
              { id: 'grammar', label: `Grammar (${data?.grammar.length ?? 0})` },
              { id: 'vocabulary', label: `Vocabulary (${data?.vocabulary.length ?? 0})` },
              { id: 'phrasebook', label: `Phrasebook (${data?.phrasebook.length ?? 0})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={subTab === t.id}
              onClick={() => setSubTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                subTab === t.id
                  ? 'bg-[var(--fl-accent)] text-[var(--fl-accent-contrast)]'
                  : 'text-[var(--fl-text-secondary)] hover:bg-[var(--fl-surface-subtle)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by CEFR level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-2.5 py-1.5 text-sm text-[var(--fl-text)]"
          >
            <option value="ALL">All Levels</option>
            {CEFR_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[var(--fl-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources..."
              aria-label="Search grammar, vocabulary, or phrasebook"
              className="w-48 rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] py-1.5 pr-3 pl-8 text-sm text-[var(--fl-text)] sm:w-56"
            />
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-8 text-sm text-[var(--fl-muted)]">
          Loading language resources...
        </div>
      ) : subTab === 'grammar' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {data.grammar.length === 0 ? (
              <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-4 text-sm text-[var(--fl-muted)]">
                No grammar topics match your filter.
              </div>
            ) : (
              data.grammar.map((topic) => {
                const isSelected = topic.slug === selectedTopic?.slug
                const isBookmarked = data.saved_grammar_slugs.includes(topic.slug)
                return (
                  <button
                    key={topic.slug}
                    type="button"
                    onClick={() => setSelectedGrammarSlug(topic.slug)}
                    className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'border-[var(--fl-accent)] bg-[var(--fl-accent-soft)]'
                        : 'border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] hover:border-[var(--fl-accent)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-code text-xs font-semibold text-[var(--fl-accent)]">
                        {topic.level} · {topic.category}
                      </span>
                      {isBookmarked && (
                        <BookmarkCheck className="h-3.5 w-3.5 text-[var(--fl-accent)]" />
                      )}
                    </div>
                    <h3 className="mt-1 font-medium text-[var(--fl-text)]">{topic.title}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--fl-muted)]">
                      {topic.summary}
                    </p>
                  </button>
                )
              })
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedTopic ? (
              <article className="space-y-5 rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--fl-border)] pb-4">
                  <div>
                    <span className="font-code rounded bg-[var(--fl-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--fl-accent)]">
                      {selectedTopic.level} · {selectedTopic.category}
                    </span>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--fl-text)]">
                      {selectedTopic.title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--fl-text-secondary)]">
                      {selectedTopic.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleGrammarBookmark(selectedTopic.slug)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fl-border-strong)] bg-[var(--fl-surface)] px-3 py-1.5 text-xs font-medium text-[var(--fl-text)] hover:border-[var(--fl-accent)]"
                  >
                    {data.saved_grammar_slugs.includes(selectedTopic.slug) ? (
                      <>
                        <BookmarkCheck className="h-4 w-4 text-[var(--fl-accent)]" />
                        Saved in Library
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4" />
                        Save to Library
                      </>
                    )}
                  </button>
                </div>

                {selectedTopic.structure && (
                  <div className="font-code rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3.5 py-2.5 text-xs text-[var(--fl-text)]">
                    {selectedTopic.structure}
                  </div>
                )}

                {selectedTopic.rules.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--fl-text)]">Key Rules</h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--fl-text-secondary)]">
                      {selectedTopic.rules.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTopic.examples.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--fl-text)]">Examples</h3>
                    <div className="mt-2 space-y-2">
                      {selectedTopic.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3.5 py-2.5"
                        >
                          <TargetLanguageText
                            text={ex.text}
                            languageCode={data.target_language}
                            className="font-medium text-[var(--fl-text)]"
                            showSpeakButton
                          />
                          {(ex.translation || ex.note) && (
                            <p className="mt-1 text-xs text-[var(--fl-muted)]">
                              {[ex.translation, ex.note].filter(Boolean).join(' — ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTopic.common_mistakes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--fl-text)]">Common Mistakes</h3>
                    <div className="mt-2 space-y-2">
                      {selectedTopic.common_mistakes.map((m, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-3 text-sm"
                        >
                          <div className="text-[var(--fl-danger)] line-through">
                            <TargetLanguageText
                              text={m.wrong}
                              languageCode={data.target_language}
                            />
                          </div>
                          <div className="mt-0.5 font-medium text-[var(--fl-success)]">
                            <TargetLanguageText
                              text={m.correct}
                              languageCode={data.target_language}
                            />
                          </div>
                          <p className="mt-1 text-xs text-[var(--fl-muted)]">{m.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ) : (
              <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-6 text-sm text-[var(--fl-muted)]">
                Select a grammar topic to read its guide.
              </div>
            )}
          </div>
        </div>
      ) : subTab === 'vocabulary' ? (
        <div className="space-y-4">
          {data.vocabulary.slice(0, 12).map((set) => (
            <section
              key={set.id}
              className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="font-code text-xs font-semibold text-[var(--fl-accent)]">
                    {set.level}
                  </span>
                  <h2 className="text-lg font-semibold text-[var(--fl-text)]">{set.topic}</h2>
                </div>
                <span className="font-code text-xs text-[var(--fl-muted)]">
                  {set.words.length} entries
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {set.words.slice(0, 9).map((w) => {
                  const isAdded = addedWords.has(w.word)
                  return (
                    <div
                      key={`${set.id}-${w.word}`}
                      className="flex flex-col justify-between rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-3.5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <TargetLanguageText
                            text={w.word}
                            languageCode={data.target_language}
                            className="font-semibold text-[var(--fl-text)]"
                            showSpeakButton
                          />
                          <span className="font-code text-[11px] text-[var(--fl-muted)]">
                            {w.pos}
                          </span>
                        </div>
                        {w.ipa && (
                          <div className="font-code mt-0.5 text-xs text-[var(--fl-muted)]">
                            {w.ipa}
                          </div>
                        )}
                        <p className="mt-1.5 text-xs text-[var(--fl-text-secondary)]">
                          {w.definition}
                        </p>
                        <p className="mt-1 text-xs italic text-[var(--fl-muted)]">
                          <TargetLanguageText
                            text={w.example}
                            languageCode={data.target_language}
                          />
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddCard(w.word, w.definition, w.example, 'vocabulary')}
                        className="mt-3 inline-flex w-fit items-center gap-1 rounded-md border border-[var(--fl-border-strong)] bg-[var(--fl-surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--fl-text)] hover:border-[var(--fl-accent)] disabled:opacity-60"
                      >
                        {isAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {isAdded ? 'In Flashcards' : 'Add to Flashcards'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {data.phrasebook.slice(0, 12).map((cat) => (
            <section
              key={cat.id}
              className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">
                    {cat.icon}
                  </span>
                  <div>
                    <span className="font-code text-xs font-semibold text-[var(--fl-accent)]">
                      {cat.level}
                    </span>
                    <h2 className="text-lg font-semibold text-[var(--fl-text)]">{cat.situation}</h2>
                  </div>
                </div>
                <span className="font-code text-xs text-[var(--fl-muted)]">
                  {cat.phrases.length} phrases
                </span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {cat.phrases.slice(0, 10).map((ph, idx) => {
                  const isAdded = addedWords.has(ph.text)
                  return (
                    <div
                      key={`${cat.id}-${idx}`}
                      className="flex flex-col justify-between rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] p-3.5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <TargetLanguageText
                            text={ph.text}
                            languageCode={data.target_language}
                            className="font-medium text-[var(--fl-text)]"
                            showSpeakButton
                          />
                          <span className="font-code shrink-0 rounded bg-[var(--fl-surface-subtle)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--fl-muted)]">
                            {ph.register}
                          </span>
                        </div>
                        {ph.romanization && (
                          <div className="font-code mt-1 text-xs text-[var(--fl-accent)]">
                            {ph.romanization}
                          </div>
                        )}
                        <p className="mt-1 text-xs text-[var(--fl-text-secondary)]">{ph.context}</p>
                      </div>

                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddCard(ph.text, ph.context, ph.text, 'phrasebook')}
                        className="mt-2.5 inline-flex w-fit items-center gap-1 rounded-md border border-[var(--fl-border-strong)] bg-[var(--fl-surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--fl-text)] hover:border-[var(--fl-accent)] disabled:opacity-60"
                      >
                        {isAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {isAdded ? 'In Flashcards' : 'Save Phrase'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
