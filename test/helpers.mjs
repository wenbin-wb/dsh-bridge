// test/helpers.mjs —— 测试共用工具
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * 生成每个用例独立的登录会话落盘路径（临时目录）。
 * AuthManager 的登录 Session 会持久化到磁盘；测试必须注入临时路径，
 * 避免读写真实环境（~/.dsh/dsh-bridge/sessions.json）——
 * 否则用例间相互污染，改密码吊销类用例还可能误清真实设备已登录的 session。
 */
export function makeSessionsFile() {
  return join(mkdtempSync(join(tmpdir(), 'dsh-bridge-test-')), 'sessions.json')
}
