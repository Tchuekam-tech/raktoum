import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'FreeLingo — Structured Language Learning with Lingu',
  description:
    'Structured A1-C2 multi-language learning platform with adaptive placement testing, deterministic study plans, SM-2 flashcards, grammar/vocabulary/phrasebook references, practice games, and Lingu conversation rehearsals.',
  openGraph: {
    title: 'FreeLingo — Structured Language Learning with Lingu',
    description:
      'Structured A1-C2 multi-language learning platform with adaptive placement testing, deterministic study plans, SM-2 flashcards, grammar/vocabulary/phrasebook references, practice games, and Lingu conversation rehearsals.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
