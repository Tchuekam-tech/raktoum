import { NextRequest, NextResponse } from 'next/server'
import { getLanguageDataset, getLanguageMeta } from '@/lib/data-loader'
import { getActiveLanguageState, recordGameSession } from '@/lib/store'
import { CEFRLevel, CEFR_LEVELS, GameSessionRecord } from '@/lib/types'

function pickLevelOrFallback<T extends { level: CEFRLevel }>(items: T[], level: CEFRLevel): T[] {
  const exact = items.filter((item) => item.level === level)
  if (exact.length > 0) return exact
  return items
}

export async function GET(req: NextRequest) {
  const activeState = getActiveLanguageState()
  const meta = getLanguageMeta(activeState.target_language)
  const dataset = getLanguageDataset(activeState.target_language)
  const requestedLevel = (req.nextUrl.searchParams.get('level') ||
    activeState.plan?.cefr_level ||
    'A1') as CEFRLevel
  const level: CEFRLevel = CEFR_LEVELS.includes(requestedLevel) ? requestedLevel : 'A1'

  // 1. Vocabulary Pairs (6 pairs from real vocabulary sets)
  const vocabSets = pickLevelOrFallback(dataset.vocabulary, level)
  const vocabPool = vocabSets
    .flatMap((s) => s.words)
    .filter((w) => w.word.trim().length > 1 && w.definition.trim().length > 2)
  const seenWords = new Set<string>()
  const vocabPairs = []
  for (const entry of vocabPool) {
    const key = entry.word.toLowerCase()
    if (seenWords.has(key)) continue
    seenWords.add(key)
    vocabPairs.push({
      id: `pair-${vocabPairs.length}`,
      word: entry.word,
      definition: entry.definition,
      ipa: entry.ipa ?? null,
    })
    if (vocabPairs.length >= 6) break
  }

  // 2. Error Detective (5 items from real grammar common_mistakes)
  const grammarTopics = pickLevelOrFallback(dataset.grammar, level)
  const allMistakes = grammarTopics.flatMap((topic) =>
    topic.common_mistakes.map((m, idx) => ({
      id: `err-${topic.slug}-${idx}`,
      topic_title: topic.title,
      level: topic.level,
      wrong: m.wrong,
      correct: m.correct,
      note: m.note,
    }))
  )
  const fallbackMistakes =
    allMistakes.length >= 5
      ? allMistakes
      : dataset.grammar.flatMap((topic) =>
          topic.common_mistakes.map((m, idx) => ({
            id: `err-${topic.slug}-${idx}`,
            topic_title: topic.title,
            level: topic.level,
            wrong: m.wrong,
            correct: m.correct,
            note: m.note,
          }))
        )
  const errorDetective = fallbackMistakes.slice(0, 5)

  // 3. Sentence Order (5 real sentences from phrasebook / vocabulary examples)
  const phraseCats = pickLevelOrFallback(dataset.phrasebook, level)
  const sentenceCandidates: Array<{ text: string; hint: string }> = []
  for (const cat of phraseCats) {
    for (const ph of cat.phrases) {
      if (!ph.text.includes('[') && !ph.text.includes('/')) {
        sentenceCandidates.push({ text: ph.text, hint: ph.context })
      }
    }
  }
  for (const w of vocabPool.slice(0, 20)) {
    if (w.example) {
      sentenceCandidates.push({ text: w.example, hint: `${w.word}: ${w.definition}` })
    }
  }

  const sentenceOrder = sentenceCandidates
    .map((item) => {
      const tokens = meta.uses_word_spacing
        ? item.text.trim().split(/\s+/).filter(Boolean)
        : Array.from(item.text.trim()).filter((ch) => ch.trim().length > 0)
      return { text: item.text.trim(), hint: item.hint, tokens }
    })
    .filter((item) => item.tokens.length >= 4 && item.tokens.length <= 10)
    .slice(0, 5)
    .map((item, idx) => ({
      id: `sent-${idx}`,
      target: item.text,
      hint: item.hint,
      tokens: item.tokens,
      uses_word_spacing: meta.uses_word_spacing,
    }))

  return NextResponse.json({
    target_language: activeState.target_language,
    meta,
    cefr_level: level,
    vocab_pairs: vocabPairs,
    error_detective: errorDetective,
    sentence_order: sentenceOrder,
    history: activeState.game_sessions.slice(0, 10),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      game_type?: GameSessionRecord['game_type']
      cefr_level?: CEFRLevel
      score?: number
      total?: number
    }
    if (
      !body.game_type ||
      !['vocab_pairs', 'error_detective', 'sentence_order'].includes(body.game_type)
    ) {
      return NextResponse.json({ error: 'Invalid game_type' }, { status: 400 })
    }
    const session = recordGameSession({
      game_type: body.game_type,
      cefr_level: body.cefr_level ?? 'A1',
      score: Number(body.score ?? 0),
      total: Number(body.total ?? 1),
    })
    return NextResponse.json({ session }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to save game session' },
      { status: 400 }
    )
  }
}
