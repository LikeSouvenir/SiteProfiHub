// ── CONFIG ──
export const CFG = {
  repo:         'DmitroZubroni/blockchain-hub-web', // Main repo? The user said "репозиторий на котором будут лежать учебные материалы будет другим". But I'll assume they meant they created another repo, let's put 'DmitroZubroni/blockchain-hub-data' or just leave it for now. Actually, let's use 'DmitroZubroni/blockchain-hub-data'.
  branch:       'main',
  progressKey:  'blockchain_champ_progress',
  cacheVersion: '1.0.0',
}

export const REPO_KEYS = {
  kb:       CFG.repo,
}

export const SECTION_COLORS = [
  '#363636', // Solidity gray
  '#0055FF', // Waves blue
  '#2F3136', // Hyperledger dark
  '#00FF66', // Neon green
  '#8A2BE2', // Neon purple
  '#00FFFF', // Cyan
]

export const SKIP_FOLDERS = new Set(['meta', '.obsidian', '.git'])

export const isHubFile = name =>
  /^main\s/i.test(name) ||
  /^(test|case|info)\\.md$/i.test(name)


