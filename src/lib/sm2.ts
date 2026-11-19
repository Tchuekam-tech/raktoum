export interface Sm2CardState {
  repetitions: number
  interval: number
  ease_factor: number
  next_review: string
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addUtcDays(baseDate: Date, days: number): string {
  const copy = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()))
  copy.setUTCDate(copy.getUTCDate() + days)
  return formatUtcDate(copy)
}

/**
 * Port of FreeLingo's SM-2 spaced repetition algorithm (backend/app/services/flashcard_sm2.py).
 * Quality is an integer in [0, 5].
 */
export function sm2Update<T extends Sm2CardState>(
  card: T,
  quality: number,
  today: Date = new Date()
): T {
  const q = Math.max(0, Math.min(5, Math.round(quality)))
  let repetitions = card.repetitions
  let interval = card.interval

  if (q < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * card.ease_factor)
    }
    repetitions += 1
  }

  const nextEase = Math.max(
    1.3,
    Number((card.ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)).toFixed(4))
  )

  return {
    ...card,
    repetitions,
    interval,
    ease_factor: nextEase,
    next_review: addUtcDays(today, interval),
  }
}

export function isCardDue(card: Pick<Sm2CardState, 'next_review'>, today: Date = new Date()): boolean {
  return card.next_review <= formatUtcDate(today)
}
