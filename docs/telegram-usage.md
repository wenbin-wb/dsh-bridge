# Telegram 机器人接入使用指南

`@wenbin_wb/dsh-bridge` 支持通过官方 Telegram Bot API 与移动端/桌面端 Telegram 实时交互。
采用纯长轮询（getUpdates）机制，**无需公网 IP**，**无需配置 Webhook**，并自带**零第三方依赖的 HTTP/HTTPS 代理隧道**。

---

## 一、在 Telegram 中创建机器人并获取 Token

1. 打开 Telegram，搜索官方机器人管理号 [@BotFather](https://t.me/BotFather)；
2. 发送 `/newbot` 指令；
3. 根据提示依次输入：
   - **机器人昵称**（如 `My DSH Bot`）；
   - **机器人用户名**（必须以 `bot` 结尾，如 `my_dsh_agent_bot`）；
4. 创建成功后，@BotFather 会返回一行 **HTTP API Token**（格式如 `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`）。

---

## 二、配置与连接

1. 打开 DSH Bridge 管理面板（Web 端）；
2. 切换到「**平台**」页签，选择「**Telegram**」；
3. 填入刚才获取的 **Bot Token**；
4. **网络代理（可选）**：
   - 若在中国大陆地区服务器或个人电脑上运行，可填入本地代理地址，如 `http://127.0.0.1:7890`（支持 Clash / v2ray / Squid 等 HTTP/HTTPS 代理）；
   - 亦可直接在系统环境变量中设置 `HTTPS_PROXY=http://127.0.0.1:7890`；
5. 点击「**保存并连接**」。

---

## 三、使用说明

### 1. 扫码与白名单授权
- 连接成功后，面板将展示当前机器人的二维码与直达链接；
- 用手机 Telegram 扫描二维码或点击链接打开与机器人的对话；
- 发送第一条消息（如 `/help` 或 `你好`），系统将**自动将你的 Telegram 账号加入白名单**。

### 2. 核心功能
- **全套会话管理**：
  - `/new <提示词>`：在当前工作区新建会话；
  - `/new <提示词> @N`：在指定工作区新建会话；
  - `/sessions`（或 `/list`）：查看全部会话列表；
  - `/use N`（或 `/resume N`）：切换活动会话；
  - `/workspaces`：查看本地所有工作区；
  - `/status`：查看当前执行状态。
- **多模态与文件发送**：
  - 直接向 Telegram 机器人发送图片或文件，系统自动下载并交给 Agent 处理；
  - Agent 本轮执行完毕后，生成的图片与文档会自动直接发送回 Telegram 聊天框。
- **操作权限审批**：
  - 当 Agent 执行高危命令时，Telegram 会弹出原生 **Inline Keyboard 按键** `[✓ 批准执行]` / `[✕ 拒绝执行]`，点击按键一秒放行；
  - 亦可直接输入数字 `1` 批准、`2` 拒绝。
