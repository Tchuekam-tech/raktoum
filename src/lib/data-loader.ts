import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_TARGET_LANGUAGE,
  LanguageDataset,
  LanguageMeta,
  Situation,
} from './types'

const DATA_DIR = path.join(process.cwd(), 'data')

let metaCache: LanguageMeta[] | null = null
let situationsCache: Situation[] | null = null
const datasetCache = new Map<string, LanguageDataset>()

export function getAllLanguagesMeta(): LanguageMeta[] {
  if (!metaCache) {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'languages-meta.json'), 'utf-8')
    metaCache = JSON.parse(raw) as LanguageMeta[]
  }
  return metaCache
}

export function getLanguageMeta(code: string): LanguageMeta {
  const all = getAllLanguagesMeta()
  return (
    all.find((l) => l.code === code) ??
    all.find((l) => l.code === DEFAULT_TARGET_LANGUAGE) ??
    all[0]
  )
}

export function isSupportedLanguage(code: string): boolean {
  return getAllLanguagesMeta().some((l) => l.code === code)
}

export function getLanguageDataset(code: string): LanguageDataset {
  const resolved = isSupportedLanguage(code) ? code : DEFAULT_TARGET_LANGUAGE
  const cached = datasetCache.get(resolved)
  if (cached) return cached

  const filePath = path.join(DATA_DIR, 'languages', `${resolved}.json`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = JSON.parse(raw) as LanguageDataset
  datasetCache.set(resolved, parsed)
  return parsed
}

export function getAllSituations(): Situation[] {
  if (!situationsCache) {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'situations.json'), 'utf-8')
    situationsCache = JSON.parse(raw) as Situation[]
  }
  return situationsCache
}
