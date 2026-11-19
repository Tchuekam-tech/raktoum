'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Gamepad2,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { DashboardPayload, DashboardView, NavTab } from './DashboardView'
import { StudyPlanView } from './StudyPlanView'
import { AssessmentView } from './AssessmentView'
import { FlashcardsView } from './FlashcardsView'
import { ResourcesView } from './ResourcesView'
import { GamesView } from './GamesView'
import { SituationsView } from './SituationsView'
import { LanguageModal } from './LanguageModal'

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'study-plan', label: 'Study Plan', icon: Calendar },
  { id: 'assessment', label: 'Placement Quiz', icon: GraduationCap },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'resources', label: 'Resources', icon: BookOpen },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'situations', label: 'Situations', icon: MessageSquare },
]

export function FreeLingoApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [pendingLessonSlot, setPendingLessonSlot] = useState<number | null>(null)

  const refreshDashboard = useCallback(async () => {
    const res = await fetch('/api/dashboard', { cache: 'no-store' })
    if (res.ok) {
      setDashboard((await res.json()) as DashboardPayload)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshDashboard()
  }, [refreshDashboard])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const handleSwitchLanguage = async (code: string) => {
    const res = await fetch('/api/languages/active', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_language: code }),
    })
    if (!res.ok) {
      const err = (await res.json()) as { error?: string }
      throw new Error(err.error ?? 'Failed to switch language')
    }
    await refreshDashboard()
  }

  const handleAddLanguage = async (code: string) => {
    const res = await fetch('/api/languages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_language: code, activate: true }),
    })
    if (!res.ok) {
      const err = (await res.json()) as { error?: string }
      throw new Error(err.error ?? 'Failed to add language')
    }
    await refreshDashboard()
  }

  const handleDeleteLanguage = async (code: string) => {
    const res = await fetch(`/api/languages/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = (await res.json()) as { error?: string }
      throw new Error(err.error ?? 'Failed to remove language')
    }
    await refreshDashboard()
  }

  const openLessonFromDashboard = (slotIndex: number) => {
    setPendingLessonSlot(slotIndex)
    setActiveTab('study-plan')
  }

  const activeLanguageCode = dashboard?.active_language ?? 'en-GB'

  return (
    <div className="min-h-screen bg-[var(--fl-bg)] text-[var(--fl-text)]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--fl-border)] bg-[var(--fl-surface)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] text-[var(--fl-text)] lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              <img
                src="/logo.png"
                alt="FreeLingo Lingu mascot"
                className="h-8 w-8 shrink-0 rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] object-contain p-0.5"
              />
              <div className="min-w-0 truncate">
                <span className="font-code text-sm font-bold tracking-tight text-[var(--fl-text)] sm:text-base">
                  FreeLingo
                </span>
                <span className="font-code ml-2 hidden text-[11px] text-[var(--fl-muted)] sm:inline">
                  v1.14.10
                </span>
              </div>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {dashboard && (
              <button
                type="button"
                onClick={() => setLangModalOpen(true)}
                aria-label="Switch or add study language"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fl-border-strong)] bg-[var(--fl-surface-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--fl-text)] transition-colors hover:border-[var(--fl-accent)] sm:gap-2 sm:px-3 sm:text-sm"
              >
                <span aria-hidden="true">{dashboard.meta.flag}</span>
                <span className="max-w-[78px] truncate sm:max-w-none">{dashboard.meta.name}</span>
                <span className="font-code hidden rounded bg-[var(--fl-accent-soft)] px-1.5 py-0.5 text-[11px] text-[var(--fl-accent)] sm:inline">
                  {dashboard.plan?.cefr_level ?? 'A1'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--fl-muted)]" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] text-[var(--fl-text-secondary)] transition-colors hover:border-[var(--fl-accent)] hover:text-[var(--fl-text)]"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav aria-label="Main navigation" className="sticky top-20 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--fl-accent)] text-[var(--fl-accent-contrast)]'
                      : 'text-[var(--fl-text-secondary)] hover:bg-[var(--fl-surface-subtle)] hover:text-[var(--fl-text)]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {item.id === 'flashcards' && dashboard && dashboard.due_flashcards_count > 0 && (
                    <span
                      className={`font-code rounded px-1.5 py-0.5 text-[11px] ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--fl-accent-soft)] text-[var(--fl-accent)]'
                      }`}
                    >
                      {dashboard.due_flashcards_count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-14 z-40 border-b border-[var(--fl-border)] bg-[var(--fl-surface)] p-3 shadow-lg lg:hidden">
            <nav aria-label="Mobile navigation" className="grid grid-cols-2 gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'bg-[var(--fl-accent)] text-[var(--fl-accent-contrast)]'
                        : 'border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] text-[var(--fl-text)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
        )}

        {/* Main Workspace */}
        <main className="min-w-0 flex-1 pb-12">
          {loading || !dashboard ? (
            <div className="rounded-xl border border-[var(--fl-border)] bg-[var(--fl-surface-elevated)] p-8 text-sm text-[var(--fl-muted)]">
              Loading FreeLingo workspace...
            </div>
          ) : activeTab === 'dashboard' ? (
            <DashboardView
              data={dashboard}
              onNavigate={setActiveTab}
              onOpenLesson={openLessonFromDashboard}
              onRefresh={refreshDashboard}
            />
          ) : activeTab === 'study-plan' ? (
            <StudyPlanView
              activeLanguage={activeLanguageCode}
              initialLessonSlot={pendingLessonSlot}
              onClearInitialLesson={() => setPendingLessonSlot(null)}
              onPlanUpdated={refreshDashboard}
            />
          ) : activeTab === 'assessment' ? (
            <AssessmentView
              activeLanguage={activeLanguageCode}
              onCompleted={refreshDashboard}
              onJumpToPlan={() => setActiveTab('study-plan')}
            />
          ) : activeTab === 'flashcards' ? (
            <FlashcardsView activeLanguage={activeLanguageCode} onUpdated={refreshDashboard} />
          ) : activeTab === 'resources' ? (
            <ResourcesView
              activeLanguage={activeLanguageCode}
              onFlashcardAdded={refreshDashboard}
            />
          ) : activeTab === 'games' ? (
            <GamesView activeLanguage={activeLanguageCode} onSessionRecorded={refreshDashboard} />
          ) : (
            <SituationsView activeLanguage={activeLanguageCode} onXpEarned={refreshDashboard} />
          )}
        </main>
      </div>

      {/* Multi-Language Switcher & Enrollment Dialog */}
      {dashboard && (
        <LanguageModal
          open={langModalOpen}
          onClose={() => setLangModalOpen(false)}
          userLanguages={dashboard.languages_overview.languages}
          allSupported={dashboard.languages_overview.all_supported_languages}
          activeLanguage={dashboard.active_language}
          onSwitch={handleSwitchLanguage}
          onAdd={handleAddLanguage}
          onDelete={handleDeleteLanguage}
        />
      )}
    </div>
  )
}
