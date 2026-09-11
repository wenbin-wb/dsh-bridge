// 运行时兼容垫片：DSH ≥ 0.1.5-alpha.1 的 connection RPC 通道注册回归
// （lib/connection-compat.js）
//
// 背景（上游回归，非本插件声明问题）
// ---------------------------------------------------------------
// @deepseek-ai/dsh-client-connection 在 0.1.5-alpha.1 改了插件级服务声明：
//     ≤ 0.1.3-alpha.2    const inject = ["webServer", "credentials"];
//     ≥ 0.1.5-alpha.1    const inject = ["credentials"];      // webServer 改为可选
// 同时把 /api 路由改用作用域注入 ctx.inject(["webServer"], (webCtx) => …)。
// 但 HostConnectionService.register() 里那一句没有同步改（各版本行号均为 618）：
//     return owner.effect(() => owner.webServer.register(route),
//                         `client-connection: ${channel} rpc channel`);
// 其中 owner === this.ctx，即 connection 插件自己的 ctx。该 ctx 的 fiber 不再把
// webServer 记入 inject，于是 cordis 4 的服务守卫直接抛：
//     cannot get property "webServer" without inject
// 注册发生在插件树加载期，异常向上冒泡 → 整棵插件树加载失败，`dsh web` 起不来：
//     Error: dsh: plugin tree failed to load: failed to apply loader entry
//            dsh-bridge (@wenbin_wb/dsh-bridge): cannot get property "webServer" without inject
//
// 影响面：任何调用 ctx.connection.rpc.handle() 的插件都会踩中（dsh-bridge 只是第一个撞上的）。
// 已逐一核对 npm 上的版本：0.1.5-alpha.1 / alpha.2 / rc.1 / rc.2 全部未修
// （0.1.5-rc.2 为当前已发布的最新版），0.1.3-alpha.2 及更早正常。
//
// 本垫片的做法
// ---------------------------------------------------------------
// 不改上游代码、不猜内部私有方法，只走两个公开面：
//   1. 正常路径：ctx.connection.rpc.handle(channel, handler)（公开 API，未来上游修好即恢复）；
//   2. 兜底路径：仅当该调用抛出 "webServer … without inject" 时，在 root 的
//      `internal/get` 瀑布事件上临时挂一个监听器 —— 先让默认解析跑，默认解析失败
//      （抛出的正是同一个 error 对象）才补上本插件已通过 inject 拿到的 webServer 引用。
//      webServer 是单例服务，语义等价；默认解析成功时零干预。
// 监听器只在这一次同步注册调用期间存在，返回后立即摘除（cordis 的 effect 同步执行，
// 注册完成后 owner.webServer 不再被访问），因此对宿主其余部分完全无副作用。
//
// 上游修好后本模块自动空转：首次调用不再抛错，兜底分支根本不会进入。

const MISSING_INJECT = /without inject/;

/**
 * 判断错误是否为"跨服务取属性缺 inject 作用域"的守卫错误，且对象是 webServer。
 * @param {unknown} err 捕获到的异常
 * @returns {boolean} 是否命中该回归
 */
export function isMissingWebServerInjectError(err) {
  if (!(err instanceof Error)) return false;
  return MISSING_INJECT.test(err.message) && /webServer/.test(err.message);
}

/**
 * 在 root 的 `internal/get` 瀑布事件上挂一个临时兜底：默认解析失败时提供 webServer。
 *
 * cordis 4 的 `ctx.events` 是所有子 ctx 共享的同一个实例，且 `internal/get` 派发时
 * 不带 context 过滤条件（thisArg 为 null），因此在本插件 ctx 上注册的监听器同样会对
 * connection 插件 ctx 的查找生效。监听器由 root fiber 持有，须手工摘除。
 *
 * @param {object} ctx 本插件的 ctx
 * @returns {() => void} 摘除函数
 */
export function installWebServerResolutionFallback(ctx) {
  const webServer = ctx?.webServer;
  if (webServer === undefined) return () => {};

  const listener = function (lookupCtx, prop, error, next) {
    if (prop !== 'webServer') return next();
    try {
      return next();
    } catch (err) {
      // 默认解析抛的不是本次守卫错误 → 原样上抛，绝不掩盖真实故障
      if (err !== error) throw err;
    }
    // 默认解析确认失败：补上本插件已 inject 的单例引用（语义等价）
    return webServer;
  };

  const off = ctx.on?.('internal/get', listener, { global: true });
  return typeof off === 'function' ? off : () => {};
}

/**
 * 注册 connection RPC 通道，并兼容 DSH ≥ 0.1.5-alpha.1 的 webServer 注入回归。
 *
 * @param {object} ctx 本插件的 ctx（须已 inject `connection` 与 `webServer`）
 * @param {string} channel RPC 通道名（如 `/dsh-bridge`）
 * @param {Function} handler 通道处理器
 * @param {object} [rpcOptions] 透传给 connection 的通道选项。
 *        DSH 0.1.0/0.1.1 的 `rpc.handle(channel, handler, options)` 支持
 *        `{ authority: 'loopback' }`（仅回环可达，非回环请求 403）；
 *        0.1.2-rc.1 起该第三参数已被移除（更高版本忽略它，传入无副作用）。
 *        本插件依赖它来做回环加固，因此必须原样透传、不得丢失。
 * @param {{warn?: Function}} [logger] 可选日志器
 * @returns {Function} 由 connection 服务返回的处置函数
 */
export function registerRpcChannel(ctx, channel, handler, rpcOptions, logger) {
  try {
    return ctx.connection.rpc.handle(channel, handler, rpcOptions);
  } catch (err) {
    if (!isMissingWebServerInjectError(err)) throw err;

    // 上游回归：owner（connection 插件自己的 ctx）解析不到 webServer。
    // 该调用在 owner.webServer 处、于 webServer.register() 之前就抛，未产生任何副作用，
    // 因此可以安全地补上兜底后重试一次。
    const dispose = installWebServerResolutionFallback(ctx);
    try {
      const registered = ctx.connection.rpc.handle(channel, handler, rpcOptions);
      logger?.warn?.(
        'dsh-bridge: 检测到宿主 DSH 的 connection RPC 注册回归（cannot get property "webServer" without inject，'
        + '见 dsh-client-connection 的 register()）；已用 webServer 解析兜底完成通道注册。'
        + '此为宿主侧问题（DSH 0.1.5-alpha.1 起），插件侧垫片会在上游修复后自动空转。'
      );
      return registered;
    } finally {
      dispose();
    }
  }
}
