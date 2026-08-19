// Free, zero-setup object storage for generated media: a rolling GitHub
// Release on the same repo holds every rendered video as a downloadable
// asset with a real public HTTPS URL. Uses the GITHUB_TOKEN that Actions
// injects automatically — no new account, no new secret, no cost.
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const API = 'https://api.github.com'
const RELEASE_TAG = 'media'

interface ReleaseInfo {
  id: number
  upload_url: string
}

function repoInfo(): { owner: string; repo: string } {
  const full = process.env.GITHUB_REPOSITORY // "owner/repo", provided by Actions
  if (!full) throw new Error('GITHUB_REPOSITORY env var not set — githubReleaseStorage only runs inside GitHub Actions.')
  const [owner, repo] = full.split('/')
  return { owner, repo }
}

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN env var not set.')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function getOrCreateMediaRelease(): Promise<ReleaseInfo> {
  const { owner, repo } = repoInfo()
  const getRes = await fetch(`${API}/repos/${owner}/${repo}/releases/tags/${RELEASE_TAG}`, { headers: authHeaders() })
  if (getRes.ok) {
    const data = (await getRes.json()) as ReleaseInfo
    return data
  }
  const createRes = await fetch(`${API}/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: RELEASE_TAG,
      name: 'Vantera media storage',
      body: 'Rolling release used as free object storage for agent-generated videos. Do not delete.',
      draft: false,
      prerelease: true,
    }),
  })
  if (!createRes.ok) throw new Error(`Failed to create media release: HTTP ${createRes.status} ${await createRes.text()}`)
  return (await createRes.json()) as ReleaseInfo
}

export async function uploadVideoAsset(filePath: string, assetName: string): Promise<string> {
  const release = await getOrCreateMediaRelease()
  const buffer = await readFile(filePath)
  const uploadBase = release.upload_url.replace(/\{.*\}$/, '')
  const name = assetName || basename(filePath)
  const res = await fetch(`${uploadBase}?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'video/mp4' },
    body: buffer,
  })
  if (!res.ok) throw new Error(`Failed to upload video asset: HTTP ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { browser_download_url: string }
  return data.browser_download_url
}
