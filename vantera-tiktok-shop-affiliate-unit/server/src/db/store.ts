// File-based persistent store. Each "table" is one JSON file under
// server/data/. This is the real database for the MVP: it is durable
// (every cycle commits changes to git, so state survives across runs and
// is versioned/auditable for free), and it sits behind the same narrow
// read/write interface a real RDBMS adapter would use — swapping to
// Postgres later means rewriting this one file, not the agents that use it.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = join(__dirname, '..', '..', 'data')

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true })
}

export async function readTable<T>(name: string, fallback: T): Promise<T> {
  await ensureDataDir()
  const path = join(DATA_DIR, `${name}.json`)
  if (!existsSync(path)) return fallback
  try {
    const raw = await readFile(path, 'utf8')
    if (!raw.trim()) return fallback
    return JSON.parse(raw) as T
  } catch (err) {
    // A corrupt/partial file must never crash the whole cycle — fail safe
    // to the last-known-good default and let the next successful write heal it.
    console.error(`[db] failed to read table "${name}", using fallback:`, err)
    return fallback
  }
}

export async function writeTable<T>(name: string, data: T): Promise<void> {
  await ensureDataDir()
  const path = join(DATA_DIR, `${name}.json`)
  const tmpPath = `${path}.tmp`
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  await rename(tmpPath, path) // atomic on POSIX — no reader ever sees a half-written file
}

export function nowIso(): string {
  return new Date().toISOString()
}

let counter = 0
export function makeId(prefix: string): string {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter}${rand}`
}
