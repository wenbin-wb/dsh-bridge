import { conversationBridgeHelpers } from '../lib/platform/conversation-bridge.js';

const { splitForIM } = conversationBridgeHelpers;

const sample1 = `这是一首关于春天的四句诗：

春风拂绿柳丝长，
细雨随风润海棠。
燕子归来寻故榻，
桃花开满小桥旁。`;

console.log('--- max=20 ---');
console.log(splitForIM(sample1, 20));

console.log('--- max=2000 ---');
console.log(splitForIM(sample1, 2000));

const sample2 = `# 标题

这是第一段内容。

这是第二段内容，包含一些说明。

\`\`\`javascript
function hello() {
  console.log("world");
}
\`\`\`

这是最后一段内容。`;

console.log('--- sample2 max=2000 ---');
console.log(splitForIM(sample2, 2000));
console.log('sample2 chunks length:', splitForIM(sample2, 2000).length);
