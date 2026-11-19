import {
  AnswerRecord,
  AssessmentQuestion,
  AssessmentResult,
  CEFRLevel,
  CEFR_LEVELS,
  Skill,
} from './types'

/**
 * Deterministic CEFR placement quiz evaluator ported from backend/app/services/assessment.py.
 * - Groups answers by CEFR difficulty level.
 * - Highest level with >= 2 questions and >= 60% correct determines CEFR level (default A1).
 * - Answers marked dont_know never count as correct; >= 50% gaps in a skill marks it a weakness.
 */
export function evaluateAdaptiveQuiz(answers: AnswerRecord[]): AssessmentResult {
  const levelScores: Record<CEFRLevel, { correct: number; total: number }> = {
    A1: { correct: 0, total: 0 },
    A2: { correct: 0, total: 0 },
    B1: { correct: 0, total: 0 },
    B2: { correct: 0, total: 0 },
    C1: { correct: 0, total: 0 },
    C2: { correct: 0, total: 0 },
  }

  const skillScores: Record<Skill, number[]> = {
    grammar: [],
    vocabulary: [],
    reading: [],
  }

  const skillGaps: Record<Skill, number> = {
    grammar: 0,
    vocabulary: 0,
    reading: 0,
  }

  for (const a of answers) {
    const isCorrect = Boolean(a.correct) && !a.dont_know
    const lvl = a.difficulty.toUpperCase() as CEFRLevel
    if (lvl in levelScores) {
      levelScores[lvl].total += 1
      if (isCorrect) {
        levelScores[lvl].correct += 1
      }
    }

    const skill = a.skill.toLowerCase() as Skill
    if (skill in skillScores) {
      skillScores[skill].push(isCorrect ? 1 : 0)
      if (a.dont_know) {
        skillGaps[skill] += 1
      }
    }
  }

  let cefrLevel: CEFRLevel = 'A1'
  for (const level of CEFR_LEVELS) {
    const bucket = levelScores[level]
    if (bucket.total >= 2 && bucket.correct / bucket.total >= 0.6) {
      cefrLevel = level
    }
  }

  const skillProfile: Record<Skill, number> = {
    grammar: skillScores.grammar.length
      ? Number((skillScores.grammar.reduce((acc, v) => acc + v, 0) / skillScores.grammar.length).toFixed(2))
      : 0,
    vocabulary: skillScores.vocabulary.length
      ? Number(
          (skillScores.vocabulary.reduce((acc, v) => acc + v, 0) / skillScores.vocabulary.length).toFixed(2)
        )
      : 0,
    reading: skillScores.reading.length
      ? Number((skillScores.reading.reduce((acc, v) => acc + v, 0) / skillScores.reading.length).toFixed(2))
      : 0,
  }

  const overallScore = Number(
    ((skillProfile.grammar + skillProfile.vocabulary + skillProfile.reading) / 3).toFixed(2)
  )

  const skills: Skill[] = ['grammar', 'vocabulary', 'reading']
  const strengths = skills.filter((s) => skillProfile[s] >= 0.65)
  const weaknesses = skills.filter(
    (s) =>
      skillProfile[s] < 0.45 ||
      (skillScores[s].length > 0 && skillGaps[s] / skillScores[s].length >= 0.5)
  )

  return {
    cefr_level: cefrLevel,
    score: overallScore,
    skill_profile: skillProfile,
    strengths,
    weaknesses,
    analysis: buildPlacementSummary(cefrLevel, strengths, weaknesses),
  }
}

function buildPlacementSummary(
  level: CEFRLevel,
  strengths: Skill[],
  weaknesses: Skill[]
): string {
  const parts = [`Recommended starting level: ${level}.`]
  if (strengths.length > 0) {
    parts.push(`Strongest areas: ${strengths.join(', ')}.`)
  }
  if (weaknesses.length > 0) {
    parts.push(`Focus areas for your upcoming study plan: ${weaknesses.join(', ')}.`)
  }
  return parts.join(' ')
}

/**
 * Select a balanced 12-question placement quiz spanning A1-C2 across grammar, vocabulary, and reading.
 */
export function selectPlacementQuiz(bank: AssessmentQuestion[]): AssessmentQuestion[] {
  const selected: AssessmentQuestion[] = []
  const usedIds = new Set<string>()
  const desiredSkills: Skill[] = ['grammar', 'vocabulary', 'reading']

  for (const level of CEFR_LEVELS) {
    const levelPool = bank.filter((q) => q.difficulty === level)
    let pickedForLevel = 0
    for (const skill of desiredSkills) {
      if (pickedForLevel >= 2) break
      const candidate = levelPool.find((q) => q.skill === skill && !usedIds.has(q.id))
      if (candidate) {
        selected.push(candidate)
        usedIds.add(candidate.id)
        pickedForLevel += 1
      }
    }
    if (pickedForLevel < 2) {
      for (const q of levelPool) {
        if (pickedForLevel >= 2) break
        if (!usedIds.has(q.id)) {
          selected.push(q)
          usedIds.add(q.id)
          pickedForLevel += 1
        }
      }
    }
  }

  return selected
}
