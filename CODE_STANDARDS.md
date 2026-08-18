# DSH Bridge 代码规范

本文档定义了 DSH Bridge 项目的代码规范，基于 DSH 插件开发规范和 Cordis 框架约定。

## 目录

- [核心原则](#核心原则)
- [DSH 插件规范](#dsh-插件规范)
- [代码风格](#代码风格)
- [架构规范](#架构规范)
- [安全规范](#安全规范)
- [测试规范](#测试规范)
- [文档规范](#文档规范)

## 核心原则

### 1. 生产级质量

- 代码必须达到生产交付标准
- 完善的错误处理和边界检查
- 详细的日志记录（info/warn/error）
- 优雅的资源清理和关闭

### 2. 专业性

- 代码清晰、可读、易维护
- 命名规范、语义明确
- 适当的注释（复杂逻辑必须注释）
- 遵循 JavaScript/Node.js 最佳实践

### 3. 差异化

- 创新的功能设计
- 高质量的实现
- 优秀的用户体验
- 不照搬其他项目

## DSH 插件规范

基于 [DSH 插件开发文档](https://github.com/deepseek-ai/deepseek-harness/blob/HEAD/docs/user/develop/basic/index.md)。

### 1. 四大具名导出（必须）

每个插件必须正确导出以下内容：

#### `export const name`（必需）

```javascript
export const name = 'dsh-bridge';  // Host 插件
export const name = 'dsh-bridge:client';  // Client 插件
```

- 必须使用 `export const name` 而非 `const name; export { name }`
- Host 和 Client 插件名称必须不同
- 建议 Client 插件使用 `:client` 后缀

#### `export const inject`（推荐）

```javascript
// 无依赖
export const inject = {
  optional: [],
};

// 可选依赖
export const inject = {
  optional: ['connection', 'harness'],
};

// 必需依赖
export const inject = {
  required: ['database'],
};
```

- 明确声明服务依赖
- 使用 `optional` 处理可选服务
- 使用 `required` 处理必需服务
- 不要通过 `ctx.serviceName` 访问未声明的服务

#### `export function apply`（必需）

```javascript
export function apply(ctx, config) {
  const logger = ctx.logger('dsh-bridge');
  
  // 插件逻辑
  
  // 返回清理函数
  ctx.on('dispose', () => {
    // 清理资源
  });
}
```

- 第一个参数是 Cordis 上下文 `ctx`
- 第二个参数是插件配置 `config`
- 必须正确清理资源（使用 `ctx.on('dispose', ...)` 或 `ctx.effect()`）

#### `export const using`（可选）

```javascript
export const using = ['harness', 'database'];
```

- 声明本插件需要其他插件已加载
- 用于控制插件加载顺序

### 2. 插件形态

#### Host 插件

运行在 Node.js 进程中：

```javascript
// index.js
export const name = 'dsh-bridge';

export const inject = {
  optional: ['connection'],
};

export function apply(ctx, config) {
  // Host 端逻辑：文件、网络、系统调用
}
```

#### Client 插件

运行在浏览器中：

```javascript
// client/index.js
export const name = 'dsh-bridge:client';

export const inject = {
  optional: [],
};

export function apply(ctx, config) {
  // Client 端逻辑：React UI、浏览器 API
}
```

### 3. 服务访问规范

#### 可选服务（推荐）

```javascript
export const inject = {
  optional: ['connection'],
};

export function apply(ctx, config) {
  const connection = ctx.get('connection');
  if (connection) {
    // 使用 connection 服务
  } else {
    // 降级处理
  }
}
```

#### 必需服务

```javascript
export const inject = {
  required: ['database'],
};

export function apply(ctx, config) {
  // 直接访问（Cordis 保证服务存在）
  const db = ctx.database;
}
```

#### 错误示例

```javascript
// ❌ 错误：未声明就访问
export function apply(ctx, config) {
  ctx.someService.doSomething();  // 可能未定义
}

// ✓ 正确：先声明再访问
export const inject = {
  optional: ['someService'],
};

export function apply(ctx, config) {
  const service = ctx.get('someService');
  if (service) {
    service.doSomething();
  }
}
```

### 4. 资源清理

所有副作用必须可清理：

```javascript
export function apply(ctx, config) {
  const logger = ctx.logger('dsh-bridge');
  
  // 定时器
  const timer = setInterval(() => {
    logger.info('Heartbeat');
  }, 30000);
  
  // HTTP 服务器
  const server = createServer();
  server.listen(3082);
  
  // 清理函数
  ctx.on('dispose', () => {
    clearInterval(timer);
    server.close();
  });
  
  // 或使用 ctx.effect()
  ctx.effect(() => {
    const timer = setInterval(() => {}, 30000);
    return () => clearInterval(timer);
  });
}
```

## 代码风格

### 1. ES 模块语法

项目使用 ES 模块（`"type": "module"`）：

```javascript
// ✓ 正确
import { createServer } from 'node:http';
import express from 'express';

// ❌ 错误
const http = require('node:http');
const express = require('express');
```

### 2. 命名约定

#### 变量和函数

```javascript
// 驼峰命名
const userName = 'John';
function getUserData() {}

// 常量使用大写
const MAX_RETRIES = 5;
const API_ENDPOINT = 'https://api.example.com';
```

#### 类

```javascript
// 帕斯卡命名
class ProxyServer {}
class CustomTunnelClient {}
```

#### 私有方法

```javascript
class TunnelClient {
  // 公共方法
  connect() {}
  
  // 私有方法（下划线前缀）
  _handleMessage() {}
  _reconnect() {}
}
```

### 3. 文件结构

```javascript
// 1. 导入（按类型分组）
import { createServer } from 'node:http';  // Node.js 内置
import express from 'express';              // 第三方
import { MyClass } from './my-class.js';    // 本地

// 2. 常量
const VERSION = '1.0.0';
const MAX_RETRIES = 5;

// 3. 具名导出
export const name = 'my-plugin';
export const inject = { optional: [] };

// 4. 辅助函数
function helperFunction() {}

// 5. 类定义
class MyClass {}

// 6. 主函数
export function apply(ctx, config) {}
```

### 4. 错误处理

```javascript
// ✓ 正确：完整的错误处理
try {
  await riskyOperation();
} catch (err) {
  logger.error('Operation failed: %s', err.message);
  // 清理资源
  cleanup();
  // 重新抛出或降级处理
  throw err;
}

// ❌ 错误：吞掉错误
try {
  await riskyOperation();
} catch (err) {
  // 什么都不做
}

// ✓ 正确：Promise 错误处理
asyncOperation()
  .catch(err => {
    logger.error('Async operation failed: %s', err.message);
  });
```

### 5. 异步处理

```javascript
// ✓ 正确：使用 async/await
async function fetchData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    logger.error('Fetch failed: %s', err.message);
    throw err;
  }
}

// ✓ 正确：并发处理
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
]);
```

### 6. 日志规范

```javascript
const logger = ctx.logger('dsh-bridge');

// 正常操作
logger.info('Server started on port %d', port);

// 可恢复的问题
logger.warn('Connection lost, retrying...');

// 严重错误
logger.error('Failed to start server: %s', err.message);

// 调试信息（生产环境默认不显示）
logger.debug('Request headers: %O', headers);
```

### 7. 注释规范

```javascript
/**
 * 多行注释用于函数/类文档
 * @param {string} url - 服务器地址
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Connection>}
 */
async function connect(url, timeout) {
  // 单行注释解释复杂逻辑
  const ws = new WebSocket(url);
  
  // 复杂算法需要注释
  const score = calculateScore(interface);  // RFC1918 私有地址加分
  
  return connection;
}
```

## 架构规范

### 1. 分层架构

```
┌─────────────────────────────────────┐
│         集成层（未来）                │
│   微信、QQ、Telegram、飞书等          │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│            访问层                    │
│   局域网、Cloudflare、自建隧道        │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         服务编排层                   │
│   BridgeService、代理服务器           │
└─────────────────────────────────────┘
```

### 2. 服务编排

使用服务类统一管理状态：

```javascript
class BridgeService {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.logger = ctx.logger('dsh-bridge');
    
    // 状态集中管理
    this.proxyServer = null;
    this.customTunnel = null;
    this.cloudflared = null;
  }
  
  async start() {
    // 启动各个组件
  }
  
  async stop() {
    // 停止各个组件
  }
  
  getStatus() {
    // 返回当前状态
  }
}
```

### 3. 状态管理

```javascript
// 使用对象描述状态
const state = {
  phase: 'connecting',  // idle/connecting/connected/error
  detail: 'Connecting to server...',
  timestamp: Date.now(),
};

// 状态变更通知
onStateChange({ phase: 'connected', detail: 'Connected successfully' });
```

### 4. 依赖注入

```javascript
// ✓ 正确：通过构造函数注入
class TunnelClient {
  constructor({ serverUrl, accessToken, logger }) {
    this.serverUrl = serverUrl;
    this.accessToken = accessToken;
    this.logger = logger;
  }
}

// 使用
const client = new TunnelClient({
  serverUrl: config.serverUrl,
  accessToken: config.accessToken,
  logger: ctx.logger('tunnel'),
});
```

## 安全规范

### 1. 认证和授权

```javascript
// Token 认证
const token = req.query.token;
if (!allowedTokens.includes(token)) {
  return reject('Unauthorized');
}

// RPC 权限控制
ctx.connection.rpc.handle(
  'my-channel',
  async (method, payload) => {
    // 处理请求
  },
  { authority: 'loopback' }  // 仅本地回环
);
```

### 2. 输入验证

```javascript
// ✓ 正确：验证所有输入
function validateConfig(config) {
  if (!config.serverUrl) {
    throw new Error('serverUrl is required');
  }
  
  if (!config.serverUrl.startsWith('ws://') && 
      !config.serverUrl.startsWith('wss://')) {
    throw new Error('serverUrl must be ws:// or wss://');
  }
  
  if (config.port && (config.port < 1 || config.port > 65535)) {
    throw new Error('port must be between 1 and 65535');
  }
  
  return config;
}
```

### 3. 安全的默认值

```javascript
// ✓ 正确：安全的默认配置
const defaults = {
  proxy: {
    host: '0.0.0.0',      // 监听所有接口
    port: 3082,
  },
  tunnel: {
    reconnectAttempts: 5,  // 限制重连次数
    timeout: 15000,        // 连接超时
  },
};
```

### 4. 资源限制

```javascript
// 连接池限制
const MAX_CONNECTIONS = 100;

// 缓存限制
const MAX_CACHE_SIZE = 8;
const MAX_CACHE_AGE = 30 * 60 * 1000;  // 30 分钟

// 请求限制
const MAX_PENDING_REQUESTS = 50;
```

### 5. Host Header 重写

```javascript
// 防止 Host header 注入
const proxyHeaders = {
  ...req.headers,
  host: `127.0.0.1:${targetPort}`,  // 强制重写
};
```

## 测试规范

### 1. 测试结构

```javascript
// test/basic.mjs
console.log('DSH Bridge - Basic Tests\n');

// Test 1
console.log('✓ Test 1: Feature Name');
// 测试代码
console.log('  Result: ...\n');

// Test 2
console.log('✓ Test 2: Feature Name');
// 测试代码
console.log('  Result: ...\n');

// Summary
console.log('All tests passed! ✓');
```

### 2. 测试覆盖

必须测试：

- 核心功能（连接、断开、重连）
- 错误处理（超时、网络错误、认证失败）
- 边界条件（空输入、无效输入、极限值）
- 资源清理（内存泄漏、文件描述符）

### 3. Mock 和 Stub

```javascript
// Mock 网络接口
const mockInterfaces = {
  Ethernet: [
    { address: '192.168.1.100', internal: false, family: 'IPv4' }
  ],
};

// Stub 函数
const originalGetInterfaces = networkInterfaces;
networkInterfaces = () => mockInterfaces;

// 测试代码

// 恢复
networkInterfaces = originalGetInterfaces;
```

## 文档规范

### 1. README.md

必须包含：

- 项目概述（一句话描述）
- 核心特性（3-5 个要点）
- 快速开始（安装、配置、使用）
- 访问方式说明（详细）
- 架构图
- 常见问题
- 路线图

### 2. 代码注释

```javascript
/**
 * 启动 WebSocket 反向隧道连接
 * 
 * 实现自动重连（指数退避）和心跳监控
 * 
 * @returns {Promise<void>}
 * @throws {Error} 连接失败或超时
 */
async connect() {
  // 实现
}
```

### 3. CHANGELOG.md

```markdown
# 更新日志

## [Unreleased]

### 新增
- 功能描述

### 修复
- Bug 描述

## [1.0.0] - 2025-01-18

### 新增
- 初始版本发布
- 局域网访问支持
```

### 4. 文档语言

- 主要文档使用中文
- README.md 双语（中文为主）
- 代码注释使用中文（复杂逻辑）
- Git commit 消息使用中文

### 5. 专业性

- 不使用表情符号（emoji）
- 使用专业术语
- 清晰的结构和排版
- 准确的技术描述

## 提交规范

### 1. Commit 消息

```
<类型>: <简短描述>

<详细说明（可选）>

<关联 Issue（可选）>
```

类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：

```
feat: 添加自建隧道支持

实现 WebSocket 反向隧道客户端，支持：
- Token 认证
- 自动重连（指数退避）
- 心跳监控
- 请求多路复用

关联 #12
```

### 2. 代码审查清单

提交前检查：

- [ ] 符合 DSH 插件规范（四大导出）
- [ ] 正确声明服务依赖（inject）
- [ ] 完整的错误处理
- [ ] 资源清理（dispose 事件）
- [ ] 适当的日志记录
- [ ] 测试通过
- [ ] 文档更新
- [ ] 无 TODO/FIXME 注释

## 工具配置

### 1. package.json

```json
{
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "test": "node test/basic.mjs"
  }
}
```

### 2. .gitignore

```
node_modules/
*.log
.env
.DS_Store
dist/
```

## 参考资料

- [DSH 插件开发文档](https://github.com/deepseek-ai/deepseek-harness/blob/HEAD/docs/user/develop/basic/index.md)
- [Cordis 框架文档](https://cordis.js.org/)
- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)

## 版本历史

- 1.0.0 (2025-01-18): 初始版本

---

本文档持续更新，最后更新：2025-01-18
