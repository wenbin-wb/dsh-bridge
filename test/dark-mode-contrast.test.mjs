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

/** 覆盖 `color: '#ffffff'`、`color: 'white'` 与条件式 `color: x ? '#ffffff' : ...` */
const LITERAL_WHITE = /color:\s*[^,\n]*(?:['"]#(?:fff|ffffff)['"]|['"]white['"])/i;

test('安全认证页：保存访问密码 / 保存管理密码按钮不得硬编码前景色', () => {
  for (const label of ['保存访问密码', '保存管理密码']) {
    const body = buttonStyleBody(indexSource, label);
    assert.match(body, /\.\.\.s\.btnPri/, `${label} 应继承 s.btnPri 的主题前景色`);
    assert.doesNotMatch(
      body,
      LITERAL_WHITE,
      `${label} 不得硬编码白色前景：暗色主题下 --dsw-alias-brand-primary 是近白 #f9fafb，白字不可见`,
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

test('通用不变式：主按钮覆盖背景色时必须成对给出前景色', () => {
  const offenders = [];
  const re = /\.\.\.s\.btnPri/g;
  let m;
  while ((m = re.exec(indexSource)) !== null) {
    const body = enclosingStyleBody(indexSource, m.index);
    if (!body) continue;
    const bg = /background:\s*([^,\n]+)/.exec(body);
    const fg = /color:\s*[^,\n]*?['"]([^'"]+)['"]/.exec(body);
    const bgIsToken = Boolean(bg && bg[1].includes('var(--dsw-alias'));
    const bgIsLiteral = Boolean(bg && /^['"]#/.test(bg[1].trim()));
    const fgIsLiteral = Boolean(fg && (fg[1].startsWith('#') || fg[1] === 'white'));
    const line = indexSource.slice(0, m.index).split('\n').length;
    if (bgIsToken && fgIsLiteral) {
      offenders.push({ line, kind: '令牌背景 + 硬编码前景', background: bg[1].trim(), color: fg[1] });
    }
    if (bgIsLiteral && !fg) {
      offenders.push({ line, kind: '硬编码背景 + 未指定前景（会继承品牌前景令牌）', background: bg[1].trim() });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `背景与前景必须成对（任一方是主题令牌、另一方写死，都会在另一套主题下低对比）：${JSON.stringify(offenders)}`,
  );
});

test('打包产物同步：两处修复都必须进 client/client.js', () => {
  for (const label of ['保存访问密码', '保存管理密码']) {
    assert.doesNotMatch(
      buttonStyleBody(unescapedBundle, label),
      LITERAL_WHITE,
      `产物里 ${label} 仍硬编码白色前景，请运行 npm run build:client`,
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
