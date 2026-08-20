import { qqNodeHelpers } from './lib/qq/node.js';

const text = '我是 Claude Code，Anthropic 的官方 CLI 工具。我是一个开发助手，专门帮你处理软件工程任务。\n\n我的工作方式是直接动手——读取文件、编写代码、运行命令、修改配置，而不只是给建议。遇到任务时，我会先了解你的代码库现有的模式和约定，然后按照项目风格来实现。\n\n我使用 claude-opus-5 模型，目前在你的工作目录 `C:\\Users\\Administrator` 中运行。\n\n你想让我帮你做什么？';

console.log('原文长度:', text.length);
const chunks = qqNodeHelpers.splitIntoChunks(text, 2000);
console.log('分片数:', chunks.length);
chunks.forEach((c, i) => {
  console.log(`片${i} 长度: ${c.length}`);
  console.log(`片${i} 内容: ${c.slice(0, 60)}...`);
  console.log('---');
});
