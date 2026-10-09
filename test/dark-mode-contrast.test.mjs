// 暗色主题适配回归
//
// 背景：宿主用设计令牌切换主题，同一个令牌在浅色/暗色下取值相反：
//   --dsw-alias-brand-primary            = bluish-1000 (#0f1115)  | bluish-50 (#f9fafb)
//   --dsw-alias-label-primary-foreground = bluish-00   (#ffffff)  | bluish-1000 (#0f1115)
// 因此"令牌背景 + 硬编码前景"必然在其中一套主题下低对比。历史缺陷：
//   1. 「保存访问密码 / 保存管理密码」把前景写死 #ffffff，暗色下品牌色是近白 #f9fafb → 1.05:1
//   2. 「解锁管理权限 / 立即设置密码」把背景写死 #d97706 却没给前景，浅色下继承到白字 → 3.19:1
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const rawBundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
// esbuild（charset=ascii）会把非 ASCII 输出成 \uXXXX；emoji 这类星光平面字符输出成
// \u{1F510} 码点转义，因此两种形式都要还原，否则带 emoji 的文案在产物里搜不到。
const unescapedBundle = rawBundle.replace(
  /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, braced, u, x) => String.fromCodePoint(parseInt(braced ?? u ?? x, 16)),
);

/** 从 openIndex 处的 '{' 起做花括号配平（跳过字符串字面量与注释），返回对象体。 */
function braceBody(source, openIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    // 注释里的花括号不能参与配平，否则插一行说明就会把对象边界算错
    if (ch === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i);
      i = nl < 0 ? source.length : nl;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  return null;
}

/** 取 `s.<key>` 定义的样式对象体（配平提取；非贪婪正则会把后续条目一起吞掉，实测会漏判）。 */
function styleDefBody(source, key) {
  const m = new RegExp(`\\n\\s*${key}:\\s*\\{`).exec(source);
  assert.ok(m, `未找到 s.${key} 定义`);
  const open = source.indexOf('{', m.index);
  const body = braceBody(source, open);
  assert.ok(body, `s.${key} 定义无法配平`);
  return body;
}

/** 取包含 from 位置的那个 style 对象体（向前找最近的 `style:` 及其后的 `{`）。 */
function enclosingStyleBody(source, from) {
  const start = source.lastIndexOf('style:', from);
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  if (open < 0 || open > from) return null;
  return braceBody(source, open);
}

/**
 * 取按钮文案所在按钮的 style 对象体。精确按花括号配平提取（不再用固定字符窗口——
 * 窗口没覆盖到就会退化成静默通过）；找不到含 btnPri 的样式就响亮失败。
 */
function buttonStyleBody(source, label) {
  const needle = new RegExp(`['"]${label}['"]`, 'g');
  let m;
  while ((m = needle.exec(source)) !== null) {
    const body = enclosingStyleBody(source, m.index);
    if (body && body.includes('btnPri')) return body;
  }
  assert.fail(`未找到 ${label} 的 style 对象（含 ...s.btnPri）——文案或样式结构已变，请同步本测试`);
}

/**
 * 按逗号切分 style 体的顶层成员，跳过字符串与括号（`var(--x, #fff)` 里的逗号
 * 不能切断、三元里的冒号不能当属性分隔）。
 */
function topLevelProps(body) {
  const parts = [];
  let cur = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (quote) {
      if (c === '\\') { i += 1; cur += c; continue; }
      if (c === quote) quote = null;
      cur += c;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    // 注释里的冒号（如 `3.77:1`）不能当属性分隔，逗号也不能切断属性
    if (c === '/' && body[i + 1] === '/') {
      while (i < body.length && body[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && body[i + 1] === '*') {
      i = body.indexOf('*/', i + 2);
      if (i < 0) break;
      i += 1;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  const props = {};
  for (const part of parts) {
    let q = null;
    for (let i = 0; i < part.length; i += 1) {
      const c = part[i];
      if (q) { if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === ':') {
        const key = part.slice(0, i).trim();
        if (/^[A-Za-z_$][\w$]*$/.test(key)) props[key] = part.slice(i + 1).trim();
        break;
      }
    }
  }
  return props;
}

const HAS_TOKEN = (v) => /var\(--dsw-/.test(v ?? '');

test('安全认证页：保存访问密码 / 保存管理密码按钮的前景必须随主题翻转', () => {
  for (const label of ['保存访问密码', '保存管理密码']) {
    const body = buttonStyleBody(indexSource, label);
    assert.match(body, /\.\.\.s\.btnPri/, `${label} 应继承 s.btnPri 的主题前景色`);
    // 背景在"品牌底"与"成功态纯色底"之间切换：前景也必须是切换式
    // （品牌分支走令牌 → 暗色下品牌底是近白、前景相应变深；成功分支写死纯色对）。
    const fg = topLevelProps(body).color ?? '';
    assert.match(
      fg,
      /var\(--dsw-alias-/,
      `${label} 的 color 必须含主题令牌：暗色主题下品牌底是近白 #f9fafb，写死白字会不可见（实际 color: ${fg}）`,
    );
  }
});

test('警示按钮（解锁管理权限 / 立即设置密码）必须成对使用琥珀令牌', () => {
  for (const label of ['🔑 解锁管理权限', '🔐 立即设置密码']) {
    const body = buttonStyleBody(indexSource, label);
    assert.match(body, /\.\.\.s\.btnWarn/, `${label} 应使用 s.btnWarn 的琥珀底 + 深色字`);
    assert.doesNotMatch(body, /background:\s*['"]#/, `${label} 不得硬编码背景色`);
  }
  // s.btnWarn 本身必须是"琥珀底 + 与底色配套的深色字"（amber-500 / amber-900，两主题 7.2:1）。
  // 用配平提取：非贪婪正则 `\{([\s\S]*?)\n\s*\},` 会一路吞到后面的条目，导致断言形同虚设。
  const warnDef = styleDefBody(indexSource, 'btnWarn');
  assert.match(warnDef, /background:\s*'var\(--dsw-alias-state-warn-primary/, 's.btnWarn 背景应用琥珀令牌');
  assert.match(warnDef, /color:\s*'var\(--dsw-static-amber-900/, 's.btnWarn 前景应用琥珀深色令牌');
});

test('通用不变式：主按钮的背景与前景必须成对翻转（否则另一套主题下必有低对比）', () => {
  const offenders = [];
  const re = /\.\.\.s\.btnPri/g;
  let m;
  while ((m = re.exec(indexSource)) !== null) {
    const body = enclosingStyleBody(indexSource, m.index);
    if (!body) continue;
    const props = topLevelProps(body);
    const bg = props.background;
    const fg = props.color;
    if (bg === undefined) continue; // 未覆盖背景 = 完全继承 s.btnPri，配对天然成立
    const line = indexSource.slice(0, m.index).split('\n').length;
    // 背景含 `undefined` 分支 = 该分支回落到 s.btnPri 的品牌底（令牌，随主题翻转）
    const bgFlips = HAS_TOKEN(bg) || /\bundefined\b/.test(bg ?? '');
    const fgFlips = HAS_TOKEN(fg) || fg === undefined; // 缺省 = 继承 s.btnPri 的翻转前景

    if (fg === undefined) {
      offenders.push({ line, kind: '覆盖了背景却未给前景（会继承品牌前景令牌）', background: bg.slice(0, 80) });
    } else if (bgFlips !== fgFlips) {
      // 一方随主题翻转、另一方是写死值 → 必有一套主题下前景/背景撞色
      // （bg 已在上面 continue 过未定义的情况，这里无需再与 undefined 比较）
      offenders.push({
        line,
        kind: bgFlips ? '背景随主题翻转但前景写死' : '前景随主题翻转但背景写死',
        background: bg.slice(0, 80),
        color: (fg ?? '(缺失)').slice(0, 80),
      });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `背景与前景必须成对（任一方翻转、另一方不翻转，都会在另一套主题下低对比）：${JSON.stringify(offenders, null, 2)}`,
  );
});

test('打包产物同步：两处修复都必须进 client/client.js', () => {
  for (const label of ['保存访问密码', '保存管理密码']) {
    assert.match(
      topLevelProps(buttonStyleBody(unescapedBundle, label)).color ?? '',
      /var\(--dsw-alias-/,
      `产物里 ${label} 的前景未随主题翻转，请运行 npm run build:client`,
    );
  }
  for (const label of ['🔑 解锁管理权限', '🔐 立即设置密码']) {
    assert.match(
      buttonStyleBody(unescapedBundle, label),
      /\.\.\.s\.btnWarn/,
      `产物里 ${label} 未使用 s.btnWarn，请运行 npm run build:client`,
    );
  }
  assert.match(unescapedBundle, /--dsw-alias-state-warn-primary/, '产物缺少琥珀警示令牌，请运行 npm run build:client');
});
