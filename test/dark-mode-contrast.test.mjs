// 暗色主题适配回归
//
// 背景：宿主用设计令牌切换主题，同一个令牌在浅色/暗色下取值相反：
//   --dsw-alias-brand-primary           = --dsw-static-neutral-bluish-1000 (#0f1115) | bluish-50 (#f9fafb)
//   --dsw-alias-label-primary-foreground = --dsw-static-neutral-bluish-00  (#ffffff) | bluish-1000 (#0f1115)
// 因此"令牌背景 + 硬编码前景"必然在其中一套主题下低对比：安全认证页的
// 「保存访问密码 / 保存管理密码」两个按钮曾把前景写死成 #ffffff，暗色主题下
// 品牌色变成近白 #f9fafb，白字直接看不见。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const rawBundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');
const unescapedBundle = rawBundle.replace(
  /\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
  (_, u, x) => String.fromCharCode(parseInt(u ?? x, 16)),
);

/**
 * 取按钮文案前的一段窗口（覆盖该按钮的 style 对象字面量）。
 * 同一文案可能还出现在提示语里，因此只接受"窗口内含 `...s.btnPri`"的那一处；
 * 引号形式随构建器变化（源码单引号 / 产物双引号），两种都接受。
 * 取不到就直接失败——绝不允许"窗口没命中"退化成静默通过。
 */
function styleWindow(source, label, size = 900) {
  const needle = new RegExp(`['"]${label}['"]`, 'g');
  let m;
  while ((m = needle.exec(source)) !== null) {
    const block = source.slice(Math.max(0, m.index - size), m.index);
    if (block.includes('...s.btnPri')) return block;
  }
  assert.fail(
    `未能在 ${label} 前 ${size} 字符窗口内找到 ...s.btnPri：`
    + '按钮文案或样式结构已变，请同步本测试（窗口必须覆盖完整 style 对象）',
  );
}

// 覆盖 `color: '#ffffff'`、`color: 'white'` 以及条件式 `color: x ? '#ffffff' : ...`
const LITERAL_WHITE = /color:\s*[^,\n]*(?:['"]#(?:fff|ffffff)['"]|['"]white['"])/i;

test('安全认证页：保存访问密码 / 保存管理密码按钮不得硬编码前景色', () => {
  for (const label of ['保存访问密码', '保存管理密码']) {
    const block = styleWindow(indexSource, label);
    assert.match(
      block,
      /\.\.\.s\.btnPri/,
      `${label} 应继承 s.btnPri 的主题前景色（var(--dsw-alias-label-primary-foreground)）`,
    );
    assert.doesNotMatch(
      block,
      LITERAL_WHITE,
      `${label} 不得硬编码白色前景：暗色主题下 --dsw-alias-brand-primary 是近白 #f9fafb，白字不可见`,
    );
  }
});

test('通用不变式：令牌背景的主按钮不得搭配硬编码前景色', () => {
  const offenders = [];
  const re = /\.\.\.s\.btnPri/g;
  let m;
  while ((m = re.exec(indexSource)) !== null) {
    const seg = indexSource.slice(m.index, m.index + 400);
    const bg = /background:\s*([^,\n]+)/.exec(seg);
    const fg = /color:\s*[^,\n]*?['"]([^'"]+)['"]/.exec(seg);
    const isLiteralColor = fg && (fg[1].startsWith('#') || fg[1] === 'white');
    if (bg && bg[1].includes('var(--dsw-alias') && isLiteralColor) {
      offenders.push({
        line: indexSource.slice(0, m.index).split('\n').length,
        background: bg[1].trim(),
        color: fg[1],
      });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `令牌背景必须搭配令牌前景（硬编码前景会在另一套主题下低对比）：${JSON.stringify(offenders)}`,
  );
});

test('打包产物同步：两个按钮的暗色修复必须进 client/client.js', () => {
  for (const label of ['保存访问密码', '保存管理密码']) {
    const block = styleWindow(unescapedBundle, label);
    assert.doesNotMatch(
      block,
      LITERAL_WHITE,
      `产物里 ${label} 仍硬编码白色前景，请运行 npm run build:client`,
    );
  }
});
