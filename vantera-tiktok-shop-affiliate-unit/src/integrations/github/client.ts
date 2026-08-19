// The frontend is static (no server of its own), so writing to the real
// backend state means calling GitHub's own API directly from the browser.
// Diego authorizes this ONCE by pasting a fine-grained Personal Access
// Token scoped to only this repo (Contents: read/write, Actions:
// read/write). The token is HIS credential: it lives only in this
// browser's localStorage, is sent only to api.github.com, and is never
// baked into the app bundle or seen by anyone else — categorically
// different from a secret the app ships with.
import { DATA_PATH_PREFIX, GITHUB_BRANCH, GITHUB_OWNER, GITHUB_REPO, WORKFLOW_FILE, rawDataUrl } from './config'

const TOKEN_KEY = 'vantera-github-pat'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token.trim())
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isConnected(): boolean {
  return Boolean(getToken())
}

const API = 'https://api.github.com'

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/** Verifies the token actually has access to this repo. Throws a
 * human-readable message on failure instead of a raw HTTP error. */
export async function verifyToken(token: string): Promise<void> {
  const res = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, { headers: authHeaders(token) })
  if (res.status === 401) throw new Error('Token non valido o scaduto.')
  if (res.status === 404) throw new Error('Token valido ma senza accesso a questo repository.')
  if (!res.ok) throw new Error(`Verifica fallita: HTTP ${res.status}`)
}

/** Reads a real data table. Tries the public raw URL first (fast, no rate
 * limit); falls back to the authenticated Contents API (works for private
 * repos too) if a token is set and the raw fetch didn't succeed. */
export async function readTable<T>(table: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(rawDataUrl(table), { cache: 'no-store' })
    if (res.ok) return (await res.json()) as T
  } catch {
    // fall through to authenticated path
  }
  const token = getToken()
  if (!token) return fallback
  try {
    const res = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH_PREFIX}/${table}.json?ref=${GITHUB_BRANCH}`, {
      headers: authHeaders(token),
    })
    if (!res.ok) return fallback
    const data = (await res.json()) as { content: string; encoding: string }
    const decoded = decodeBase64(data.content)
    return JSON.parse(decoded) as T
  } catch {
    return fallback
  }
}

function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

/** Read-modify-write a JSON table via the authenticated Contents API.
 * Used for the small, low-frequency control actions (Start/Pause/Emergency
 * Stop) a human triggers from the app — the worker itself never uses this,
 * it writes the git working tree directly and commits. */
export async function writeTable(table: string, mutate: (current: unknown) => unknown): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Nessun token GitHub configurato. Collega GitHub in Control.')

  const path = `${DATA_PATH_PREFIX}/${table}.json`
  const getRes = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
    headers: authHeaders(token),
  })
  if (!getRes.ok) throw new Error(`Impossibile leggere ${table}.json prima della scrittura: HTTP ${getRes.status}`)
  const current = (await getRes.json()) as { content: string; sha: string }
  const currentJson = JSON.parse(decodeBase64(current.content))
  const next = mutate(currentJson)

  const putRes = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `control: update ${table}.json from Vantera app`,
      content: encodeBase64(JSON.stringify(next, null, 2) + '\n'),
      sha: current.sha,
      branch: GITHUB_BRANCH,
    }),
  })
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '')
    throw new Error(`Scrittura fallita: HTTP ${putRes.status} ${text}`)
  }
}

/** Kicks the scheduled worker to run immediately instead of waiting for
 * the next cron tick — used by a "Run now" action in Control. */
export async function triggerCycleNow(): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Nessun token GitHub configurato.')
  const res = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: GITHUB_BRANCH }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Impossibile avviare il ciclo: HTTP ${res.status} ${text}`)
  }
}
