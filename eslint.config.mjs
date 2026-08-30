// eslint.config.mjs — flat config，首次接入只启用零风险规则集
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      // 生成产物，不做手工检查
      'client/client.js',
      'lib/feishu/lark-bundled.mjs',
      'coverage/**',
      'scratch/**',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      // 现存代码量大的历史问题先降级为警告，渐进清理
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // 正则字符类含多字节字符（中文标点/emoji 分隔符），语义正确，暂不逐个改写
      'no-misleading-character-class': 'warn',
    },
  },
  // 浏览器端注入面板：React 由打包包装器（client/build.mjs）注入作用域，不经过 import
  {
    files: ['client/**/*.js'],
    languageOptions: {
      globals: {
        React: 'readonly',
      },
    },
  },
  // 测试文件允许使用 node:test 相关全局
  {
    files: ['test/**/*.mjs', 'scripts/**/*.mjs', '**/*.test.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
