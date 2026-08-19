// Which repo hosts the real backend state (server/data/*.json) and the
// unit-cycle workflow. Overridable at build time (the Pages workflow
// injects the real values); falls back to this project's own repo so
// local dev and other deploy targets work out of the box.
export const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER || 'dittius'
export const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || '-vantera-tiktok-shop-affiliate-unit'
export const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main'
export const DATA_PATH_PREFIX = 'vantera-tiktok-shop-affiliate-unit/server/data'
export const WORKFLOW_FILE = 'unit-cycle.yml'

export function rawDataUrl(table: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${DATA_PATH_PREFIX}/${table}.json?t=${Date.now()}`
}
