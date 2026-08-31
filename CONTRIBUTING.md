# 贡献指南

感谢你有兴趣为 dsh-bridge 贡献！在动手前请花两分钟读完这份指南，能让协作顺畅很多。

## 项目结构

```
lib/                    服务端（ESM 模块）
  index.js              主插件：HTTP 代理、隧道、平台装配、配置持久化
  platform/             平台无关核心
    conversation-bridge.js   会话桥核心类（白名单/会话生命周期/审批桥/出站 digest）
    message-split.js    出站分块 + [SEND_FILE] 指令解析
    session-catalog.js  会话/工作区列表与渲染
    commands.js         斜杠命令解释器（/sessions /use …）
    dsh-storage.js      DSH 私有存储读取兜底
    base.js             Platform 基类
  wechat/ qq/ feishu/ telegram/   各 IM 平台适配（gateway 协议层 + node 桥接 + index 服务）
  auth/                认证管理器（密码哈希、Session、Token）
  security/            路径校验、限流
  tunnel-client.mjs    自建隧道客户端
  cloudflared-manager.mjs  Cloudflare 隧道管理
client/index.js        Web 面板源码（React，无 JSX，esbuild 打包）
client/client.js       打包产物（勿手改，由 npm run build:client 生成）
test/                  node:test 单元测试
```

## 开发环境

```bash
npm install
npm test          # node --test 全部单元测试
npm run lint      # eslint（0 error 才可通过 CI）
npm run build:client   # 改 client/index.js 后重建产物
```

**硬性要求**（CI 会检查）：

- `npm test` 全绿（**新增或修改功能必须带测试**）；
- `npm run lint` 无 error；
- 改过 `client/index.js` 必须重建 `client/client.js` 一并提交。

## 关键约定

- **产物不手改**：`client/client.js`、`lib/feishu/lark-bundled.mjs` 是构建产物，通过 `npm run build:*` 生成；
- **审批归属模型**：IM 发起的轮次只在 IM 决议，Web 发起的只在 Web 弹窗；改审批相关代码前请先读 `conversation-bridge.js` 的 `_attachApprovalBridge` 注释；
- **测试环境无关**：测试不得依赖外部网络或当前机器的 `~/.dsh` 数据（CI 是 Linux 沙箱无出网）；mock 优先提供内存服务注入点；
- **中文为主**：代码注释与用户可见文案以中文为主。

## 提交规范

- 提交信息用 Conventional Commits：`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:` / `style:` / `ci:`；
- 每个逻辑变更一个独立提交，便于二分回滚；
- 涉及行为变更时在提交信息里说明。

## 发布流程

版本号与 releaseNotes 维护在 `package.json`，CHANGELOG 同步更新。发版 = 打 `vX.Y.Z` tag 推送（触发 GitHub Actions 自动建 Release）+ `npm publish`。

## 提交 PR

1. 从最新 `main` 切分支；
2. 完成修改 + 测试 + lint；
3. PR 描述说明**改了什么、为什么、怎么验证**；
4. CI 全绿后等待 review。

遇到问题欢迎在 Issue 里讨论。谢谢！🎉
