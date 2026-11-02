// 回归测试：平台高级设置草稿必须回填「界面会读到的每一个字段」（issue #77）
//
// 背景：设置页把平台配置拷进本地草稿 cfgDraft，控件读的是 cfgDraft 而不是
// status.config。草稿初始化漏字段时，控件恒显示默认值：功能其实已经开启
// （磁盘 config.json 写成功、开关也确实生效），但 UI 看不出来，也没法从 UI 关掉。
// issue #77 的最后一层就是 `showActivity` 漏在初始化之外——飞书 / Telegram 共用这段代码。
//
// 这里断言的是结构不变量：client/index.js 里每个 `cfgDraft?.X` 读取，都必须在
// `setCfgDraft({ ... })` 初始化对象里有同名 key；产物 client/client.js 也必须同步
// （改了源码却漏跑 `npm run build:client` 时，第二条会失败）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = readFileSync(resolve(repoRoot, 'client/index.js'), 'utf8');
const bundle = readFileSync(resolve(repoRoot, 'client/client.js'), 'utf8');

/**
 * 取出第一处 `setCfgDraft({ ... })` 初始化对象的 key 集合。
 *
 * 初始化对象里只有标量表达式（没有嵌套对象字面量），所以找第一个 `});` 收尾即可。
 * @param {string} source - 待解析的源码或产物
 * @returns {Set<string>} 初始化对象里的字段名
 */
function draftInitKeys(source) {
  const start = source.indexOf('setCfgDraft({');
  assert.notEqual(start, -1, '未找到 cfgDraft 初始化对象');
  const end = source.indexOf('});', start);
  assert.notEqual(end, -1, 'cfgDraft 初始化对象未闭合');
  const block = source.slice(start, end);
  return new Set([...block.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]));
}

test('每个 cfgDraft 读取字段都在初始化对象里（issue #77 回归）', () => {
  const keys = draftInitKeys(indexSource);
  const reads = new Set([...indexSource.matchAll(/cfgDraft\?\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
  assert.ok(reads.size > 0, '未找到任何 cfgDraft 读取点，测试前提不成立');
  const missing = [...reads].filter((key) => !keys.has(key));
  assert.deepEqual(missing, [], `草稿初始化缺少字段：${missing.join(', ')}——对应控件会永远显示默认值`);
});

test('产物 client/client.js 的草稿初始化与源码同步（需 npm run build:client）', () => {
  const keys = draftInitKeys(bundle);
  assert.ok(keys.has('showActivity'), '产物缺少 showActivity：改了 client/index.js 但没重新构建 client/client.js');
  for (const key of draftInitKeys(indexSource)) {
    assert.ok(keys.has(key), `产物草稿初始化缺少 ${key}，请重新运行 npm run build:client`);
  }
});
