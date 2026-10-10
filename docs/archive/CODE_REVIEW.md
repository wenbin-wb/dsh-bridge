# dsh-bridge 代码审查报告（含误报复审）

> 审查人：首席架构师视角（重度代码洁癖模式）
> 范围：`lib/`、`client/`、`test/`、构建/发布脚本与配置
> 性质：静态全量通读 + 关键路径推理；标注「需实测」的项请发布前验证
> 版本历史：v2 在 v1 基础上增加「误报复审」——对初版每条结论回源码复核，剔除误报、修正方向性错误、降级不必要事项，并新增复核中发现的真问题。

---

## 0. 总览

项目工程质量高（编码规范、CI ubuntu+windows×node22/24、覆盖广的单测、凭据分离、双语文档）。按严重程度分级：P0 安全、P1 功能 BUG、P2 质量、P3 风格。

**初版（v1）共 5 P0 + 9 P1 + 12 P2 + 4 架构项；经误报复审后修正为 3 P0 + 6 P1 + 11 P2 + 4 架构项**，其中：
- 剔除误报 3 项（v1 P1-5 Telegram 按钮审批、v1 P1-8 客户端 VersionBanner 轮询、v1 P2-8 upgradePlugin 分级）
- 修正方向 1 项（v1 P1-6 飞书群聊按钮：不是"他人可代批"，而是"发起者本人被误拦"）
- 降级 3 项（v1 P0-D hop-by-hop 降 P1；v1 P1-7 getDshVersion 反复 spawn 实为误读、降 P2；v1 P1-8 服务端 checkVersion 无 TTL 部分降 P2）
- 补实锤并重新定性 1 项（P0-C 隧道浏览器 HTTP/WS 无自身认证，依赖本地认证兜底）

---

## 1. P0 安全缺陷（复核后 3 项）

### P0-A. `AuthManager.verifyRequest` 的 loopback 免认证对「同宿主任意进程」过度信任

**位置**：`lib/auth/manager.js:479-494`

**现状**：`allowLoopback && isLoopback && !isPublicTunnel` 分支只检查 `host.startsWith('127.0.0.1') || 'localhost' || ''`。

**威胁**：`allowLoopback` 默认 true。若 DSH 启用访问认证（`enabled=true`）但尚未设密码/Token，**任何能连到 3082 端口的同宿主进程**（浏览器扩展、恶意软件、同机容器若端口可达）设 `Host: 127.0.0.1:3082` 即以回环身份免认证获得完整访问权，还能调 `/__dsh_bridge__/loopback-token` 直接领 adminToken。

**复核结论**：成立。TCP 回环只能证明"来自本机"，不能证明"来自本机浏览器/用户"；HTTP 层无更强手段。产品若坚持"本机免密"，至少应在 UI/文档显著提示；更稳妥是未配置任何凭据时不给 loopback 特殊放行。

**对应**：R1。

### P0-B. 启用认证但未设密码时，登录等于空密码放行

**位置**：`lib/auth/manager.js:367-373`（`verifyPassword` 在 `!hasPassword && mode!=='password_only'` 时返回 success:true）+ 登录 API。

**现状**：远程访客只要知道面板地址，POST `/__dsh_bridge__/login` 空密码即签发会话。这是产品"先开放后设密码"设计，但叠加 P0-A/公网隧道时等于无认证。

**复核结论**：成立（产品决策需确认），与 P0-A 合并建议。

**对应**：并入 R1 讨论。

### P0-C. 自建隧道服务端（HTTP 与 WS）均无自身认证，仅依赖本地认证兜底

**位置**：`scripts/install-tunnel-server.sh`（内嵌 server.mjs）`:221-302`。

**现状**：
- `/connect`（tunnel client 控制通道）：`:306` 校验 `?token=`，**有鉴权** ✓
- **浏览器 HTTP 转发**（`:221-257`）与 **浏览器 WebSocket 代理**（`:267-302`）：只要存在任一在线 tunnel client，**任何公网访客无需 token** 即可把 HTTP/WS 请求转发到本地 DSH（WS 只靠随机 wsId + 10s 超时，HTTP 靠 PATH_PREFIX 隐藏路径）。

**威胁评估（关键）**：隧道转发的流量在本地 ProxyServer 会被识别为隧道流量（`x-dsh-internal-tunnel` 头，不享受 loopback 免认证），**真正认证防线在本地 `AuthManager`**。因此：
- 若用户**启用了访问认证并设密码/Token** → 匿名隧道流量在本地被 401 拦截，P0-C 影响有限（仅暴露登录页）；
- 若用户**未启用认证 / 未设密码**（配合 P0-B）→ 公网任意访客可直达完整 DSH。这与 P0-A/P0-B 同源，属「纵深防御缺口」而非独立可利用漏洞。

**复核结论**：成立，定性为**纵深防御缺陷（P0/P1 取决于本地认证配置）**——隧道公网入口无自身认证，把安全完全押注在本地认证开关上；建议服务端加独立访问凭据（或至少 WS 升级校验）。同时主页 `forwardRequest` 转发时透传了浏览器原始 Cookie/头到本地，若本地认证关闭则风险如上。

**对应**：R2（服务端加 token/会话校验，禁止匿名浏览器直连；与本地认证形成双保险）。

---

## 2. P1 功能 BUG / 明确缺陷（复核后 6 项）

### P1-1. 本地 `ProxyServer` 非缓冲转发与 WS 升级未净化 hop-by-hop 头（由 v1 P0-D 降级）

**位置**：`lib/index.js:468`（非缓冲直通 `res.writeHead(status, proxyRes.headers)`）、`:496-512`（WS upgrade 手拼响应头）。

**现状**：HTML 缓冲路径已删 `content-length/transfer-encoding`（`:459-461`），但非缓冲直通与 WS 101 分支把上游头（含 `connection/keep-alive/transfer-encoding` 等 hop-by-hop）原样透传。多数客户端能容忍，但严格客户端/中间层可能解析异常；WS 101 分支还允许上游注入任意响应头。

**复核结论**：成立，属健壮性/协议合规缺陷（非主动利用漏洞，风险中等）。**降为 P1**。

**对应**：R3。

### P1-2. QQ 流式失败回退在无 `stream_msg_id` 时可能重复发整条消息

**位置**：`lib/qq/node.js:296-314`。

**现状**：流式中途失败 → catch 用 `streamMsgId`（首片失败时为 null）+ `index: slices.length` + `inputState: 10` 补发完整 md；`streamMsgId` 为 null 时这是"全新流式消息"，随后若再走 `_sendMarkdown` 兜底则重复。

**复核结论**：成立。首片失败场景 `streamMsgId=null`，补发其实开启了一条**新的** replace 流，随后 catch 内 `_sendMarkdown` 再发一条 → 用户可能收到 2 条完整内容。建议：`streamMsgId` 为空时直接 `_sendMarkdown`，不发 stream 补发。

**对应**：R4。

### P1-3. QQ 引用回复自动开新会话的固定 100ms 等待是竞态

**位置**：`lib/qq/node.js:410-417`。

**现状**：无活动会话且用户引用机器人消息时，先 `handleInbound('/new')` 再 `sleep(100ms)` 再处理正文。`/new` 创建会话是异步重活（等 DSH 建 agent），100ms 未必够 → 竞态下正文可能仍落在"无活动会话"路径。

**复核结论**：成立但影响较轻（最坏情况用户看到提示语而不是对话）。因 `handleInbound` 自带串行队列，直接 `await` `/new` 完成即可，去掉固定 sleep。

**对应**：R5。

### P1-4. `[SEND_FILE]` 可外发任意本地绝对路径文件

**位置**：`lib/platform/message-split.js:134-150` + `conversation-bridge.js` 自动发送。

**现状**：模型输出中 `[SEND_FILE: <绝对路径>]` 只要 statSync 是文件即发送给 IM。模型输出不可信（提示注入/越狱可能），可借此把 `.ssh`、`.credentials`、`.env` 等发给白名单聊天。

**复核结论**：成立。当前缓解仅"指令必须显式出现"，但模型可被诱导输出。建议发送前校验目标在会话 cwd / 已注册工作区范围内，并拦截敏感路径（可复用 `security/path-validator.js`）。

**对应**：R6。

### P1-5. 微信 gateway `stop()`/`restart()` 轮询竞态

**位置**：`lib/wechat/gateway.js:389-418`、`769-791`。

**现状**：`stop()` 只置 `stopPollingLocal=true`，不中断 in-flight `getUpdates`（最长 35s）；`restart()` `await previous` 后启动新循环，但旧任务真正退出前新循环可能已开始（软停止），且 `setCredentials()` 触发 restart 时若旧轮询未退出 → 新旧 poller 并存 → iLink 单 token 单 poller 可能 403。

**复核结论**：成立。`await previous` 确实等待旧循环退出（`previous` 是 `runPollLoop()` promise，`stopPollingLocal` 置位后旧循环在本次迭代结束时退出），所以**旧 poller 并存窗口有限**；但 35s 长轮询 in-flight 期间 restart 会等满整个长轮询才切换，用户体验与"快速换 token"场景确有竞态窗口。属真实健壮性缺陷（P1 偏低 / P2 偏高），建议给长轮询加 AbortController。

**对应**：R7。

### P1-6. 飞书群聊卡片按钮：**发起者本人会被误拦**（复核修正方向）

**位置**：`lib/feishu/node.js:176-194`（`_handleAction`）+ `_handleInbound`（`:141` `senderId: isGroup ? peerId : senderId`）+ 审批桥 `initiator = turn.senderId`（`:274`）。

**现状**：
- 群聊中发起审批：`pending.peerId` = 群 peerId（`oc_...`，因为 `turn.senderId` 在群聊被设成了群 peerId）；
- 群成员点击卡片按钮：`operatorId` = 成员 open_id（`ou_...`）；
- `_handleAction` 比对 `pending.peerId !== operatorId` → **恒不等 → 群聊按钮审批永远被拦**（`return` 无任何提示），群内只能走文本 `/yes`。

**复核结论**：成立且**方向与 v1 报告相反**——不是"他人可代批"，而是"发起者本人按钮不可用"。单聊正常（operatorId=发起者 open_id）。若产品把"群"整体作为授权主体（首个 @ 即授权整群，成员都可发消息使唤 agent），则"群成员按钮可决议"本身不算越权；问题只是**群聊按钮路径被误杀**。

**对应**：R8（群聊按钮决议的 peer 口径：要么允许群内成员按钮决议，要么明确只允许发起成员、需记录成员级发起者并实测）。

---

## 3. P2 代码质量 / 健壮性（复核后 11 项）

1. **cloudflared 启停状态机**（`cloudflared-manager`/`lib/index.js`）：`startCloudflared` 非阻塞、90s 超时路径 `stop()` 后 reject、`.tmp` 残留（已有清理）。建议补状态机单测。
2. **tunnel-client SSE 截断**（`lib/tunnel-client.mjs:185`）：收到第 2 个 chunk 即截断并 destroy 上游；500ms 定时器也截断。SSE 聊天流用户看到的是被腰斩的流。建议升级协议支持流式或文档明示"SSE 仅首屏"。
3. **微信 context token 明文落盘**（`wechat/gateway.js`）：防抖合并写但 sync fs + 明文无权限收紧。建议文件权限 600 / 明确风险。
4. **`createConnectProxyAgent` 只支持 HTTP CONNECT**：`https://` 代理协议未特判，文档应说明。
5. **client 命令式 DOM 侵入 + 依赖宿主 class 名**（`client/index.js` 移动增强）：对 DSH 版本升级脆弱，MutationObserver 常驻。建议收敛为官方 slot/注入点并加特性开关。
6. **`session-strip` 对 gzip 压缩响应不生效**：只在未压缩时剥离；压缩响应直接透传大字段。建议解压→剥离→重压缩，或上游请求 `accept-encoding: identity`。
7. **`checkVersion`/VersionBanner 无服务端 TTL 缓存**（`lib/index.js:931` + `client/index.js:2191`）：**复核修正**：客户端 VersionBanner 仅在 mount 时 `check()` 一次（无 3s 轮询），因此"客户端 3s 轮询打 registry"**不成立**；剩余问题仅是服务端每次调用都发外网请求、无 TTL 缓存。降级为 P2 低优。
8. **`getDshVersion` 失败后不再重试**（`lib/index.js:598-643`，由 v1 P1-7 降级）：函数入口即置 `_dshVersionLoaded=true`，失败后进程生命周期内不再探测（用户修复 PATH 需重启）。**v1 称"反复 spawn"是误读**，实际只探测一次；可议点仅为无重试。建议长退避（如 10 分钟后再探测）。
9. **`restartDsh` 直接 `process.exit`**：依赖外部守护，文档需明确使用前提。（保留）
10. **重复代码 / 命名不一致**：`getDshVersion` 与 `upgradePlugin` PATH 拼接重复；四处审批卡片渲染各写一遍（Telegram 有死代码 `sendApprovalCard`，见误报复审）；平台 capability 键不一致（`supportsGroup` vs `group`）。建议统一。
11. **登录页/注入页面无 CSP**（P3 建议）；大量空 `catch {}` 吞异常，建议至少 `logger.debug`。

---

## 4. 架构层面观察（复核后 4 项，均成立）

1. **context 注入方式不一致**：`ctx.qq/telegram/feishu = ...` 直接属性赋值（部分 try/catch）；测试用 `reflect.provide`。cordis 对未注入属性读取会抛错，建议统一 `reflect.provide`/服务注册。
2. **平台 capability 字段命名不一致**：`supportsGroup` vs `group`、`supportsMedia` vs `media`，消费方需各自适配；`status` getter 覆盖方式不一。建议统一 schema + JSDoc。
3. **错误处理粗糙**：大量空 catch；RPC 层统一 `fail('bad-request')` 无法区分参数错与内部错误。建议细分错误码。
4. **测试覆盖缺口**：`security-vulnerabilities.test.mjs` P0-7 是半断言（未真正调 verifyRequest/签发端点）；P0-6 未单独覆盖伪造 `x-dsh-internal-tunnel` 需 secret 路径（verifyRequest 用 secret 比较，伪造不可行，测试隐式覆盖）。建议补 P0-A/P0-C/R6 的回归测试。

---

## 5. 误报复审结论（v1 → v2 变更明细）

| 原编号 | 原结论 | 复审结论 | 处置 |
|---|---|---|---|
| P0-C | 隧道服务端鉴权"待补审" | 控制通道有 token 鉴权；但浏览器 HTTP/WS 转发路径**无自身认证**，仅靠本地 ProxyServer 认证兜底（纵深防御缺口） | 改写为 P0-C 实锤（定性随本地认证配置） |
| P1-5 | Telegram 按钮审批不校验发起者 | **误报**：Telegram 未重写审批桥，按钮分支是**死代码**（`sendApprovalCard` 无调用点），真实审批走基类文本卡 + `/yes` | 剔除，移入 P2 死代码清理建议 |
| P1-6 | 飞书群聊"他人可代批" | 方向反了：实际是**群聊发起者本人按钮被误拦**（peerId=群 vs operatorId=成员） | 改写为 P1-5（修正方向） |
| P1-7(v1) | getDshVersion 失败后反复 spawn | **误报**：函数入口已置 `_dshVersionLoaded=true`，只会尝试一次 | 降级为 P2 建议 |
| P1-8(v1) | VersionBanner 3s 轮询打 registry | **误报**：VersionBanner 仅 mount 时 check 一次，无轮询 | 剔除客户端轮询部分，保留服务端无 TTL 缓存（降 P2-7） |
| P2-8(v1) | upgradePlugin 分级提示 | 保留但影响轻微（`dsh` 失败转 npx/npm 是合理降级，误报"已是最新"概率低） | 降级合并至 P2-9 |

**复核中确认误报的共性根因**：v1 部分条目凭函数印象/推断而非逐行核对调用链，导致对"可达性"与"触发频率"高估。v2 已逐条回源码验证调用链与守卫条件。

---

## 6. 修复清单与实施状态（按复核后优先级）

> 已按用户确认范围实施全部 P1 与低成本 P2；R1/R2 按用户选择「维持现状 + 仅文档告警」未改服务端逻辑，改为 UI 高危告警与 README 双语安全须知。

| 编号 | 文件 | 修复内容 | 优先级 | 状态 |
|---|---|---|---|---|
| R1 | `lib/auth/manager.js` | loopback 免认证收紧（未设凭据时不无条件放行本机进程） | P0 | **按用户决策未改**：UI 增加「已开启认证但未设任何密码」高危告警（client/index.js）；README 双语安全须知 |
| R2 | `scripts/install-tunnel-server.sh` | 隧道入口加独立认证 | P0 | **按用户决策未改**：README 双语明确「隧道转发无独立认证、依赖本地访问认证」安全须知 |
| R3 | `lib/index.js` | 代理响应净化 hop-by-hop 头（直通 + WS 101 白名单 + 非 101 净化） | P1 | ✅ 已实施 |
| R4 | `lib/qq/node.js` | 流式失败回退：`streamMsgId` 为空时直接降级单条 Markdown | P1 | ✅ 已实施 |
| R5 | `lib/qq/node.js` | 引用回复去掉固定 100ms，await `/new` 完成 | P1 | ✅ 已实施 |
| R6 | `lib/platform/message-split.js` + `conversation-bridge.js` | SEND_FILE 发送前校验：必须位于会话 cwd 内 + 敏感路径黑名单（.ssh/.credentials/.env 等） | P1 | ✅ 已实施（`isPathAllowedForSend`） |
| R7 | `lib/wechat/gateway.js` | stop/restart 竞态：长轮询加 AbortController 中断 in-flight | P1 | ✅ 已实施 |
| R8 | `lib/feishu/node.js` | 群聊卡片按钮决议口径：群整体授权（群内成员可按钮决议），单聊仍校验发起者 | P1 | ✅ 已实施（按用户选择「群内成员可按钮决议」） |
| R9 | `lib/telegram/node.js` | 死代码清理：删除无调用点的 `sendApprovalCard` | P2 | ✅ 已实施 |
| R10 | `lib/index.js` | `getDshVersion` 失败长退避重试（10 分钟后再探测） | P2 | ✅ 已实施 |
| R11 | `lib/index.js` | `checkVersion` 服务端结果 TTL 缓存（10 分钟） | P2 | ✅ 已实施 |

### 实施验证结果

- ✅ 全量单测：**169 passed / 0 failed**（`npm test`）
- ✅ lint：**0 errors**（28 条既存 warning，均为历史代码 no-unused-vars 降级，非本次引入）
- ✅ 构建：`npm run build:client` 成功产出 `client/client.js`
- ✅ 语法检查：全部改动文件 `node --check` 通过

### 仍需真机验证（不在本次单测覆盖内）

- 飞书群聊卡片按钮：修复后群内任意成员可按钮决议（与 QQ 群模型一致），需真机验证按钮事件链路；
- 微信 stop/restart 竞态：AbortController 中断长轮询的行为需在真实 iLink 轮询下确认；
- QQ 流式失败回退 / 引用回复：需真实 QQ Bot 环境验证。


---

## 8. Issue #28 修复记录（DSH 原生端口 3080 直连被误判远程）

**issue**：[#28](https://github.com/wenbin-wb/dsh-bridge/issues/28) — dsh 0.1.2-alpha.5 下 127.0.0.1:3080 被判定为远程 + 本机文件夹选择走远程抽屉（0 回复，经代码核查确认为真问题）。

**根因（现象 1，已修复）**：
- `/__dsh_bridge__/loopback-token`（本机领 adminToken 端点）只注册在代理端口 3082（lib/index.js ProxyServer），DSH 原生端口 3080 无此端点；
- 3080 页面相对路径 fetch 404 后，兜底跨域请求 3082 时，Origin `http://127.0.0.1:3080` 不在 CORS 白名单 → 被浏览器拦截 → 拿不到 adminToken；
- `adminPolicy=local_only` 下 `checkAdminAuth` 要求有效 adminToken → 面板锁定。

**修复**：`BridgeService.startProxy()` 的 `allowedOrigins` 加入 DSH 原生端口 origin（`http://127.0.0.1:<dshPort>` / `http://localhost:<dshPort>`），使直连原生端口时页面可跨域回读代理端点的 loopback-token。CORS 仍收敛（仅回显白名单 origin，非白名单不回显 ACAO 头，浏览器跨域仍被拦）。

**回归测试**：`test/proxy-auth.test.mjs` 新增「issue #28 regression」用例——白名单 dshPort origin 回环 POST 得 200 + ACAO 回显 + 有效 adminToken；非白名单 origin 不回显 ACAO。

**现象 2（文件夹选择走远程抽屉，未修）**：纯 `dsh web` 模式无原生 pickDirectory（无 Electron/原生宿主桥），`pick()` 抛 "needs the native capability" 后刻意降级远程抽屉。是否可修取决于 DSH 0.1.2 是否提供替代目录选择服务，需真机/DSH 侧确认。

> 本报告为 CODE_REVIEW 文档，不随 npm 包发布。修复均未 bump 版本号；如发布请自行决定版本与 CHANGELOG。
