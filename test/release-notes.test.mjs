// 发版门禁：`package.json` 的 `releaseNotes` 必须与当前版本号一致。
//
// 背景（v2.17.6 真实事故）：面板「检查更新」读的是 npm registry 上最新版本
// `package.json` 的 `releaseNotes`（见 lib/index.js 的 checkVersion()）。发版时
// 只升 `version`、漏改 `releaseNotes`，用户看到的「更新亮点」就还是上一版内容。
// registry 上的已发布元数据不可修改，只能再发一版覆盖——代价不小，所以在 CI 挡住。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'))

test('releaseNotes 的版本前缀必须与 package.json 的 version 一致', () => {
  assert.equal(typeof pkg.releaseNotes, 'string', 'releaseNotes 必须是字符串')
  const expected = `【v${pkg.version}】`
  assert.ok(
    pkg.releaseNotes.trimStart().startsWith(expected),
    `releaseNotes 必须以 ${expected} 开头（当前开头：${JSON.stringify(pkg.releaseNotes.slice(0, 24))}）。` +
    '否则客户端「更新亮点」会展示上一版内容（v2.17.6 的真实事故）',
  )
})

test('releaseNotes 至少有一条要点，且单条不超过 120 字（客户端会截断）', () => {
  const lines = pkg.releaseNotes.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const bullets = lines.slice(1).filter((line) => line.startsWith('•'))
  assert.ok(bullets.length >= 1, '至少需要一条以「•」开头的更新要点')
  for (const line of bullets) {
    assert.ok(line.length <= 120, `单条要点超过 120 字会被客户端截断：${line.slice(0, 30)}…`)
  }
})
