# DSH Bridge 代码规范

## 核心原则

本项目严格遵循 **Cordis 插件开发规范**和 **DSH 插件最佳实践**，确保代码质量达到生产级标准。

## DSH 插件开发规范

### 1. 四大具名导出

DSH 插件必须提供以下具名导出：

```javascript
// ✅ 正确：所有必需的具名导出
export const name = 'dsh-bridge';           // 插件名称
export const inject = ['service'];          // 依赖注入（可选）
export const filter = false;                // 过滤器（可选）
export function apply(ctx, config) {        // 应用函数（必需）
  // 插件逻辑
}
```

```javascript
// ❌ 错误：使用 default export
export default function(ctx, config) { }
```

### 2. 插件形态与运行面

DSH 插件分为两种形态：

#### Host 插件（服务端）
- 文件位置：`index.js`
- 运行环境：Node.js
- 职责：文件操作、网络请求、进程管理、服务提供
- 命名：`export const name = 'plugin-name'`

#### Client 插件（浏览器端）
- 文件位置：`client/index.js`
- 运行环境：浏览器
- 职责：UI 渲染、用户交互、RPC 调用
- 命名：`export const name = 'plugin-name:client'`

```javascript
// ✅ 正确：明确区分 Host 和 Client
// index.js (Host)
export const name = 'dsh-bridge';
export function apply(ctx, config) {
  // 服务端逻辑
}

// client/index.js (Client)
export const name = 'dsh-bridge:client';
export function apply(ctx) {
  // 浏览器端逻辑
}
```

### 3. 依赖注入

使用 `inject` 声明硬依赖，使用 `ctx.get()` 获取可选服务：

```javascript
// ✅ 正确：区分硬依赖和可选依赖
export const inject = ['database'];  // 硬依赖

export function apply(ctx, config) {
  const db = ctx.database;  // 硬依赖可以直接访问
  const optional = ctx.get('optional-service');  // 可选依赖
  
  if (optional) {
    // 使用可选服务
  }
}
```

```javascript
// ❌ 错误：未声明就直接访问
export function apply(ctx, config) {
  ctx.database.query();  // 如果 database 不存在会报错
}
```

### 4. 生命周期管理

使用 `ctx.effect()` 和 `ctx.on()` 确保资源正确清理：

```javascript
// ✅ 正确：使用 effect 注册清理函数
export function apply(ctx, config) {
  const server = createServer();
  
  ctx.effect(() => {
    server.close();  // 插件停止时自动调用
  });
  
  // 监听事件
  ctx.on('ready', () => {
    server.start();
  });
  
  ctx.on('dispose', () => {
    // 清理资源
  });
}
```

```javascript
// ❌ 错误：没有清理资源
export function apply(ctx, config) {
  const server = createServer();
  server.start();
  // 插件停止后服务器继续运行，导致内存泄漏
}
```

### 5. 服务提供

使用 `ctx.provide()` 提供服务给其他插件：

```javascript
// ✅ 正确：提供服务
export function apply(ctx, config) {
  const service = new MyService();
  ctx.provide('myService', service);
  
  ctx.on('dispose', () => {
    service.cleanup();
  });
}
```

### 6. RPC 通信

Host 到 Client 使用 RPC：

```javascript
// ✅ 正确：RPC 通信模式
// lib/rpc.js
export const RPC_CHANNEL = 'my-plugin';
export const ENDPOINTS = {
  getData: 'getData',
};

// index.js (Host)
export function apply(ctx, config) {
  ctx.connection.rpc.handle(
    RPC_CHANNEL,
    async (endpoint, payload, signal) => {
      if (endpoint === ENDPOINTS.getData) {
        return { ok: true, value: data };
      }
      return { ok: false, error: { code: 'bad-request', message: 'Unknown endpoint' } };
    },
    { authority: 'loopback' }  // 安全限制
  );
}

// client/index.js (Client)
export function apply(ctx) {
  const connection = ctx.get('connection');
  const result = await connection.rpc.call(RPC_CHANNEL, ENDPOINTS.getData);
  
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  
  return result.value;
}
```

## 代码风格规范

### 1. 文件组织

```
plugin-name/
├── index.js                  # Host 插件入口
├── client/
│   └── index.js             # Client 插件入口
├── lib/
│   ├── rpc.js               # RPC 接口定义
│   ├── service.js           # 服务实现
│   └── utils.js             # 工具函数
├── test/
│   └── index.test.js        # 测试文件
├── cordis.yml               # 插件配置
├── package.json             # 包配置
└── README.md                # 文档
```

### 2. 命名规范

#### 文件命名
- 使用 kebab-case：`tunnel-client.mjs`、`bridge-rpc.js`
- 模块文件使用 `.mjs` 后缀（ES 模块）
- 配置文件使用 `.yml` 后缀

#### 变量命名
```javascript
// ✅ 正确
const userName = 'alice';              // camelCase 用于变量
const MAX_RETRY = 5;                   // UPPER_SNAKE_CASE 用于常量
class UserService {}                   // PascalCase 用于类
function getUserData() {}              // camelCase 用于函数

// ❌ 错误
const user_name = 'alice';             // 不使用 snake_case
const maxretry = 5;                    // 常量应大写
class userService {}                   // 类应 PascalCase
```

### 3. 注释规范

```javascript
// ✅ 正确：清晰的文档注释
/**
 * Custom tunnel client with production-grade features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat monitoring
 * - Request multiplexing
 * - Graceful shutdown
 */
export class CustomTunnelClient {
  /**
   * Connect to tunnel server
   * @throws {Error} If connection fails or is aborted
   */
  async connect() {
    // Implementation
  }
}

// ❌ 错误：冗余或无意义的注释
// This function adds two numbers
function add(a, b) {
  return a + b;  // Return the sum
}
```

### 4. 错误处理

```javascript
// ✅ 正确：完整的错误处理
export function apply(ctx, config) {
  const logger = ctx.logger('plugin-name');
  
  try {
    // 操作
  } catch (err) {
    logger.error('Operation failed: %s', err.message);
    throw err;  // 向上传播
  }
}

// RPC 错误处理
function fail(code, message, details = {}) {
  return {
    ok: false,
    error: {
      code,
      message,
      details: { issues: [{ message }], ...details },
    },
  };
}
```

### 5. 异步处理

```javascript
// ✅ 正确：使用 async/await
async function startServer() {
  await server.listen(port);
  logger.info('Server started on port %d', port);
}

// ✅ 正确：Promise 包装回调
function listenAsync(server, port) {
  return new Promise((resolve, reject) => {
    server.listen(port, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// ❌ 错误：回调地狱
server.listen(port, (err) => {
  if (err) throw err;
  database.connect((err) => {
    if (err) throw err;
    // 嵌套太深
  });
});
```

### 6. 模块导入

```javascript
// ✅ 正确：Node.js 内置模块使用 node: 前缀
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

// ✅ 正确：第三方库
import QRCode from 'qrcode';
import { WebSocket } from 'ws';

// ✅ 正确：本地模块
import { installBridgeRpc } from './lib/bridge-rpc.js';
import { CustomTunnelClient } from './lib/tunnel-client.mjs';
```

### 7. React 组件（Client）

```javascript
// ✅ 正确：使用 React.createElement，不使用 JSX
export function apply(ctx) {
  const React = ctx.get('react');
  if (!React) {
    console.warn('React unavailable');
    return;
  }
  
  function MyComponent({ title, children }) {
    const { useState } = React;
    const [count, setCount] = useState(0);
    
    return React.createElement('div', null,
      React.createElement('h1', null, title),
      React.createElement('button', {
        onClick: () => setCount(count + 1)
      }, `Count: ${count}`),
      children
    );
  }
}

// ❌ 错误：使用 JSX（会报错）
function MyComponent() {
  return <div><h1>Title</h1></div>;  // 不支持
}
```

## 安全规范

### 1. 认证与授权

```javascript
// ✅ 正确：Loopback-only RPC
ctx.connection.rpc.handle(
  CHANNEL,
  handler,
  { authority: 'loopback' }  // 只允许本地访问
);

// ✅ 正确：Token 认证
const url = new URL(serverUrl);
url.searchParams.set('token', accessToken);
```

### 2. 敏感信息

```javascript
// ✅ 正确：日志中隐藏敏感信息
logger.debug('Config: %o', {
  ...config,
  customTunnel: {
    ...config.customTunnel,
    accessToken: '***'  // 隐藏 token
  }
});

// ❌ 错误：泄露敏感信息
logger.debug('Config: %o', config);  // 可能包含 token
```

### 3. Host Header 重写

```javascript
// ✅ 正确：重写 Host header 防止攻击
const proxy = httpRequest({
  host: '127.0.0.1',
  port: dshPort,
  headers: {
    ...req.headers,
    host: `127.0.0.1:${dshPort}`  // 强制本地
  }
});

// ❌ 错误：直接转发 Host header
const proxy = httpRequest({
  host: '127.0.0.1',
  port: dshPort,
  headers: req.headers  // 可能包含恶意 Host
});
```

## 性能规范

### 1. 资源管理

```javascript
// ✅ 正确：限制缓存大小
class QRCodeCache {
  constructor(ttl = 30 * 60 * 1000, maxSize = 50) {
    this.cache = new Map();
    this.ttl = ttl;
    this.maxSize = maxSize;
  }
  
  async get(text) {
    // 检查 TTL
    // 限制大小
  }
}

// ❌ 错误：无限制缓存
const cache = new Map();  // 可能内存泄漏
```

### 2. 连接管理

```javascript
// ✅ 正确：跟踪活动连接
this.activeConnections = 0;

proxy.on('end', () => {
  this.activeConnections--;
});

// ✅ 正确：设置超时
const timer = setTimeout(() => {
  reject(new Error('Timeout'));
}, 15000);
```

## 测试规范

```javascript
// ✅ 正确：完整的测试用例
import { strict as assert } from 'node:assert';

async function testServiceInitialization() {
  const service = new BridgeService(ctx, config);
  await service.start();
  
  assert(service.proxyRunning, 'Proxy should be running');
  assert.strictEqual(typeof service.getStatus, 'function');
  
  await service.stop();
}
```

## 文档规范

### 1. README 结构

- 概述（中文在前）
- 核心特性
- 快速开始
- 配置说明
- 架构图
- 安全性
- 路线图
- 许可证

### 2. 代码注释

- 文件头部说明用途
- 类和函数添加 JSDoc
- 复杂逻辑添加内联注释
- 不写冗余注释

### 3. CHANGELOG

- 按版本组织
- 分类：新增、修复、变更、移除
- 不写不准确的日期

## 禁止事项

### ❌ 绝对禁止

1. **使用 TypeScript/JSX**：代码不经过编译，必须是纯 JavaScript
2. **直接访问未注入的服务**：必须先用 `inject` 声明或 `ctx.get()` 检查
3. **忘记清理资源**：所有副作用必须可逆
4. **泄露敏感信息**：日志、错误消息不能包含 token/密码
5. **使用 CommonJS**：必须使用 ES 模块（`import`/`export`）
6. **忽略错误**：所有错误必须记录和处理
7. **阻塞操作**：避免同步 I/O，使用异步 API

### ⚠️ 谨慎使用

1. `process.exit()`：可能导致 DSH 崩溃
2. 全局变量：污染命名空间
3. `console.log()`：应使用 `ctx.logger()`
4. 长时间运行的同步操作：阻塞事件循环

## 代码审查清单

在提交代码前，检查以下项目：

- [ ] 使用四大具名导出（`name`、`apply`、可选的 `inject`、`filter`）
- [ ] Host/Client 插件分离清晰
- [ ] 所有资源有清理机制（`ctx.effect()`）
- [ ] RPC 使用 `loopback` 权限
- [ ] 敏感信息被隐藏或加密
- [ ] 错误有完整的日志记录
- [ ] 异步操作使用 `async/await`
- [ ] 测试通过
- [ ] 文档完整且准确
- [ ] 无 TypeScript/JSX 语法
- [ ] 使用 `node:` 前缀导入内置模块

## 参考资源

- [DSH 插件开发文档](https://github.com/deepseek-ai/deepseek-harness/blob/HEAD/docs/user/develop/basic/index.md)
- [Cordis 框架文档](https://cordis.js.org/)
- [本项目 README](./README.md)
- [架构文档](./docs/STRUCTURE.md)

---

**记住**：代码质量要超越 dsh-pocket，以生产交付标准为准。
