// test/session-projcache-layout.test.mjs
// 回归用例：DSH 0.1.7 把 session_projcache 从「单文件」改为「per-record 目录」后，
// 会话标题全部退化为「新会话」。
//
// 旧布局（0.1.6-）: <DSH_HOME>/storages/session_projcache.json
//                    { tables: { sessions: { <id>: { identity, rows } } } }
// 新布局（0.1.7+）: <DSH_HOME>/storages/session_projcache/sessions/<id>.json
//                    { version, record: { identity, rows } }
//
// 第三种（2026-10 起）：第三方插件接管该存储域并改名/搬迁目录 + 改文件名命名。
// 实测 @michengai/dsh-archive-manager 把域换成 session_projcache_archive_manager_v2，
// 文件名改为 session_<base64url(sha256(sessionId))>.json。只认官方裸 id 命名就会读空，
// /sessions 里所有标题退化成「新会话」、「[当前]」标记也随之错位。
//
// 两种布局都必须能读出 rows.title.val——这是 /sessions 标题的唯一数据源。
// 两代并存时按 mtime 新鲜度逐 id 择一（issue #107），无固定优先级。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getSessionProjCache } from '../lib/platform/dsh-storage.js'
import { formatGoalTitle } from '../lib/platform/session-catalog.js'

/** 在隔离的 DSH_HOME 下运行 fn，避免读到真实用户目录。 */
function withHome(fn) {
  const prev = process.env.DSH_HOME
  const root = mkdtempSync(join(tmpdir(), 'dsh-projc-'))
  const home = join(root, '.dsh')
  mkdirSync(join(home, 'storages'), { recursive: true })
  process.env.DSH_HOME = home
  try {
    return fn(home, root)
  } finally {
    if (prev === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prev
    rmSync(root, { recursive: true, force: true })
  }
}

const recordOf = (title, extra = {}) => ({
  version: 7,
  record: { identity: { createdAt: 111 }, rows: { title: { ver: 1, seq: 1, val: title }, ...extra } },
})

/** 显式设置文件 mtime（毫秒）：新鲜度用例不依赖写入顺序的时间精度。 */
const setMtime = (file, ms) => utimesSync(file, new Date(ms), new Date(ms))

const MINUTE = 60_000

test('新布局（0.1.7+ per-record）：标题可读出，形状与消费方一致', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'sess-new.json'), JSON.stringify(recordOf('新布局标题', {
      sessionListMetadata: { ver: 1, seq: 1, val: { blank: false } },
    })))

    const cache = getSessionProjCache({})
    const row = cache['sess-new']
    // 消费方读取路径（session-catalog.js）：cache[sid].rows.title.val
    assert.equal(row?.rows?.title?.val, '新布局标题')
    assert.equal(row?.rows?.sessionListMetadata?.val?.blank, false)
    assert.equal(row?.identity?.createdAt, 111)
  })
})

test('旧布局（0.1.6- 单文件）：仍可读出（向后兼容，不回归旧用户）', () => {
  withHome((home) => {
    writeFileSync(join(home, 'storages', 'session_projcache.json'), JSON.stringify({
      tables: { sessions: { 'sess-old': { identity: { createdAt: 222 }, rows: { title: { val: '旧布局标题' } } } } },
    }))

    const cache = getSessionProjCache({})
    assert.equal(cache['sess-old']?.rows?.title?.val, '旧布局标题')
    assert.equal(cache['sess-old']?.identity?.createdAt, 222)
  })
})

// issue #107：两代布局并存时**不能有固定优先级**。
// 宿主升级后不再写旧单文件，固定优先旧文件会让 /sessions 标题停在升级那一刻；
// 但简单反转优先级又会让只有旧文件的未升级用户全部退化为「新会话」。
// 现行规则：逐 id 按 mtime 新鲜度择一（相等取 per-record）。
test('两种布局并存且旧文件更新：取旧文件（旧布局仍有最新写入时不丢数据）', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    const legacyPath = join(home, 'storages', 'session_projcache.json')
    const newPath = join(dir, 'both.json')
    writeFileSync(legacyPath, JSON.stringify({
      tables: { sessions: { both: { rows: { title: { val: 'legacy-newer' } } } } },
    }))
    writeFileSync(newPath, JSON.stringify(recordOf('new-older')))
    const now = Date.now()
    setMtime(newPath, now - 2 * MINUTE)
    setMtime(legacyPath, now - MINUTE)

    assert.equal(getSessionProjCache({})['both']?.rows?.title?.val, 'legacy-newer')
  })
})

test('两种布局并存且 per-record 更新：取 per-record 标题（升级后不再读旧快照）', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    const legacyPath = join(home, 'storages', 'session_projcache.json')
    const newPath = join(dir, 'both.json')
    writeFileSync(legacyPath, JSON.stringify({
      tables: { sessions: { both: { rows: { title: { val: 'legacy-stale' } } } } },
    }))
    writeFileSync(newPath, JSON.stringify(recordOf('new-fresh')))
    const now = Date.now()
    setMtime(legacyPath, now - 2 * MINUTE)
    setMtime(newPath, now - MINUTE)

    const cache = getSessionProjCache({})
    assert.equal(cache['both']?.rows?.title?.val, 'new-fresh')
    // has 也必须反映择一结果（不能因旧文件 own prop 存在就无条件 true）
    assert.equal('both' in cache, true, 'has 必须命中择一后的记录')
    assert.equal('absent' in cache, false, 'has 不得误报不存在的会话')
  })
})

test('两种布局并存且 mtime 相等：取 per-record（升级后权威来源，时间戳精度不翻转结果）', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    const legacyPath = join(home, 'storages', 'session_projcache.json')
    const newPath = join(dir, 'tie.json')
    writeFileSync(legacyPath, JSON.stringify({
      tables: { sessions: { tie: { rows: { title: { val: 'legacy-equal' } } } } },
    }))
    writeFileSync(newPath, JSON.stringify(recordOf('new-equal')))
    const same = Date.now() - MINUTE
    setMtime(legacyPath, same)
    setMtime(newPath, same)

    assert.equal(getSessionProjCache({})['tie']?.rows?.title?.val, 'new-equal')
  })
})

test('per-record 损坏（半写）且旧文件存在：回退旧文件，不丢标题', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(home, 'storages', 'session_projcache.json'), JSON.stringify({
      tables: { sessions: { half: { rows: { title: { val: '旧文件兜底' } } } } },
    }))
    // 更"新"但内容损坏：解析失败应回退旧文件，而不是让标题退化为「新会话」
    const brokenPath = join(dir, 'half.json')
    writeFileSync(brokenPath, '{"version":7,"record":{"rows":')
    setMtime(brokenPath, Date.now())

    const cache = getSessionProjCache({})
    assert.equal(cache['half']?.rows?.title?.val, '旧文件兜底')
    assert.equal('half' in cache, true)
  })
})

test('per-record 目录存在但该会话无 per-record 文件：仍取旧文件（逐 id 择一，不是整体择一）', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    // 目录存在但只装了别的会话 → 不能因此判定旧文件整体不可信
    writeFileSync(join(dir, 'other.json'), JSON.stringify(recordOf('别的会话')))
    writeFileSync(join(home, 'storages', 'session_projcache.json'), JSON.stringify({
      tables: { sessions: { legacyOnly: { rows: { title: { val: '仅旧文件' } } } } },
    }))

    const cache = getSessionProjCache({})
    assert.equal(cache['legacyOnly']?.rows?.title?.val, '仅旧文件')
    assert.equal(cache['other']?.rows?.title?.val, '别的会话')
  })
})

test('两种布局均缺失：返回空且不抛错（宿主存储属可丢弃的派生数据）', () => {
  withHome(() => {
    const cache = getSessionProjCache({})
    assert.equal(cache['nonexistent'], undefined)
    assert.doesNotThrow(() => cache['another'])
  })
})

test('不存在的会话 id 返回 undefined（不得抛错中断整个 /sessions 列表）', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'exists.json'), JSON.stringify(recordOf('t')))

    const cache = getSessionProjCache({})
    assert.equal(cache['exists']?.rows?.title?.val, 't')
    assert.equal(cache['missing'], undefined)
  })
})

test('损坏的 per-record 文件视为无缓存，不影响其它会话', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'broken.json'), '{ this is not json')
    writeFileSync(join(dir, 'ok.json'), JSON.stringify(recordOf('好会话')))

    const cache = getSessionProjCache({})
    assert.equal(cache['broken'], undefined)
    assert.equal(cache['ok']?.rows?.title?.val, '好会话')
  })
})

test('内存注入优先于磁盘（ctx.sessionProjCache 存在时不读文件）', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 's.json'), JSON.stringify(recordOf('来自磁盘')))

    const injected = { s: { rows: { title: { val: '来自注入' } } } }
    assert.equal(getSessionProjCache({ sessionProjCache: injected })['s']?.rows?.title?.val, '来自注入')
  })
})

test('惰性读取：构造 cache 不遍历全部 per-record 文件', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache', 'sessions')
    mkdirSync(dir, { recursive: true })
    for (let i = 0; i < 200; i++) {
      writeFileSync(join(dir, `s${i}.json`), JSON.stringify(recordOf(`标题${i}`)))
    }
    const t0 = performance.now()
    const cache = getSessionProjCache({})
    const constructMs = performance.now() - t0
    // 全量读取 200 个文件通常需数十毫秒；惰性构造应远快于此
    assert.ok(constructMs < 20, `构造耗时 ${constructMs.toFixed(2)}ms，疑似全量读取`)
    // 按 id 取值仍然正确
    assert.equal(cache['s7']?.rows?.title?.val, '标题7')
  })
})

// ---------- 第三方接管存储域（@michengai/dsh-archive-manager 实测场景） ----------

/** 复刻该插件的存储键：session_<base64url(sha256(sessionId))> */
const takeoverFileName = (id) => `session_${createHash('sha256').update(id, 'utf8').digest('base64url')}.json`

test('第三方接管域（改名 + 哈希文件名）：标题仍可读出，不退化成「新会话」', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache_archive_manager_v2', 'sessions')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, takeoverFileName('session-a736c38e')), JSON.stringify(recordOf('修复飞书')))

    const cache = getSessionProjCache({})
    assert.equal(cache['session-a736c38e']?.rows?.title?.val, '修复飞书')
  })
})

test('官方裸 id 命名与第三方哈希命名并存时，两者都能读出', () => {
  withHome((home) => {
    const legacyDir = join(home, 'storages', 'session_projcache', 'sessions')
    const takeoverDir = join(home, 'storages', 'session_projcache_archive_manager_v2', 'sessions')
    mkdirSync(legacyDir, { recursive: true })
    mkdirSync(takeoverDir, { recursive: true })
    // 老会话在官方目录（裸 id），新会话被搬到第三方目录（哈希名）
    writeFileSync(join(legacyDir, 'session-old.json'), JSON.stringify(recordOf('老会话标题')))
    writeFileSync(join(takeoverDir, takeoverFileName('session-new')), JSON.stringify(recordOf('新会话标题')))

    const cache = getSessionProjCache({})
    assert.equal(cache['session-old']?.rows?.title?.val, '老会话标题', '官方裸 id 命名必须仍可读')
    assert.equal(cache['session-new']?.rows?.title?.val, '新会话标题', '第三方哈希命名必须可读')
  })
})

test('v1 时代的旧域名（session_projcache_archive_manager）同样兼容', () => {
  withHome((home) => {
    const dir = join(home, 'storages', 'session_projcache_archive_manager', 'sessions')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, takeoverFileName('sess-v1')), JSON.stringify(recordOf('v1 域标题')))

    assert.equal(getSessionProjCache({})['sess-v1']?.rows?.title?.val, 'v1 域标题')
  })
})

// ---------- formatGoalTitle：ver6（0.1.7+）goal fold 投影形态 ----------
// 新布局 rows.goal.val 不是裸 goal，而是 fold 状态：
//   { current: { goal: { objective, ... }, roundsStarted, createdAt, updatedAt } | null,
//     seenGoalIds, failure }

const goalFoldState = (objective) => ({
  current: {
    goal: { id: 'goal-1', revision: 1, objective, phase: 'active', maxGoalRounds: 3 },
    roundsStarted: 0,
    createdAt: 1,
    updatedAt: 2,
  },
  seenGoalIds: ['goal-1'],
  failure: null,
})

test('formatGoalTitle 识别 ver6 current.goal.objective', () => {
  assert.equal(formatGoalTitle(goalFoldState('折叠目标标题')), '折叠目标标题')
})

test('formatGoalTitle 识别被包一层的 goal.current', () => {
  assert.equal(formatGoalTitle({ goal: goalFoldState('嵌套目标标题') }), '嵌套目标标题')
})

test('formatGoalTitle：current 为 null（无当前目标）时返回空串，不抛错', () => {
  const raw = { current: null, seenGoalIds: [], failure: null }
  assert.equal(formatGoalTitle(raw), '')
  assert.doesNotThrow(() => formatGoalTitle(raw))
})

test('formatGoalTitle：既有 objective/goal.objective/title 分支保持不变', () => {
  assert.equal(formatGoalTitle({ objective: '顶层目标' }), '顶层目标')
  assert.equal(formatGoalTitle({ goal: { objective: '旧版嵌套目标' } }), '旧版嵌套目标')
  assert.equal(formatGoalTitle({ title: '直接标题' }), '直接标题')
  // 既有字段优先于 ver6 current
  assert.equal(formatGoalTitle({ objective: '优先', ...goalFoldState('次选') }), '优先')
  assert.equal(formatGoalTitle('字符串目标'), '字符串目标')
})
