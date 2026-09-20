// 回归测试：添加工作区弹窗的 isSubmitting 泄漏
//
// 背景：`switchToWorkspace()`（点击弹窗里「已注册工作区」那一行/切换按钮走这里）
// 只置位 `isSubmitting = true` 而从不复位，于是同一个弹窗实例的状态被永久锁死：
// `loadDirectory()` 与 `doSubmit()` 开头的 `if (isSubmitting) return;` 守卫让
// 「点目录毫无反应」「点设为当前工作区并进入毫无反应、按钮停在正在添加并切换…」，
// 用户视角就是"添加工作区一直卡住"（关闭弹窗重新打开即恢复，因为弹窗状态每次新建）。
// 对比 `doSubmit()` 是正确写法：置位后在 `finally` 里复位。
//
// 本文件只做「结构与产物同步」断言（不需要浏览器）；真实交互行为由人工验收覆盖。
// 断言失败时优先怀疑：改了 `client/index.js` 但没跑 `npm run build:client`。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const bundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
// 产物里的中文/非 ASCII 字符被 esbuild 转成 \uXXXX（标点也可能是 \xNN），
// 反转义后才能与源码逐字比对
const unescapedBundle = bundle.replace(
  /\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, u, x) => String.fromCharCode(parseInt(u ?? x, 16)),
);

/**
 * 取出一个具名函数的完整源码（含签名）。
 *
 * 花括号按配对计数即可：本文件涉及的函数里，模板字面量的 `${...}` 自带配对的
 * `}`，不会让计数失衡。
 * @param {string} source - 待搜索的源码文本
 * @param {string} name - 函数名
 * @returns {string|null} 函数源码，未找到时为 null
 */
function functionSource(source, name) {
  const signature = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const m = signature.exec(source);
  if (!m) return null;
  const open = source.indexOf('{', m.index);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(m.index, i + 1);
    }
  }
  return null;
}

/** 取出函数末尾 `finally { ... }` 的块体，未找到时为 null */
function finallyBlock(source, name) {
  const fn = functionSource(source, name);
  if (fn === null) return null;
  // 只认真正的 `finally {`：注释里提到「finally」不算（本文件的修复注释就提到了它）
  const matches = [...fn.matchAll(/\bfinally\s*\{/g)];
  if (matches.length === 0) return null;
  const open = fn.indexOf('{', matches[matches.length - 1].index);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < fn.length; i += 1) {
    if (fn[i] === '{') depth += 1;
    else if (fn[i] === '}') {
      depth -= 1;
      if (depth === 0) return fn.slice(open + 1, i);
    }
  }
  return null;
}

test('switchToWorkspace 会在 finally 里复位 isSubmitting（不再永久锁死弹窗）', () => {
  const fn = functionSource(indexSource, 'switchToWorkspace');
  assert.ok(fn, 'client/index.js 应存在 switchToWorkspace');

  // 复位必须与置位同函数，否则守卫会永久生效
  assert.match(fn, /isSubmitting\s*=\s*true\s*;/, 'switchToWorkspace 应置位 isSubmitting');
  assert.match(
    fn,
    /if\s*\(isSubmitting\)\s*return\s*;/,
    'switchToWorkspace 开头的重入守卫应保留（防止并发切换）',
  );

  // 关键断言：复位在 finally 中，render() 抛错或将来新增的提前 return 都不会泄漏
  const guard = finallyBlock(indexSource, 'switchToWorkspace');
  assert.ok(guard, 'switchToWorkspace 必须用 finally 复位（否则任何异常路径都会泄漏）');
  assert.match(
    guard,
    /isSubmitting\s*=\s*false\s*;/,
    'switchToWorkspace 的 finally 块里必须复位 isSubmitting',
  );

  // 成功提示与关闭弹窗的既有行为不应被改动
  assert.ok(fn.includes('已切换至工作区'), 'switchToWorkspace 应保留切换成功提示');
  assert.ok(fn.includes('closeModal()'), 'switchToWorkspace 应保留关闭弹窗');
});

test('doSubmit 的置位/复位保持对称，守卫仍在（泄漏的后果正来自这些守卫）', () => {
  const fn = functionSource(indexSource, 'doSubmit');
  assert.ok(fn, 'client/index.js 应存在 doSubmit');
  assert.match(fn, /if\s*\(isSubmitting\)\s*return\s*;/, 'doSubmit 应保留重入守卫');
  assert.match(fn, /isSubmitting\s*=\s*true\s*;/, 'doSubmit 应置位 isSubmitting');
  const guard = finallyBlock(indexSource, 'doSubmit');
  assert.ok(guard, 'doSubmit 应继续用 finally 复位');
  assert.match(guard, /isSubmitting\s*=\s*false\s*;/, 'doSubmit 的 finally 块里应复位 isSubmitting');

  const loadDirectory = functionSource(indexSource, 'loadDirectory');
  assert.ok(loadDirectory, 'client/index.js 应存在 loadDirectory');
  assert.match(
    loadDirectory,
    /if\s*\(isSubmitting\)\s*return\s*;/,
    'loadDirectory 的守卫应保留（它正是被泄漏卡住的入口）',
  );
});

test('打包产物与源码同步（含本次修复、无未复位版本残留）', () => {
  const bundledFn = functionSource(unescapedBundle, 'switchToWorkspace');
  assert.ok(
    bundledFn,
    '产物缺少 switchToWorkspace，疑似忘记运行 npm run build:client',
  );
  assert.ok(
    bundledFn.includes('正在切换工作区'),
    '产物里取到的不是同一个函数（缺少切换中提示），请重新运行 npm run build:client',
  );
  assert.match(
    bundledFn,
    /finally\s*\{[\s\S]*?isSubmitting\s*=\s*false\s*;/,
    '产物里的 switchToWorkspace 未包含 finally 复位，请运行 npm run build:client',
  );
});
