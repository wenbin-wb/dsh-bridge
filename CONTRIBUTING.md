# 贡献指南

感谢您对 DSH Bridge 项目的关注！本文档提供贡献的指南和说明。

## 行为准则

- 尊重他人，包容多元
- 专注于建设性反馈
- 帮助维护友好的环境

## 开始贡献

### 环境要求

- Node.js >= 18.0.0
- Git
- 基本了解 DSH 和 Cordis 插件

### 开发环境设置

```bash
# Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/dsh-bridge.git
cd dsh-bridge

# 安装依赖
npm install

# 运行测试
npm test

# 链接到本地开发
npm link
cd /path/to/your/dsh
npm link dsh-bridge
```

## 开发流程

### 1. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 2. 进行修改

- 遵循现有代码风格
- 为新功能添加测试
- 更新相关文档
- 保持提交原子化且有意义

### 3. 测试修改

```bash
# 运行测试
npm test

# 使用 DSH 手动测试
# 启动链接了插件的 DSH
dsh
```

### 4. 提交代码

使用清晰、描述性的提交信息（中文）：

```
feat: 添加 Telegram 机器人集成
fix: 修复连接超时问题
docs: 更新部署指南
refactor: 改进隧道客户端错误处理
```

### 5. 推送并创建 PR

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request，包含：
- 清晰的标题和描述
- 引用相关 issue
- UI 变更的截图
- 测试结果

## 代码规范

### 通用原则

- **清晰优于聪明**: 编写易于理解的代码
- **生产级标准**: 错误处理、日志记录、优雅降级
- **类型安全**: 在有帮助的地方使用 JSDoc 类型提示
- **清晰架构**: 关注点分离、依赖注入

### JavaScript 风格

```javascript
// 使用现代 JavaScript
const { feature } = await import('./module.mjs');

// 描述性命名
function calculateBestLanIp() { ... }

// 错误处理
try {
  await riskyOperation();
} catch (err) {
  logger.error('操作失败: %s', err.message);
  throw new Error(`完成失败: ${err.message}`);
}

// 为复杂逻辑添加注释
// 基于以下因素计算网络接口评分：
// 1. 私有 IP 范围（最高优先级）
// 2. 物理 vs 虚拟接口
// 3. 以太网 vs WiFi
```

### UI 组件

```javascript
// 不使用 JSX 的 React
React.createElement('div', {
  style: { padding: '20px' }
},
  React.createElement('h1', null, '标题')
)

// 优雅的生产级设计
// - 温暖大地色调（#C4612F, #F7F4EF）
// - 圆角按钮（999px）
// - 清晰的层级
// - 实时反馈
```

## 测试

### 单元测试

```javascript
// test/feature.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('功能', () => {
  it('应该正常工作', () => {
    assert.strictEqual(result, expected);
  });
});
```

### 集成测试

测试完整工作流：
- 隧道连接和重连
- QR 码生成和缓存
- RPC 通信
- 错误恢复

### 手动测试

1. 测试所有访问方式（局域网、Cloudflare、自建）
2. 测试不同平台（Windows、macOS、Linux）
3. 测试不同浏览器上的 UI
4. 测试移动设备访问

## 文档

### 代码文档

```javascript
/**
 * 连接到隧道服务器，支持自动重连
 * @throws {Error} 如果服务器 URL 或 token 无效
 */
async connect() { ... }
```

### 用户文档

- 为新功能更新 README.md
- 添加示例和使用场景
- 包含故障排除步骤
- 更新 CHANGELOG.md

## 添加新功能

### 机器人集成

添加新机器人的结构：

```javascript
// lib/bots/telegram-bot.mjs
export class TelegramBot {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
  }
  
  async start() {
    // 初始化机器人
  }
  
  async handleCommand(command, args) {
    // 处理命令
  }
  
  async sendNotification(message) {
    // 发送消息
  }
  
  stop() {
    // 清理资源
  }
}
```

在 `index.js` 中注册：

```javascript
if (config.telegram?.enabled) {
  const bot = new TelegramBot(ctx, config.telegram);
  ctx.provide('telegram', bot);
  await bot.start();
}
```

在 `client/index.js` 中添加 UI：

```javascript
React.createElement(BotCard, {
  ctx,
  title: 'Telegram 机器人',
  description: '通过 Telegram 接收通知',
  status: status.telegram,
  onStart: () => handleAction('startTelegram'),
  onStop: () => handleAction('stopTelegram'),
})
```

### 访问通道

对于新的隧道类型，遵循以下模式：

1. 在 `lib/` 中创建管理器类
2. 集成到 `BridgeService`
3. 添加 RPC 端点
4. 在客户端添加 UI 卡片
5. 更新文档

## Pull Request 指南

### 提交前检查

- [ ] 所有测试通过
- [ ] 代码遵循风格指南
- [ ] 文档已更新
- [ ] CHANGELOG.md 已更新
- [ ] 生产代码中无 console.log()（使用 logger）
- [ ] 错误信息对用户友好

### PR 描述模板

```markdown
## 描述
变更的简要说明

## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 破坏性变更
- [ ] 文档更新

## 测试
- [ ] 单元测试已添加/更新
- [ ] 集成测试已添加/更新
- [ ] 手动测试已完成

## 截图（如适用）
[为 UI 变更添加截图]

## 检查清单
- [ ] 代码遵循风格指南
- [ ] 文档已更新
- [ ] 测试通过
- [ ] CHANGELOG 已更新
```

## 发布流程

维护者遵循语义化版本：

- **主版本（1.0.0）**：破坏性变更
- **次版本（0.1.0）**：新功能，向后兼容
- **补丁版本（0.0.1）**：Bug 修复

## 有疑问？

- 提交 [issue](https://github.com/wenbin-wb/dsh-bridge/issues)
- 发起 [讨论](https://github.com/wenbin-wb/dsh-bridge/discussions)

## 许可证

通过贡献，您同意您的贡献将在 MIT License 下授权。

---

感谢您为 DSH Bridge 做出贡献！
