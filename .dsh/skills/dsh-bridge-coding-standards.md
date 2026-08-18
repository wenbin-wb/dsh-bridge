# dsh-bridge 开发规范

dsh-bridge 是一个 DeepSeek Harness (DSH) 插件，基于 Cordis 框架。

## 插件结构

```
lib/index.js              # Host 插件入口
lib/bridge-rpc.js         # RPC 端点定义与注册
lib/cloudflared-manager.mjs  # cloudflared 下载与进程管理
lib/tunnel-client.mjs     # 自建隧道 WebSocket 客户端
client/index.js           # 设置面板 React 组件（源码）
client/build.mjs          # esbuild 构建脚本
client/client.js          # 编译后的 bundle（不要手动编辑）
```

## Cordis 插件规范

### inject 格式（必须用对象格式）

```js
// ✅ 正确
const inject = { required: ['connection', 'webServer'] };
const inject = { optional: ['connection'] };
const inject = { required: ['webServer'], optional: ['harness'] };

// ❌ 旧数组格式，预览版可能不再兼容
const inject = ['connection', 'webServer'];
```

### 四大具名导出

```js
export const name = 'dsh-bridge';         // Host
export const inject = { required: [...] };
export function apply(ctx, config = {}) { ... }
// Client: export const name = 'dsh-bridge:client'
```

### logger 正确用法

inject 声明了依赖，apply 里可以直接调用，不用加 `?.` 防御：

```js
// ✅ 正确
const logger = ctx.logger(name);

// ❌ 掩盖了注入失败的问题
const logger = ctx.logger?.(name) ?? console;
```

### 资源清理（必须用 ctx.effect）

```js
ctx.effect(() => {
  const timer = setInterval(() => {}, 30000);
  return () => clearInterval(timer);
});

// 或异步清理
ctx.effect(() => async () => {
  await service.dispose();
}, '描述信息');
```

## RPC 规范

- 频道名以 `/` 开头：`/dsh-bridge`
- 必须加 `{ authority: 'loopback' }`，只允许本机浏览器调用
- 端点名定义在 `BRIDGE_ENDPOINTS` 常量里，客户端和服务端共用同一个文件

```js
ctx.connection.rpc.handle('/dsh-bridge', handler, { authority: 'loopback' });
```

## Client 插件规范

- React 由 bundle 包装头注入，用 `require("react")` 获取，不要 import
- 组件用 `React.createElement`，不能写 JSX
- 所有 hook 用全局 `React.useState` / `React.useEffect` / `React.useCallback` / `React.memo`
- 注册 Slot：`ctx.slots.inject('settings.section', () => ctx.slots.register(...))`

## 构建与安装

```bash
# 修改 client/index.js 后
node client/build.mjs

# 重新安装到 web profile（每次改 Host 代码后必须执行）
dsh plugin --profile web add .

# 然后重启 DSH
```

**改完 Host 代码必须重启 DSH 才能生效。**  
**改完 Client 代码只需要刷新浏览器页面（前提：`dsh.bundle.patch` 模式下 client bundle 热更新）。**

## 常见错误

| 错误 | 原因 | 修复 |
|------|------|------|
| `cannot get property without inject` | inject 未声明该服务 | 加到 inject.required 或 inject.optional |
| `invalid or reserved RPC channel` | 频道名没有 `/` 前缀 | 改为 `/dsh-bridge` |
| `bundle loaded without registering` | loaderId 与 name 不一致 | client/build.mjs 里 `loaderId = 'dsh-bridge'` |
| `require is not defined` | ES module 里用了 require | 改为顶部 import |
| `spawn UNKNOWN` | 二进制不存在或文件损坏 | 删除 `~/.dsh-bridge/bin/` 重新下载 |
| `schema is not a function` | settings.register 传了 plain object | 不要用 settings 服务，改用 JSON 文件持久化 |
