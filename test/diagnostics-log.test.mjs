// 诊断落盘通道的单元测试（issue #92 报告人实测：宿主不落盘 logger.info）
//
// 契约：追加一行带时间戳的诊断、写不进去时绝不抛出、超过上限轮转一次、
// 默认路径跟随 $DSH_HOME。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendDiagnostic,
  defaultDiagnosticsLogPath,
  DIAGNOSTICS_LOG_MAX_BYTES,
} from '../lib/security/diagnostics-log.js';

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-diag-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('默认路径跟随 $DSH_HOME，落在 dsh-bridge 目录下', () => {
  const path = defaultDiagnosticsLogPath({ DSH_HOME: '/custom/dsh' });
  assert.match(path.replace(/\\/g, '/'), /^\/custom\/dsh\/dsh-bridge\/diagnostics\.log$/);
});

test('追加一行：带时间戳、以换行结尾、返回写入内容', () => withTempDir((dir) => {
  const filePath = join(dir, 'diagnostics.log');
  const line = appendDiagnostic('dsh-bridge: 测试诊断', {
    filePath,
    now: new Date('2026-11-03T00:00:00.000Z'),
    echo: false,
  });
  assert.equal(line, '[2026-11-03T00:00:00.000Z] dsh-bridge: 测试诊断');
  assert.equal(readFileSync(filePath, 'utf8'), `${line}\n`);
}));

test('超过上限时轮转一次，保留 .1 备份', () => withTempDir((dir) => {
  const filePath = join(dir, 'diagnostics.log');
  writeFileSync(filePath, 'x'.repeat(DIAGNOSTICS_LOG_MAX_BYTES + 1));
  appendDiagnostic('轮转后的新行', { filePath, echo: false });

  assert.ok(statSync(`${filePath}.1`).size > DIAGNOSTICS_LOG_MAX_BYTES, '旧文件应被移到 .1');
  const fresh = readFileSync(filePath, 'utf8');
  assert.match(fresh, /轮转后的新行/);
  assert.ok(statSync(filePath).size < 1024, '新文件只包含本次写入');
}));

test('目标不可写时不抛出（诊断不得影响主链路）', () => withTempDir((dir) => {
  const asDirectory = join(dir, 'not-a-file');
  mkdirSync(asDirectory); // 把目录当文件路径 → append 必然失败
  assert.doesNotThrow(() => appendDiagnostic('写不进去', { filePath: asDirectory, echo: false }));
}));

test('echo=true 时同时写 stderr', () => withTempDir((dir) => {
  const original = console.error;
  const seen = [];
  console.error = (...args) => { seen.push(args.join(' ')); };
  try {
    appendDiagnostic('需要可见的诊断', { filePath: join(dir, 'd.log') });
  } finally {
    console.error = original;
  }
  assert.equal(seen.length, 1);
  assert.match(seen[0], /需要可见的诊断/);
}));
