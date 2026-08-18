# DSH Bridge 代码规范技能

这是 DSH Bridge 项目的代码规范技能，定义了开发 DSH 插件时必须遵循的标准和最佳实践。

## 技能元信息

- **名称**: dsh-bridge-coding-standards
- **版本**: 1.0.0
- **用途**: 确保 DSH 插件代码符合规范、专业、可维护
- **适用范围**: DSH 插件开发、Cordis 框架

## 核心规范

### 1. DSH Bundle 配置（最高优先级）

#### package.json 必需字段

```json
{
  "name": "your-plugin-name",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  
  "cordis": {
    "manifest": "cordis.yml",
    "description": "Plugin description"
  },
  
  "dsh": {
    "bundle": "cordis.yml"
  },
  
  "files": [
    "index.js",
    "client/",
    "lib/",
    "cordis.yml",
    "README.md"
  ],
  
  "peerDependencies": {
    "cordis": ">=3.0.0"
  }
}
```

**关键点**：

- ✅ `dsh.bundle` 字段**必须存在**
- ✅ 值必须指向 Cordis 配置文件（通常是 `cordis.yml`）
- ✅ `files` 数组必须包含 `cordis.yml`
- ✅ 使用 ES 模块（`"type": "module"`）

**错误示例**：

```
Error: dsh: profile bundle "your-plugin" declares no dsh.bundle in its package.json
```

这表示缺少 `dsh.bundle` 声明。

### 2. 四大具名导出（必需）

每个插件文件必须正确导出：

#### export const name（必需）

```javascript
// Host 插件
export const name = 'dsh-bridge';

// Client 插件
export const name = 'dsh-bridge:client';
```

**规则**：

- 必须使用 `export const name =` 形式
- Host 和 Client 插件名称必须不同
- 建议 Client 插件使用 `:client` 后缀

#### export const inject（推荐）

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

**规则**：

- 明确声明所有服务依赖
- 优先使用 `optional` 而非 `required`
- 不要通过 `ctx.serviceName` 访问未声明的服务

#### export function apply（必需）

```javascript
export function apply(ctx, config) {
  const logger = ctx.logger('dsh-bridge');
  
  // 插件逻辑
  
  // 必须清理资源
  ctx.on('dispose', () => {
    // 清理所有副作用
  });
}
```

**规则**：

- 第一个参数是 Cordis 上下文
- 第二个参数是插件配置
- 必须在 `dispose` 事件中清理所有资源

#### export const using（可选）

```javascript
export const using = ['harness', 'database'];
```

**用途**：声明本插件需要其他插件已加载

### 3. 服务访问规范

#### 可选服务（推荐）

```javascript
export const inject = {
  optional: ['connection'],
};

export function apply(ctx, config) {
  const conn = ctx.get('connection');
  if (conn !== undefined) {
    // 使用服务
  }
}
```

#### 必需服务

```javascript
export const inject = {
  required: ['database'],
};

export function apply(ctx, config) {
  // 可以直接访问
  ctx.database.query('SELECT * FROM users');
}
```

**注意**：只有在 `inject.required` 或 `inject.optional` 中声明的服务才能通过 `ctx.serviceName` 访问。

### 4. 资源清理（必需）

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
  
  // WebSocket 连接
  const ws = new WebSocket('wss://example.com');
  
  // 必须清理所有资源
  ctx.on('dispose', () => {
    clearInterval(timer);
    server.close();
    ws.close();
  });
  
  // 或使用 ctx.effect()
  ctx.effect(() => {
    const timer = setInterval(() => {}, 30000);
    return () => clearInterval(timer);
  });
}
```

**必须清理的资源**：

- ✅ 定时器（`setInterval`, `setTimeout`）
- ✅ HTTP/HTTPS 服务器
- ✅ WebSocket 连接
- ✅ 数据库连接
- ✅ 文件句柄
- ✅ 事件监听器

### 5. 代码风格

#### ES 模块语法

```javascript
// ✅ 正确
import { createServer } from 'node:http';
import express from 'express';

// ❌ 错误
const http = require('node:http');
```

#### 命名约定

```javascript
// 变量和函数：camelCase
const serverPort = 3082;
function startServer() {}

// 类：PascalCase
class BridgeService {}

// 常量：UPPER_SNAKE_CASE
const MAX_RETRIES = 5;

// 私有成员：_前缀
class Server {
  _socket = null;
}
```

#### 错误处理

```javascript
// ✅ 完整的错误处理
export function apply(ctx, config) {
  const logger = ctx.logger('dsh-bridge');
  
  try {
    const server = createServer();
    server.listen(config.port);
    
    server.on('error', (err) => {
      logger.error('Server error:', err);
      // 尝试恢复或重试
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    throw err;
  }
}
```

### 6. 日志记录

```javascript
export function apply(ctx, config) {
  const logger = ctx.logger('dsh-bridge');
  
  // info: 正常操作
  logger.info('Server started on port', config.port);
  
  // warn: 警告但不影响功能
  logger.warn('Using default configuration');
  
  // error: 错误但已处理
  logger.error('Failed to connect to tunnel server:', err);
  
  // 不要在循环或高频操作中记录日志
}
```

### 7. 安全规范

#### Token 认证

```javascript
// ✅ 通过查询参数传递 token
const wsUrl = `wss://tunnel.example.com?token=${encodeURIComponent(token)}`;

// ❌ 不要在 URL 路径中传递
const wsUrl = `wss://tunnel.example.com/${token}`;
```

#### Loopback-only RPC

```javascript
export function apply(ctx, config) {
  const harness = ctx.get('harness');
  if (!harness) return;
  
  // 只允许 loopback 调用
  harness.handle('bridge.getStatus', {
    authority: 'loopback',
  }, async () => {
    return { status: 'ok' };
  });
}
```

#### Host Header 重写

```javascript
// 代理请求时重写 Host 头
proxyReq.setHeader('host', '127.0.0.1');
```

### 8. 性能优化

#### 缓存

```javascript
class QrCache {
  constructor(maxSize = 8, ttl = 30 * 60 * 1000) {
    this._cache = new Map();
    this._maxSize = maxSize;
    this._ttl = ttl;
  }
  
  get(key) {
    const entry = this._cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this._ttl) {
      this._cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }
  
  set(key, value) {
    if (this._cache.size >= this._maxSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    
    this._cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }
}
```

#### 连接池

```javascript
class ConnectionPool {
  constructor(maxConnections = 10) {
    this._pool = [];
    this._maxConnections = maxConnections;
  }
  
  acquire() {
    if (this._pool.length > 0) {
      return this._pool.pop();
    }
    
    if (this._activeConnections < this._maxConnections) {
      return this._createConnection();
    }
    
    return this._waitForConnection();
  }
  
  release(conn) {
    this._pool.push(conn);
  }
}
```

### 9. 测试规范

```javascript
// test/basic.mjs
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('token generation', () => {
  const token = generateToken();
  assert.equal(typeof token, 'string');
  assert.equal(token.length, 32);
});

test('URL validation', () => {
  assert.ok(isValidUrl('https://example.com'));
  assert.ok(!isValidUrl('not-a-url'));
});
```

**测试要求**：

- ✅ 测试核心功能
- ✅ 测试边界条件
- ✅ 测试错误处理
- ✅ 所有测试必须通过

### 10. 文档规范

#### README.md

必须包含：

- 项目简介
- 功能列表
- 安装步骤
- 配置说明
- 使用示例
- 架构图
- 常见问题
- 许可证

#### 代码注释

```javascript
/**
 * 创建反向隧道客户端
 * @param {string} serverUrl - WebSocket 服务器地址
 * @param {string} token - 认证令牌
 * @param {object} options - 可选配置
 * @returns {CustomTunnelClient} 隧道客户端实例
 */
export function createTunnelClient(serverUrl, token, options = {}) {
  // 复杂逻辑需要注释
}
```

**注释原则**：

- 公共 API 必须有 JSDoc 注释
- 复杂算法必须解释思路
- 简单代码不需要注释（代码自解释）

## 检查清单

开发前检查：

- [ ] 已阅读 DSH 插件开发文档
- [ ] 已理解 Cordis 框架概念
- [ ] 已查看现有插件示例

编码时检查：

- [ ] `package.json` 包含 `dsh.bundle` 字段
- [ ] 使用 `export const name =` 导出插件名
- [ ] 在 `inject` 中声明所有依赖
- [ ] 在 `dispose` 中清理所有资源
- [ ] 使用 ES 模块语法
- [ ] 完整的错误处理
- [ ] 适当的日志记录

提交前检查：

- [ ] 所有测试通过
- [ ] 代码格式规范
- [ ] 文档完整
- [ ] 无安全隐患
- [ ] `cordis.yml` 配置正确
- [ ] `files` 数组包含所有必需文件

## 常见错误及解决方法

### 错误 1: 缺少 dsh.bundle

```
Error: dsh: profile bundle "xxx" declares no dsh.bundle in its package.json
```

**解决**：在 `package.json` 中添加：

```json
"dsh": {
  "bundle": "cordis.yml"
}
```

### 错误 2: 插件名称冲突

```
Error: Plugin 'xxx' is already registered
```

**解决**：确保 Host 和 Client 使用不同名称：

```javascript
// Host
export const name = 'dsh-bridge';

// Client
export const name = 'dsh-bridge:client';
```

### 错误 3: 访问未声明的服务

```
TypeError: Cannot read property 'xxx' of undefined
```

**解决**：在 `inject` 中声明服务：

```javascript
export const inject = {
  optional: ['connection'],
};
```

### 错误 4: 资源泄漏

**现象**：内存持续增长，连接数不断增加

**解决**：在 `dispose` 中清理所有资源：

```javascript
ctx.on('dispose', () => {
  clearInterval(timer);
  server.close();
  ws.close();
});
```

## 参考资源

- [DSH 插件开发文档](https://github.com/deepseek-ai/deepseek-harness/blob/HEAD/docs/user/develop/basic/index.md)
- [Cordis 框架文档](https://cordisjs.org/)
- [DSH Bundle 规范](../docs/DSH_BUNDLE.md)
- [完整代码规范](../CODE_STANDARDS.md)

## 技能使用方法

当开发 DSH 插件时，始终：

1. 首先检查 `package.json` 是否包含 `dsh.bundle`
2. 确保使用四大具名导出
3. 在 `inject` 中声明所有依赖
4. 在 `dispose` 中清理所有资源
5. 遵循代码风格和命名约定
6. 编写测试并确保通过
7. 提供完整的文档

---

**技能版本**: 1.0.0  
**最后更新**: 2025-01-18  
**维护者**: wenbin-wb
