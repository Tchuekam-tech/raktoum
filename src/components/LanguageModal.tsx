'use client'

import React, { useState } from 'react'
import { Check, Plus, Search, Trash2, X } from 'lucide-react'
import type { LanguageMeta, LanguageWorkspaceSummary } from '@/lib/types'

interface LanguageModalProps {
  open: boolean
  onClose: () => void
  userLanguages: LanguageWorkspaceSummary[]
  allSupported: LanguageMeta[]
  activeLanguage: string
  onSwitch: (code: string) => Promise<void>
  onAdd: (code: string) => Promise<void>
  onDelete: (code: string) => Promise<void>
}

export function LanguageModal({
  open,
  onClose,
  userLanguages,
  allSupported,
  activeLanguage,
  onSwitch,
  onAdd,
  onDelete,
}: LanguageModalProps) {
  const [search, setSearch] = useState('')
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const enrolledCodes = new Set(userLanguages.map((l) => l.target_language))
  const filteredCatalog = allSupported.filter((lang) => {
    if (enrolledCodes.has(lang.code)) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.self_name.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    )
  })

  const runAction = async (code: string, fn: () => Promise<void>) => {
    setBusyCode(code)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusyCode(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="languages-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--fl-border)] px-5 py-4">
          <div>
            <h2 id="languages-modal-title" className="text-lg font-semibold text-[var(--fl-text)]">
              My Study Languages
            </h2>
            <p className="text-sm text-[var(--fl-muted)]">
              Each language keeps its own isolated study plan, progress, XP, and flashcards.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close languages dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--fl-border)] text-[var(--fl-text-secondary)] hover:bg-[var(--fl-surface-subtle)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg border border-[var(--fl-danger)] bg-[var(--fl-danger-soft)] px-3 py-2 text-sm text-[var(--fl-danger)]">
              {error}
            </div>
          )}

          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-wider text-[var(--fl-muted)] uppercase">
              Active & Enrolled ({userLanguages.length})
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {userLanguages.map((item) => {
                const isActive = item.target_language === activeLanguage
                return (
                  <div
                    key={item.target_language}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      isActive
                        ? 'border-[var(--fl-accent)] bg-[var(--fl-accent-soft)]'
                        : 'border-[var(--fl-border)] bg-[var(--fl-surface)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">
                          {item.meta.flag}
                        </span>
                        <span className="truncate font-medium text-[var(--fl-text)]">
                          {item.meta.name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--fl-muted)]">
                        <span className="font-code">{item.target_language}</span>
                        <span>·</span>
                        <span>{item.plan?.cefr_level ?? 'A1'}</span>
                        <span>·</span>
                        <span>{item.progress.total_xp} XP</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--fl-accent)] px-2.5 py-1 text-xs font-medium text-[var(--fl-accent-contrast)]">
                          <Check className="h-3.5 w-3.5" />
                          Active
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busyCode === item.target_language}
                            aria-label={`Switch to ${item.meta.name}`}
                            onClick={() =>
                              runAction(item.target_language, async () => {
                                await onSwitch(item.target_language)
                                onClose()
                              })
                            }
                            className="rounded-md border border-[var(--fl-border-strong)] bg-[var(--fl-surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--fl-text)] hover:border-[var(--fl-accent)]"
                          >
                            Switch
                          </button>
                          <button
                            type="button"
                            disabled={busyCode === item.target_language}
                            aria-label={`Remove ${item.meta.name}`}
                            onClick={() =>
                              runAction(item.target_language, () => onDelete(item.target_language))
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--fl-border)] text-[var(--fl-muted)] hover:border-[var(--fl-danger)] hover:text-[var(--fl-danger)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--fl-muted)] uppercase">
                Add Another Language ({filteredCatalog.length} available)
              </h3>
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[var(--fl-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search languages..."
                  aria-label="Search supported languages"
                  className="w-full rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] py-1.5 pr-3 pl-8 text-sm text-[var(--fl-text)] placeholder:text-[var(--fl-muted)] focus:border-[var(--fl-accent)] focus:outline-none"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredCatalog.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  disabled={busyCode === lang.code}
                  onClick={() =>
                    runAction(lang.code, async () => {
                      await onAdd(lang.code)
                      onClose()
                    })
                  }
                  className="flex items-center justify-between rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface)] px-3 py-2.5 text-left transition-colors hover:border-[var(--fl-accent)] hover:bg-[var(--fl-surface-subtle)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base" aria-hidden="true">
                        {lang.flag}
                      </span>
                      <span className="truncate text-sm font-medium text-[var(--fl-text)]">
                        {lang.name}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--fl-muted)]">
                      {lang.self_name} · <span className="font-code">{lang.code}</span>
                    </p>
                  </div>
                  <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--fl-control)] px-2 py-1 text-xs font-medium text-[var(--fl-control-text)]">
                    <Plus className="h-3 w-3" />
                    Add
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
