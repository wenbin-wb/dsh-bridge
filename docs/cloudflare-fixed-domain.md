# Cloudflare 固定域名（Token 模式）申请与配置教程

> 适用：想让 dsh-bridge 的公网入口**固定不变**（如 `dsh.yourdomain.com`），而不是每次开启都换新的
> `trycloudflare.com` 随机地址。全程免费（Cloudflare 免费套餐即可），无需公网 IP、无需备案（境外流量）。

- 预计耗时：20–40 分钟（含域名生效等待）
- 费用：Cloudflare 免费套餐 $0；域名需自购（约 ¥30–80/年，.com/.net/.xyz 等均可）
- 💡 **界面语言**：Cloudflare 控制台支持中文。切换方式：页面右上角头像/语言菜单选择「中文（简体）」。本教程同时给出**中英文菜单对照**（如「添加站点 / Add a site」——斜杠前是中文界面名称，斜杠后是英文原名），用哪个界面都能对上。

---

## 原理一句话

你在 Cloudflare 建一条 **Named Tunnel（固定隧道）**，把 `dsh.yourdomain.com` 这个子域名的流量经 Cloudflare 边缘转发到
你电脑上 dsh-bridge 的本地端口（默认 `3082`）。dsh-bridge 只需要拿到这条隧道的 **Token** 就能替你后台运行
`cloudflared tunnel run --token <TOKEN>`，隧道进程由 dsh-bridge 托管（崩溃自动重启、随 DSH 启动自愈），域名永不改变。

```
手机/浏览器 → https://dsh.yourdomain.com → Cloudflare 边缘 → 加密隧道 → 你的电脑:3082 → DSH
```

---

## 第 1 步：注册 Cloudflare 账号

1. 打开 <https://dash.cloudflare.com/sign-up>，用邮箱注册（或 Google 账号登录）。
2. 登录后进入 Dashboard。

## 第 2 步：准备一个域名

两种方式任选：

- **已有域名**：确保域名的 DNS 托管在 Cloudflare（见第 3 步）。
- **没有域名**：
  1. 在任意注册商购买一个（.com / .net / .xyz / .top 均可，便宜的先练手也行）；
  2. 拿到域名的 **NS 记录**（或注册商 API 权限），准备迁到 Cloudflare。

## 第 3 步：把域名接入 Cloudflare（DNS 托管）

> 固定域名隧道要求域名由 Cloudflare 托管（DNS 生效才能签发证书、路由流量）。若域名已在 Cloudflare 可跳过本步。

1. Cloudflare Dashboard（控制台）→「**添加站点 / Add a site**」→ 输入你的域名 → 选 **Free（免费）** 套餐 → Continue（继续）。
2. Cloudflare 会扫描现有 DNS 记录并导入（自动保留）。
3. 按提示到**域名注册商**处，把域名的 NS（Name Server/名称服务器）改成 Cloudflare 给的两条（形如 `xxx.ns.cloudflare.com`）。
4. 回 Cloudflare 点「**检查名称服务器 / Check nameservers**」，等待生效（通常几分钟到 24 小时，多数 1 小时内）。
5. 状态变 **Active（有效）** 即托管完成。

## 第 4 步：进入 Zero Trust 创建固定隧道

1. 打开 Zero Trust 控制台：<https://one.dash.cloudflare.com/>
   （或 Cloudflare Dashboard 左侧 → **Zero Trust**）。
2. 首次使用会让你选团队名、套餐——选 **Free（免费）** 计划即可。
3. 左侧菜单：**Networks（网络）→ Tunnels（隧道）**。
4. 点 **Create a tunnel（创建隧道）**：
   - 连接器类型选 **Cloudflared**；
   - Tunnel name（隧道名称）：起个名，如 `dsh-home`；
   - 点 **Save tunnel（保存隧道）**。
5. **⚠️ 立即复制并保存 Token（这一步最要紧！）**
   保存后页面会给出**安装并运行连接器**的命令，里面带一长串 Token：

   ```bash
   cloudflared tunnel run --token eyJhIjoi...（极长的一串）
   ```

   **请现在就把 `--token` 后面那一长串完整复制出来**，粘贴到记事本/密码管理器存好（可以顺手存好 `dsh.yourdomain.com` 这个域名一起备忘）。**复制完再点任何下一步/关闭页面**——万一丢了，见本步下方"Token 找不回来了怎么办"。

   > 🤖 **这段命令不用你自己在电脑上运行**（无论 Windows / macOS / Linux 都不需要）——dsh-bridge 会在后台替你执行
   > `cloudflared tunnel run --token ...`。这里展示命令只是为了让你看清 Token 长在哪、方便复制那一长串。

> 💡 **Token 找不回来了怎么办**（不用重建隧道，随时可取）：
>
> 回到 **Networks（网络）→ Tunnels（隧道）** 列表 → 点你的**隧道名称**进入详情页 → 找 **Configure（配置）**按钮或右上角 **⋯** 菜单（不同时期界面略有差异），点击后页面会显示该隧道的 **Token**，或重新给出 `cloudflared tunnel run --token ...` 的安装命令——复制其中那一长串即可。
>
> 取 token 时**无需在电脑上运行任何命令**，Token 就在网页里，直接复制即可。

## 第 5 步：给隧道绑定你的固定子域名（Public Hostname / 公共主机名）

> ⚠️ **关键**：隧道本身不含"域名→本地端口"的路由规则，必须在这里配。而且这个子域名要和你之后在
> dsh-bridge 面板里填的「自定义固定域名」**完全一致**。

1. 隧道创建后进入隧道详情页 → 切到 **Public Hostname（公共主机名）** 标签 → **Add a public hostname（添加公共主机名）**。
2. 填写（中英文界面字段对照）：
   - **Subdomain（子域）**：如 `dsh`
   - **Domain（域）**：下拉选你的域名（如 `yourdomain.com`）
   - 即最终 = `dsh.yourdomain.com`
   - **Service（服务）→ Type（类型）**：`HTTP`
   - **URL**：`localhost:3082`（dsh-bridge 代理端口；如果你改过 dsh-bridge 端口则填对应端口）
3. 保存（**Save / 保存**）。Cloudflare 会自动为你签发该域名的免费 TLS 证书并创建 DNS 记录（Tunnel 类型，CNAME 指向 `*.cfargotunnel.com`），无需手动配 DNS。
4. 状态稍后变为 **Healthy（运行正常）**（见隧道详情的 Connectors（连接器）与 Public Hostname（公共主机名）状态）。

> 端口说明：dsh-bridge 默认把面板代理在 `3082`（`proxyPort`），DSH 原生在 `3080`。**必须指向 3082**（走 dsh-bridge 的
> 认证/会话/二维码/隧道控制逻辑），不要直接指 3080。

> 端口说明：dsh-bridge 默认把面板代理在 `3082`（`proxyPort`），DSH 原生在 `3080`。**必须指向 3082**（走 dsh-bridge 的
> 认证/会话/二维码/隧道控制逻辑），不要直接指 3080。

## 第 6 步：把 Token 和域名填回 dsh-bridge

1. 打开 dsh-bridge 面板 → **公网隧道** tab。
2. 展开底部「**⚙️ 隧道配置**」→「**Cloudflare 隧道**」卡 → 展开「**高级配置：固定域名 (Cloudflare Token)**」。
3. 填写两项并「保存固定域名配置」：
   - **自定义固定域名**：`dsh.yourdomain.com`（与第 5 步 Public Hostname **完全一致**，不要带 `https://`）
   - **Tunnel Token**：第 4/5 步复制的 `cloudflared tunnel run --token` 后的那一长串
4. 回到顶部「**公网访问入口**」卡 → 点「**开启**」（token 模式下该卡显示固定域名模式）。
5. 几秒后状态变 **固定隧道已建立 (https://dsh.yourdomain.com)**。

## 第 7 步：验证

1. 浏览器打开 `https://dsh.yourdomain.com` → 应出现 DSH 登录页/面板（取决于你的访问认证设置）。
2. Cloudflare Zero Trust → **Networks（网络）→ Tunnels（隧道）** → 该隧道 → **Healthy（运行正常）**，Connectors（连接器）有连接。
3. 重启 DSH 服务或重启电脑，勾选「随 DSH 启动自动开启」后域名保持不变、自动恢复。

---

## 常见问题

### Q1：面板显示"已建立"但浏览器打不开？
几乎都是 **Public Hostname 与面板填的域名不一致**，或 Service URL 端口写错（应为 `localhost:3082` 而非 3080）。
逐项核对第 5、6 步。

### Q2：提示"cloudflared 启动失败: Incorrect Usage / flag provided but not defined"？
请确认 dsh-bridge ≥ **v2.10.7**（v2.10.6 曾因 `--no-autoupdate` 参数位置导致固定域名隧道秒退，已修复）。

### Q3：隧道一直"自动重连中"然后 error？
先看面板 error 文案：
- 含 **Incorrect Usage / 配置错误** → Token 复制不完整或参数问题，重新复制整串 Token；
- 含 **退出 code≠0 / 连接失败** → 多为网络到 Cloudflare 边缘不通或 Token 无效，检查网络后点「开启」重试（自愈已内置退避重试）。

### Q3.5：面板提示「cloudflared 版本已超出 Cloudflare 一年支持窗口」怎么办？
Cloudflare 官方只支持**距最新发布一年内**的 cloudflared（见 [Deprecated versions](https://github.com/cloudflare/cloudflared#deprecated-versions)）。
插件内置的 cloudflared 会随版本更新，看到这条提示说明**插件本身该升级了**：

1. **首选**：升级 dsh-bridge 到最新版（插件内置的 cloudflared 版本会随发版更新）；
2. 或者：自己在系统里安装最新 cloudflared（插件优先使用系统安装的二进制，面板会显示来源「系统安装」）；
3. **临时绕过**（排查/内网镜像场景）：设置环境变量 `DSH_BRIDGE_CLOUDFLARED_VERSION` 指向你要的版本号（如 `2026.10.7`），
   插件会改下载该版本；该变量只接受纯版本号，非法值会被忽略。用它时插件**不再校验**支持窗口（版本发布日期未知）。

### Q4：需要买最贵的套餐吗？
不用。Cloudflare **Free** 套餐即可创建固定隧道、绑定子域名、免费 TLS。仅当你想在同一域名下加很多复杂规则或团队审计时才需付费。

### Q5：域名必须在 Cloudflare 托管吗？
**固定域名隧道是的**（要在 Cloudflare DNS 建 `CNAME → *.cfargotunnel.com` 的记录）。不想迁移主域名的话，
可以买一个便宜小域名专门做隧道入口，把主域名留在原注册商。

### Q6：为什么面板里"复制 Token"和 Cloudflare 命令里看到的不一样长？
Token 就是 `cloudflared tunnel run --token` 后面那一长串（不含引号、不含 `--token` 字样本身）。
若你在别处看到的 token 是用于 `cloudflared tunnel login` 的，那是不同的东西——固定域名模式要的是 **run --token** 那个。

### Q7：创建隧道时忘了复制 Token，页面也关了，去哪找？
**不需要重建隧道**，Token 随时能在网页里取回：

1. 打开 Zero Trust 控制台 → 左侧 **Networks（网络）→ Tunnels（隧道）**；
2. 在隧道列表里**点击你那条隧道的名称**（不是行尾的按钮，是名称本身）进入详情；
3. 详情页找 **Configure（配置）** 按钮，或页面右上角的 **⋯ / 更多** 菜单（不同时期的界面位置可能略有差异，但一定在隧道详情页里）；
4. 点击后页面会显示该隧道的 **Token**，或者重新给出带 Token 的安装命令（`cloudflared tunnel run --token ...`）；
5. 复制命令中 `--token` 后面那一长串即可。

> 提示：如果你在列表页只看到 **⋯** 下拉里有 **Edit / 编辑 / Delete / 删除** 而没有 Token，就点**隧道名称先进详情**，
> Token 在详情页内。整个过程都在浏览器网页里完成，**不需要在电脑上装 cloudflared 或执行任何命令**。

---

## 相关链接

- [Cloudflare Zero Trust 控制台](https://one.dash.cloudflare.com/)
- [Cloudflare 官方：Create a tunnel (dashboard)](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)
- [Cloudflare 官方：Tunnel run 参数（--token / --no-autoupdate）](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/)
