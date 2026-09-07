import { CFG, REPO_KEYS, SECTION_COLORS, SKIP_FOLDERS, isHubFile } from './config'
import { getCached, setCached } from './cache'

// ── In-memory caches per repo key ──
const _trees    = {}    // key → tree array
const _sections = {}    // key → sections array
const _metas    = {}    // `${key}:${sId}` → meta
const _chaps    = {}    // `${key}:${sId}:${slug}` → text
const _quizSecs = { ref: null }
const _quizData = {}

// ── Helpers ──
export function ghRaw(path, repo = CFG.repo) {
  return `https://raw.githubusercontent.com/${repo}/main/${encodeURIComponent(path).replace(/%2F/g,'/')}`
}

async function fetchText(url, cacheKey) {
  if (cacheKey) { const c = getCached(cacheKey); if (c) return c }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const text = await res.text()
  if (cacheKey) setCached(cacheKey, text)
  return text
}

async function fetchJSON(url, cacheKey) {
  if (cacheKey) { const c = getCached(cacheKey); if (c) return c }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const data = await res.json()
  if (cacheKey) setCached(cacheKey, data)
  return data
}

// ── slugToTitle ──
export function slugToTitle(name) {
  return name
    .replace(/^\d+\s*[-_]?\s*/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || name
}

// ══════════════════════════════════════════════
//  GENERIC MULTI-REPO LOADERS
// ══════════════════════════════════════════════

// ── Fetch git tree for any repo ──
export async function fetchRepoTree(repoKey) {
  if (_trees[repoKey]) return _trees[repoKey]
  const cKey = `atlant_v2_tree_${repoKey}`
  const hit  = getCached(cKey)
  if (hit) { _trees[repoKey] = hit; return hit }
  const repo = REPO_KEYS[repoKey]
  if (!repo) throw new Error(`Unknown repo key: ${repoKey}`)
  const data = await fetchJSON(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`, null)
  const tree = data.tree || []
  setCached(cKey, tree)
  _trees[repoKey] = tree
  return tree
}

// Invalidate a repo tree from memory+cache (for background refresh)
export function invalidateRepoTree(repoKey) {
  delete _trees[repoKey]
  delete _sections[repoKey]
  // also clear meta for this repo
  Object.keys(_metas).filter(k => k.startsWith(repoKey + ':')).forEach(k => delete _metas[k])
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(`atlant_v2_tree_${repoKey}`) || k.startsWith(`atlant_v2_secs_${repoKey}`))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

// ── Load sections from any repo ──
export async function loadSectionsByKey(repoKey) {
  if (_sections[repoKey]) return _sections[repoKey]
  const cKey = `atlant_v2_secs_${repoKey}`
  const hit  = getCached(cKey)
  if (hit) { _sections[repoKey] = hit; return hit }

  const tree = await fetchRepoTree(repoKey)
  
  // Map repoKey to root folder
  let rootPrefix = ''
  if (repoKey === 'kb') rootPrefix = 'info/'
  else if (repoKey === 'cases') rootPrefix = 'case/'
  else if (repoKey === 'test' || repoKey === 'qb') rootPrefix = 'test/'

  const rootFolders = [...new Set(
    tree
      .filter(f => f.type === 'blob' && f.path.startsWith(rootPrefix) && f.path.slice(rootPrefix.length).includes('/'))
      .map(f => f.path.slice(rootPrefix.length).split('/')[0])
      .filter(n => !SKIP_FOLDERS.has(n))
  )].sort()

  const sections = rootFolders.map((folder, i) => ({
    id:     folder.toLowerCase().replace(/\s+/g, '-'),
    title:  folder,
    color:  SECTION_COLORS[i % SECTION_COLORS.length],
    order:  i + 1,
    ghPath: rootPrefix + folder, // Full path in repo
    source: repoKey,
  }))

  _sections[repoKey] = sections
  setCached(cKey, sections)
  return sections
}

// ── Build tree of subsections+chapters ──
function buildTree(files, basePrefix) {
  const rel    = files.map(f => ({ ...f, rel: f.path.slice(basePrefix.length) }))
  const direct = rel.filter(f => !f.rel.includes('/')).map(f => {
    const filename = f.path.split('/').pop().replace(/\.md$/, '')
    return { slug: f.path.replace(/\.md$/, ''), title: slugToTitle(filename), path: f.path }
  })
  const dirs = [...new Set(
    rel.filter(f => f.rel.includes('/')).map(f => f.rel.split('/')[0])
  )].sort()

  if (dirs.length === 0) return { subsections: [], flat: direct }

  const subsections = dirs.map(dir => {
    const dirPrefix = basePrefix + dir + '/'
    const dirFiles  = files.filter(f => f.path.startsWith(dirPrefix))
    const child     = buildTree(dirFiles, dirPrefix)
    return { id: dir.toLowerCase().replace(/\s+/g, '-'), title: slugToTitle(dir), chapters: child.flat, subsections: child.subsections }
  })

  const rootSection = direct.length > 0
    ? [{ id: '__root__', title: '—', chapters: direct, subsections: [] }]
    : []

  return { subsections: [...rootSection, ...subsections], flat: [...direct, ...subsections.flatMap(s => s.chapters)] }
}

// ── Load section meta from any repo ──
export async function loadMetaByKey(repoKey, sId) {
  const memKey = `${repoKey}:${sId}`
  if (_metas[memKey]) return _metas[memKey]

  const cKey = `atlant_v2_meta_${repoKey}_${sId.replace(/\W/g, '_')}`
  const hit  = getCached(cKey)
  if (hit && hit.flat && Array.isArray(hit.flat)) { _metas[memKey] = hit; return hit }

  const sections = _sections[repoKey] || await loadSectionsByKey(repoKey)
  const sec = sections.find(s => s.id === sId)
  if (!sec) return { subsections: [], flat: [] }

  const tree   = _trees[repoKey] || await fetchRepoTree(repoKey)
  const prefix = sec.ghPath + '/'
  const repo   = REPO_KEYS[repoKey]

  const allFiles = tree.filter(f =>
    f.type === 'blob' &&
    f.path.startsWith(prefix) &&
    f.path.endsWith('.md') &&
    !isHubFile(f.path.split('/').pop())
  ).sort((a, b) => a.path.localeCompare(b.path))

  const meta = buildTree(allFiles, prefix)
  _metas[memKey] = meta
  setCached(cKey, meta)
  return meta
}

// ── Load chapter markdown from any repo ──
export async function loadChapterByKey(repoKey, sId, slug) {
  const memKey = `${repoKey}:${sId}:${slug}`
  if (_chaps[memKey]) return _chaps[memKey]

  const cKey = `atlant_v2_ch_${(repoKey + '_' + sId + '_' + slug).replace(/\W/g, '_').slice(0, 80)}`
  const hit  = getCached(cKey)
  if (hit) { _chaps[memKey] = hit; return hit }

  const meta = await loadMetaByKey(repoKey, sId)
  const ch   = meta.flat.find(c => c.slug === slug)
  if (!ch) throw new Error('Конспект не найден: ' + slug)

  const repo = REPO_KEYS[repoKey]
  const url  = `https://raw.githubusercontent.com/${repo}/main/${ch.path}`
  const text = await fetchText(url, cKey)
  _chaps[memKey] = text
  return text
}

// ── Source-aware dispatchers (used by SectionHub / ChapterPage) ──
export async function getSectionMetaBySource(source, sId) {
  const key = source === 'speedrun' ? 'speedrun' : source === 'cases' ? 'cases' : 'kb'
  const raw = await loadMetaByKey(key, sId)
  if (!raw || typeof raw !== 'object') return { subsections: [], flat: [] }
  return { subsections: raw.subsections || [], flat: Array.isArray(raw.flat) ? raw.flat : [] }
}

export async function loadChapterBySource(source, sId, slug) {
  const key = source === 'speedrun' ? 'speedrun' : source === 'cases' ? 'cases' : 'kb'
  return loadChapterByKey(key, sId, slug)
}

// ══════════════════════════════════════════════
//  BACKWARD-COMPAT KB WRAPPERS
// ══════════════════════════════════════════════

/** @deprecated use loadSectionsByKey('kb') */
export async function loadSectionsFromRepo() {
  return loadSectionsByKey('kb')
}

export function getSections() { return _sections['kb'] || [] }

/** @deprecated use getSectionMetaBySource('kb', sId) */
export async function loadSectionMeta(sId) {
  return loadMetaByKey('kb', sId)
}

export async function getSectionMeta(sId) {
  return getSectionMetaBySource('kb', sId)
}

/** @deprecated use loadChapterByKey('kb', sId, slug) */
export async function loadChapter(sId, slug) {
  return loadChapterByKey('kb', sId, slug)
}

/** @deprecated use fetchRepoTree */
export async function fetchTree(repo, key) {
  const cKey = `atlant_v2_tree_${key}`
  const hit  = getCached(cKey)
  if (hit) { _trees[key] = hit; return hit }
  const data = await fetchJSON(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`, null)
  const tree = data.tree || []
  setCached(cKey, tree)
  _trees[key] = tree
  return tree
}

// ══════════════════════════════════════════════
//  QUIZ SYSTEM (unchanged)
// ══════════════════════════════════════════════

function normStr(s) { return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '') }

function matchQbFolder(qbDirs, kbFolder) {
  const kn = normStr(kbFolder)
  let m = qbDirs.find(d => normStr(d) === kn)
  if (m) return m
  m = qbDirs.find(d => normStr(d).includes(kn))
  if (m) return m
  m = qbDirs.find(d => kn.includes(normStr(d).replace(/test/g, '')))
  return m || null
}

function buildQuizTree(tree, basePrefix) {
  const files = tree.filter(f => f.type === 'blob' && f.path.startsWith(basePrefix) && f.path.endsWith('.json'))
  const relPaths = files.map(f => f.path.slice(basePrefix.length))
  const direct   = files.filter(f => !f.path.slice(basePrefix.length).includes('/'))
  const dirs = [...new Set(relPaths.filter(r => r.includes('/')).map(r => r.split('/')[0]))].sort()
  const subsections = dirs.map(dir => {
    const child = buildQuizTree(tree, basePrefix + dir + '/')
    return { id: dir.toLowerCase().replace(/\s+/g, '-'), title: slugToTitle(dir), qbPath: basePrefix.slice(0,-1) + '/' + dir, ...child }
  })
  return { files: direct, subsections, count: files.length }
}

export async function loadQuizSections() {
  if (_quizSecs.ref) return _quizSecs.ref
  const cKey = 'atlant_v2_quiz_sections'
  const hit  = getCached(cKey)
  if (hit) { _quizSecs.ref = hit; return hit }

  const [tree, sections] = await Promise.all([
    fetchTree(CFG.repo, 'qb'),
    loadSectionsByKey('kb'),
  ])

  // Look ONLY inside the "test/" folder in the repository
  const prefix = 'test/'
  const testFiles = tree.filter(f => f.type === 'blob' && f.path.startsWith(prefix) && f.path.endsWith('.json'))
  
  // The directories inside "test/" (or just the filenames if there are no subdirs)
  // E.g. "test/solidity.json" -> "solidity"
  const gethDirs = [...new Set(
    testFiles.map(f => {
      const rel = f.path.slice(prefix.length) // "solidity.json" or "geth/q1.json"
      return rel.includes('/') ? rel.split('/')[0] : rel.replace('.json', '')
    })
  )].sort()

  _quizSecs.ref = gethDirs.map((dir, i) => {
    // If it's a file "test/solidity.json", the prefix for it is "test/" and we check files.
    // We can just construct a qbPath to pass to loadQuizByPath.
    // If it's a directory "test/geth/...", qbPath is "test/geth".
    // Wait, the API for loadQuizByPath uses qbPath.
    const isDir = tree.some(f => f.path === prefix + dir && f.type === 'tree') || tree.some(f => f.path.startsWith(prefix + dir + '/'))
    const qbPath = isDir ? prefix + dir : prefix + dir + '.json'
    
    // Attempt to match with a KB section for icon/color
    const kbSec = sections.find(s => normStr(s.id) === normStr(dir))
    
    return {
      id:     kbSec ? kbSec.id : dir.toLowerCase().replace(/\s+/g, '-'),
      title:  kbSec ? kbSec.title : slugToTitle(dir),
      qbPath: qbPath,
      color:  kbSec ? kbSec.color : SECTION_COLORS[i % SECTION_COLORS.length],
    }
  })
  setCached(cKey, _quizSecs.ref)
  return _quizSecs.ref
}

export async function loadQuizByPath(qbPath) {
  if (_quizData[qbPath] !== undefined) return _quizData[qbPath]
  const cKey = `atlant_v2_qp_${qbPath.replace(/\W/g, '_')}`
  const hit = getCached(cKey)
  if (hit) { _quizData[qbPath] = hit; return hit }

  const tree   = _trees['qb'] || await fetchTree(CFG.repo, 'qb')
  
  // qbPath might be "test/solidity.json" or "test/geth"
  const isFile = qbPath.endsWith('.json')
  const prefix = isFile ? qbPath : (qbPath.endsWith('/') ? qbPath : qbPath + '/')
  const files  = tree.filter(f => f.type === 'blob' && f.path.startsWith(prefix) && f.path.endsWith('.json'))

  const all = []
  await Promise.all(files.map(async f => {
    try {
      const url  = `https://raw.githubusercontent.com/${CFG.repo}/main/${f.path}`
      const res  = await fetch(url)
      if (!res.ok) return
      const text = await res.text()
      const data = JSON.parse(text)
      all.push(...(Array.isArray(data) ? data : (data.questions || [])))
    } catch {}
  }))

  _quizData[qbPath] = all
  if (all.length) setCached(cKey, all)
  return all
}
