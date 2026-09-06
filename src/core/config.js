// ── CONFIG ──
export const CFG = {
  repo:         'LikeSouvenir/ProfiHub',
  branch:       'main',
  progressKey:  'blockchain_champ_progress',
  cacheVersion: '1.0.0',
}

export const REPO_KEYS = {
  kb:       CFG.repo,
  cases:    CFG.repo,
  qb:       CFG.repo,
  test:     CFG.repo,
}

export const SECTION_COLORS = [
  '#00FF66', // Neon green
  '#00FFFF', // Cyan
  '#8A2BE2', // Neon purple
  '#FF007A', // Neon pink
  '#F3BA2F', // Yellow
  '#0055FF', // Blue
  '#FF4500', // Orange
]

export const SKIP_FOLDERS = new Set(['meta', '.obsidian', '.git'])

export const isHubFile = name =>
  /^main\s/i.test(name) ||
  /^(test|case|info)\\.md$/i.test(name)


