import { NextRequest, NextResponse } from 'next/server'
import { getAllSituations, getLanguageDataset, getLanguageMeta } from '@/lib/data-loader'
import { getActiveLanguageState, recordActivity } from '@/lib/store'

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || 'all'
  const activeState = getActiveLanguageState()
  const meta = getLanguageMeta(activeState.target_language)
  const all = getAllSituations()
  const filtered = category === 'all' ? all : all.filter((s) => s.category === category)
  const categories = [...new Set(all.map((s) => s.category))]

  return NextResponse.json({
    target_language: activeState.target_language,
    meta,
    cefr_level: activeState.plan?.cefr_level ?? 'A1',
    categories,
    situations: filtered,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      situation_id?: string
      message?: string
      turn_count?: number
    }
    const situations = getAllSituations()
    const situation = situations.find((s) => s.id === body.situation_id)
    if (!situation) {
      return NextResponse.json({ error: 'Situation not found' }, { status: 404 })
    }

    const activeState = getActiveLanguageState()
    const meta = getLanguageMeta(activeState.target_language)
    const dataset = getLanguageDataset(activeState.target_language)
    const level = activeState.plan?.cefr_level ?? 'A1'
    const turnCount = Number(body.turn_count ?? 1)
    const userMessage = (body.message || '').trim()

    // Pull real level-matched phrases to suggest authentic target-language expressions
    const levelPhrases = dataset.phrasebook
      .filter((c) => c.level === level || c.level === 'A1')
      .flatMap((c) => c.phrases)
      .slice(0, 12)

    const suggestedPhrases = levelPhrases
      .slice((turnCount * 2) % Math.max(1, levelPhrases.length - 3), ((turnCount * 2) % Math.max(1, levelPhrases.length - 3)) + 3)
      .map((p) => p.text)

    let reply = ''
    let coachTip = ''
    let xpAwarded = 0

    if (!userMessage) {
      reply = `Hi! I'm Lingu playing the role of: ${situation.role} Let's practise "${situation.title}" in ${meta.name} (${level}). Whenever you're ready, start the conversation!`
      coachTip = `Objective: ${situation.objective}`
    } else if (turnCount >= 3) {
      reply = `Great job completing this step in "${situation.title}"! You wrote: "${userMessage}". That clearly addresses the situation — let's confirm the final details so we can wrap up our role-play.`
      coachTip = `Well done! You completed a meaningful rehearsal turn (+15 XP). Try extending your reply with one polite closing phrase in ${meta.self_name}.`
      xpAwarded = 15
      recordActivity(activeState, { xp_earned: xpAwarded })
    } else {
      const followUps = [
        `Thanks for letting me know ("${userMessage}"). Could you give me one more detail—such as your preferred time, option, or reason—so we can arrange this smoothly?`,
        `Understood! Regarding "${userMessage}", let's check the next practical step. How would you confirm or politely ask for an alternative in ${meta.name}?`,
      ]
      reply = followUps[(turnCount - 1) % followUps.length]
      coachTip = `Tip for ${level} ${meta.name}: Focus on your objective — ${situation.objective}`
      xpAwarded = 10
      recordActivity(activeState, { xp_earned: xpAwarded })
    }

    return NextResponse.json({
      reply,
      coach_tip: coachTip,
      suggested_phrases: suggestedPhrases,
      xp_awarded: xpAwarded,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to process rehearsal turn' },
      { status: 400 }
    )
  }
}
