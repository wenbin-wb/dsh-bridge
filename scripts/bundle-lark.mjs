import esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['node_modules/@larksuiteoapi/node-sdk/lib/index.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: {
    js: `
import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirnameFunc } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirnameFunc(__filename);
`,
  },
  outfile: 'lib/feishu/lark-bundled.mjs',
})

console.log('Bundled successfully!')
