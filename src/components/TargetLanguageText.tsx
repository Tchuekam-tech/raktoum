'use client'

import React from 'react'
import { Volume2 } from 'lucide-react'

const CJK_LANGS = new Set(['ja-JP', 'ko-KR', 'zh-CN'])

interface TargetLanguageTextProps {
  text: string
  languageCode: string
  className?: string
  as?: 'span' | 'p' | 'div' | 'h2' | 'h3' | 'h4'
  showSpeakButton?: boolean
}

export function speakTargetLanguage(text: string, languageCode: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = languageCode
    utterance.rate = 0.92
    window.speechSynthesis.speak(utterance)
  } catch {
    // Browser speech synthesis may be unavailable in headless environments
  }
}

export function TargetLanguageText({
  text,
  languageCode,
  className = '',
  as = 'span',
  showSpeakButton = false,
}: TargetLanguageTextProps) {
  const isCjk = CJK_LANGS.has(languageCode)
  const Tag = as
  const composedClass = `${isCjk ? 'fl-cjk text-[1.06em]' : 'font-sans'} ${className}`.trim()

  if (!showSpeakButton) {
    return (
      <Tag lang={languageCode} className={composedClass}>
        {text}
      </Tag>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <Tag lang={languageCode} className={composedClass}>
        {text}
      </Tag>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          speakTargetLanguage(text, languageCode)
        }}
        aria-label={`Listen to "${text}"`}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] text-[var(--fl-text-secondary)] transition-colors hover:border-[var(--fl-accent)] hover:text-[var(--fl-accent)]"
      >
        <Volume2 className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}
