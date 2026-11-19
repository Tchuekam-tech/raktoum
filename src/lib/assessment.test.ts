import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAdaptiveQuiz } from './assessment'
import type { AnswerRecord } from './types'

test('evaluateAdaptiveQuiz selects highest level with >=2 questions and >=60% correct', () => {
  const answers: AnswerRecord[] = [
    { question_id: '1', skill: 'grammar', difficulty: 'A1', correct: true },
    { question_id: '2', skill: 'vocabulary', difficulty: 'A1', correct: true },
    { question_id: '3', skill: 'grammar', difficulty: 'A2', correct: true },
    { question_id: '4', skill: 'reading', difficulty: 'A2', correct: true },
    { question_id: '5', skill: 'grammar', difficulty: 'B1', correct: true },
    { question_id: '6', skill: 'vocabulary', difficulty: 'B1', correct: false },
  ]
  const res = evaluateAdaptiveQuiz(answers)
  assert.equal(res.cefr_level, 'A2')
  assert.ok(res.strengths.includes('grammar'))
  assert.ok(res.strengths.includes('reading'))
})

test('evaluateAdaptiveQuiz treats dont_know as incorrect and flags >=50% gap skill as weakness', () => {
  const answers: AnswerRecord[] = [
    { question_id: '1', skill: 'grammar', difficulty: 'A1', correct: true, dont_know: false },
    { question_id: '2', skill: 'grammar', difficulty: 'A1', correct: true, dont_know: true },
    { question_id: '3', skill: 'vocabulary', difficulty: 'A1', correct: true, dont_know: false },
    { question_id: '4', skill: 'reading', difficulty: 'A1', correct: true, dont_know: false },
  ]
  const res = evaluateAdaptiveQuiz(answers)
  assert.equal(res.skill_profile.grammar, 0.5)
  assert.ok(res.weaknesses.includes('grammar'))
})
