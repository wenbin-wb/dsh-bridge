// 回归用例：宿主「系统内存占用」取数口径（issue #104）
//
// 问题：运维监控看板用 `totalmem() - freemem()` 计算已用内存。macOS 上
// `os.freemem()` 只统计完全空闲页，inactive / speculative / purgeable 这些
// 可回收缓存全被算成「已用」→ 32 GB 机器恒显 31.8 GB（99%），与活动监视器差
// 十几 GB，红色进度条误导用户以为内存告急。
//
// 本用例锁死：
//   1. vm_stat 解析（含引号 label、行尾句点、page size 自报）；
//   2. macOS 口径 = active + wired + compressor − purgeable；
//   3. 非 darwin 完全不变（且不拉任何子进程）；
//   4. 取数失败回退旧口径并如实标注 source（不得假装成功、也不得让看板挂掉）；
//   5. 3 秒缓存既减少子进程调用、又不会让数据永久不更新；
//   6. 百分比夹取在 0..100（异常输入不得画出越界进度条）。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  darwinUsedBytesFromVmStat,
  parseVmStat,
  readSystemMemory,
} from '../lib/platform/system-metrics.js';

const GIB = 1024 ** 3;
const PAGE = 16384;

// issue #104 报告里的真实采样（32 GB / page size 16384，单位 GiB 四舍五入到 0.1）
const ISSUE_VM_STAT = `Mach Virtual Memory Statistics: (page size of ${PAGE} bytes)
Pages free:                               13107.
Pages active:                            878182.
Pages inactive:                          878182.
Pages speculative:                            0.
Pages throttled:                              0.
Pages wired down:                        163840.
Pages occupied by compressor:            124518.
Pages purgeable:                          13107.
"Translation faults":                   2938291.
Pages copy-on-write:                     128374.
Pages zero filled:                      1203931.
`;

/** GiB → 页数（测试夹具用整数页，避免浮点误差） */
const pages = (gib) => Math.round((gib * GIB) / PAGE);

/**
 * 用指定 GiB 数构造 vm_stat 文本（只保留口径相关的页）。
 * 便于把「活动监视器应显示 17.6 GiB」写成可读的断言。
 */
function vmStat({ active, inactive = 0, speculative = 0, wired, compressor, purgeable = 0, free }) {
  return `Mach Virtual Memory Statistics: (page size of ${PAGE} bytes)
Pages free:                               ${pages(free)}.
Pages active:                             ${pages(active)}.
Pages inactive:                           ${pages(inactive)}.
Pages speculative:                        ${pages(speculative)}.
Pages wired down:                         ${pages(wired)}.
Pages occupied by compressor:             ${pages(compressor)}.
Pages purgeable:                          ${pages(purgeable)}.
`;
}

test('parseVmStat：解析自报页大小与全部页计数（含引号 label、行尾句点）', () => {
  const parsed = parseVmStat(ISSUE_VM_STAT);
  assert.equal(parsed.pageSize, PAGE);
  assert.equal(parsed.pages.pagesfree, pages(0.2));
  assert.equal(parsed.pages.pagesactive, pages(13.4));
  assert.equal(parsed.pages.pagesinactive, pages(13.4));
  assert.equal(parsed.pages.pageswireddown, pages(2.5));
  assert.equal(parsed.pages.pagesoccupiedbycompressor, pages(1.9));
  assert.equal(parsed.pages.pagespurgeable, pages(0.2));
  // 引号 label 也必须被识别（否则未来口径扩展会静默失效）
  assert.equal(parsed.pages.translationfaults, 2938291);
});

test('parseVmStat：空/畸形输入不抛错，返回空结果', () => {
  for (const bad of ['', null, undefined, 'not vm_stat output', 'Pages active: abc']) {
    const parsed = parseVmStat(bad);
    assert.equal(parsed.pageSize, null, `输入 ${JSON.stringify(bad)} 不应解析出页大小`);
  }
});

test('macOS 口径：active + wired + compressor − purgeable ≈ 活动监视器的 17.6 GiB', () => {
  const total = 32 * GIB;
  const used = darwinUsedBytesFromVmStat(parseVmStat(ISSUE_VM_STAT), total);
  assert.ok(used !== null, '必须能算出结果');
  // 夹具按 0.1 GiB 取整，允许 ±0.15 GiB 误差
  assert.ok(Math.abs(used - 17.6 * GIB) < 0.15 * GIB, `期望约 17.6 GiB，实际 ${(used / GIB).toFixed(2)} GiB`);
  // 旧口径（total − free）会得到 31.8 GiB，必须显著高于新口径
  const legacy = total - pages(0.2) * PAGE;
  assert.ok(used < legacy * 0.7, `新口径 ${(used / GIB).toFixed(1)} GiB 应远低于旧口径 ${(legacy / GIB).toFixed(1)} GiB`);
});

test('macOS 口径：purgeable 大于其它项时夹到 0，不能出现负数已用', () => {
  const used = darwinUsedBytesFromVmStat({
    pageSize: PAGE,
    pages: { pagesactive: 0, pageswireddown: 10, pagesoccupiedbycompressor: 0, pagespurgeable: 500 },
  }, 32 * GIB);
  assert.equal(used, 0);
});

test('macOS 口径：取不到页大小/关键页计数时返回 null（交调用方回退，不把解析失败当"内存全空"）', () => {
  assert.equal(darwinUsedBytesFromVmStat({ pageSize: null, pages: { pagesactive: 100 } }, 32 * GIB), null);
  assert.equal(darwinUsedBytesFromVmStat({ pageSize: 0, pages: { pagesactive: 100 } }, 32 * GIB), null);
  assert.equal(darwinUsedBytesFromVmStat({ pageSize: PAGE, pages: {} }, 32 * GIB), null, '关键页计数全缺 → null');
});

test('readSystemMemory：非 darwin 保持旧口径且不拉子进程', () => {
  let execCalls = 0;
  const mem = readSystemMemory({
    platformName: 'linux',
    totalBytes: 16 * GIB,
    freeBytes: 4 * GIB,
    execImpl: () => { execCalls += 1; return ''; },
    cache: null,
  });
  assert.equal(execCalls, 0, 'Linux/Windows 上绝不 spawn vm_stat');
  assert.deepEqual(mem, {
    totalBytes: 16 * GIB,
    freeBytes: 4 * GIB,
    usedBytes: 12 * GIB,
    usedPercent: 75,
    source: 'os',
  });
  assert.equal(readSystemMemory({ platformName: 'win32', totalBytes: 8 * GIB, freeBytes: 2 * GIB, cache: null }).usedPercent, 75);
});

test('readSystemMemory：darwin 用 vm_stat 口径，且 freeBytes 由 used 反推保持自洽', () => {
  const total = 32 * GIB;
  const mem = readSystemMemory({
    platformName: 'darwin',
    totalBytes: total,
    freeBytes: pages(0.2) * PAGE, // 旧口径会得到 99%
    execImpl: () => ISSUE_VM_STAT,
    cache: null,
  });
  assert.equal(mem.source, 'vm_stat');
  assert.equal(mem.usedPercent, 55, `期望 55%（issue 期望值），实际 ${mem.usedPercent}%`);
  assert.equal(mem.freeBytes, total - mem.usedBytes, '已用 + 空闲必须等于总量');
  assert.ok(mem.usedBytes + mem.freeBytes === total);
});

test('readSystemMemory：vm_stat 取数失败 → 回退旧口径并如实标注 os-fallback', () => {
  const total = 32 * GIB;
  const free = pages(0.2) * PAGE;
  const mem = readSystemMemory({
    platformName: 'darwin',
    totalBytes: total,
    freeBytes: free,
    execImpl: () => { throw new Error('ENOENT: /usr/bin/vm_stat'); },
    cache: null,
  });
  assert.equal(mem.source, 'os-fallback');
  assert.equal(mem.usedBytes, total - free);
  assert.equal(mem.usedPercent, 99, '回退口径就是 issue 里的 99%，但必须标明来源');

  // 输出畸形同样回退
  const garbage = readSystemMemory({
    platformName: 'darwin', totalBytes: total, freeBytes: free, execImpl: () => 'garbage', cache: null,
  });
  assert.equal(garbage.source, 'os-fallback');
});

test('3 秒缓存：TTL 内复用、超时后重新取数（不会让数据永久不更新）', () => {
  const total = 32 * GIB;
  let execCalls = 0;
  const cache = { at: 0, usedBytes: null };
  const execImpl = () => { execCalls += 1; return vmStat({ active: 13.4, wired: 2.5, compressor: 1.9, purgeable: 0.2, free: 0.2 }); };

  readSystemMemory({ platformName: 'darwin', totalBytes: total, execImpl, now: 1_000, cache });
  assert.equal(execCalls, 1);

  readSystemMemory({ platformName: 'darwin', totalBytes: total, execImpl, now: 1_000 + 2_999, cache });
  assert.equal(execCalls, 1, 'TTL 内必须复用缓存（否则每次轮询都拉子进程）');

  readSystemMemory({ platformName: 'darwin', totalBytes: total, execImpl, now: 1_000 + 3_000, cache });
  assert.equal(execCalls, 2, 'TTL 到期必须重新取数（数据不得永久停在旧值）');
});

test('百分比夹取在 0..100：异常输入不得画出越界进度条', () => {
  const over = readSystemMemory({ platformName: 'linux', totalBytes: 8 * GIB, freeBytes: -1 * GIB, cache: null });
  assert.equal(over.usedPercent, 100);
  assert.ok(over.usedBytes <= over.totalBytes);

  const empty = readSystemMemory({ platformName: 'linux', totalBytes: 8 * GIB, freeBytes: 20 * GIB, cache: null });
  assert.equal(empty.usedPercent, 0);
  assert.equal(empty.usedBytes, 0);
});
