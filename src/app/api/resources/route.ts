import { NextRequest, NextResponse } from 'next/server'
import { getLanguageDataset, getLanguageMeta } from '@/lib/data-loader'
import { getActiveLanguageState, toggleSavedGrammarTopic } from '@/lib/store'

export async function GET(req: NextRequest) {
  const level = req.nextUrl.searchParams.get('level') || 'ALL'
  const query = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase()

  const activeState = getActiveLanguageState()
  const meta = getLanguageMeta(activeState.target_language)
  const dataset = getLanguageDataset(activeState.target_language)

  const grammar = dataset.grammar.filter((g) => {
    if (level !== 'ALL' && g.level !== level) return false
    if (!query) return true
    return (
      g.title.toLowerCase().includes(query) ||
      g.summary.toLowerCase().includes(query) ||
      g.category.toLowerCase().includes(query)
    )
  })

  const vocabulary = dataset.vocabulary
    .filter((v) => level === 'ALL' || v.level === level)
    .map((set) => {
      if (!query) return set
      const topicMatch = set.topic.toLowerCase().includes(query)
      const matchedWords = set.words.filter(
        (w) =>
          w.word.toLowerCase().includes(query) ||
          w.definition.toLowerCase().includes(query) ||
          w.example.toLowerCase().includes(query)
      )
      if (topicMatch) return set
      return { ...set, words: matchedWords }
    })
    .filter((set) => set.words.length > 0)

  const phrasebook = dataset.phrasebook
    .filter((p) => level === 'ALL' || p.level === level)
    .map((cat) => {
      if (!query) return cat
      const catMatch = cat.situation.toLowerCase().includes(query)
      const matchedPhrases = cat.phrases.filter(
        (ph) =>
          ph.text.toLowerCase().includes(query) ||
          ph.context.toLowerCase().includes(query) ||
          (ph.romanization && ph.romanization.toLowerCase().includes(query))
      )
      if (catMatch) return cat
      return { ...cat, phrases: matchedPhrases }
    })
    .filter((cat) => cat.phrases.length > 0)

  return NextResponse.json({
    target_language: activeState.target_language,
    meta,
    grammar,
    vocabulary,
    phrasebook,
    saved_grammar_slugs: [...activeState.saved_grammar_slugs],
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { slug?: string }
    if (!body.slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }
    const saved = toggleSavedGrammarTopic(body.slug)
    return NextResponse.json({ saved_grammar_slugs: saved })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to update saved grammar' },
      { status: 400 }
    )
  }
}
