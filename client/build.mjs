// dsh-bridge 客户端打包：client/index.js → client/client.js
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(sourceDir, '..');
const outputPath = resolve(packageRoot, 'client/client.js');
const loaderId = 'dsh-bridge';

const result = await build({
  entryPoints: [resolve(sourceDir, 'index.js')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome100'],
  external: ['react', 'react/jsx-runtime'],
  write: false,
  minify: process.env.NODE_ENV === 'production',
  legalComments: 'none',
});

const bundled = result.outputFiles?.[0]?.text;
if (!bundled) throw new Error('esbuild did not produce a client bundle');

const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(loaderId)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
${bundled}
    return module.exports;
  }
});
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, wrapped, 'utf8');
console.log(`Wrote ${outputPath}`);
