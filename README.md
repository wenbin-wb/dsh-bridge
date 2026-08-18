# dsh-bridge

> DeepSeek Harness 多通道远程访问插件

在 DSH 设置页新增「远程访问」面板，支持局域网二维码、Cloudflare 隧道、自建 WebSocket 隧道三种方式从任意设备访问你的 DSH 实例。

![npm](https://img.shields.io/npm/v/@wenbin_wb/dsh-bridge?label=npm)
![npm downloads](https://img.shields.io/npm/dt/@wenbin_wb/dsh-bridge?label=downloads)
![npm license](https://img.shields.io/npm/l/@wenbin_wb/dsh-bridge?label=license)
![DSH Plugin](https://img.shields.io/badge/dsh--plugin-0.1.0--rc.6-blue)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

## 功能

- **局域网访问**：自动检测本机 IP，生成二维码，同一 Wi-Fi 下的设备直接扫码访问
- **Cloudflare 隧道**：一键获取公网地址，自动下载 cloudflared（无需手动安装），重启后 URL 会变化
- **自建隧道**：WebSocket 反向隧道，连接自己部署的隧道服务器，可获得固定域名
- **安全提示**：URL 和二维码带访问警告，防止误分享
- **版本检查**：进入面板自动检测是否有新版本

## 兼容性

> - **插件版本**：当前发布 `@wenbin_wb/dsh-bridge@1.0.3`（见顶部 npm 徽章，最新版本会自动同步）
> - **基于 DeepSeek Harness v0.1.0-rc.6** 开发测试。
> - DSH 是开发者预览版，插件契约可能随版本变化，请关注 [CHANGELOG](./CHANGELOG.md)。

## 环境要求

安装插件前，请先确保：

1. **Node.js ≥ 22**（DSH 要求 `^22.19.0` 或 `≥ 24.0.0`）
2. **dsh CLI 可用**——即能在终端直接运行 `dsh` 命令

```bash
# 检查 Node 版本
node -v   # 应显示 v22.19+ 或 v24+

# 检查 dsh 是否可用
dsh --version
```

如果 `dsh` 命令提示"无法识别/找不到"，说明它没有全局安装，先安装 DSH：

```bash
npm install -g @deepseek-ai/dsh@0.1.0-rc.6
```

> ⚠️ 与 DSH 版本保持一致：本插件基于 `0.1.0-rc.6` 测试，建议安装相同版本以免契约不匹配。  
> 若没有全局安装的权限，也可以用 `npx` 方式（无需全局安装）：
> ```bash
> npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge
> ```

## 安装

从 npm 安装：

```bash
dsh plugin --profile web add @wenbin_wb/dsh-bridge
```

从源码安装：

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
dsh plugin --profile web add ./dsh-bridge
```

安装完成后重启 DSH，在设置页找到「远程访问」即可使用。

## 使用

### 局域网访问

插件启动后自动开启，无需任何配置。打开设置页「远程访问」，用手机扫描二维码即可访问。

### Cloudflare 隧道

点击「Cloudflare 隧道」卡片中的「开启」按钮：
1. 首次使用会自动从 GitHub 下载 cloudflared（约 30MB），需要能访问 GitHub
2. 下载完成后自动启动，几秒内显示公网 URL 和二维码
3. 每次重启后 URL 会变化；点「重置链接」可主动获取新 URL

### 自建隧道

1. 展开「如何搭建自建隧道服务器？」查看搭建步骤
2. 填写 WebSocket 服务器地址（`wss://...`）和访问令牌
3. 点「保存配置」后点「开启」

配置自动持久化到 `~/.dsh/dsh-bridge/config.json`，重启后无需重新填写。

## 可选配置

插件开箱即用，无需配置。如需修改代理端口，在 cordis.yml 中添加：

```yaml
- name: dsh-bridge
  config:
    port: 3082  # 默认 3082
```

## 开发

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge
npm install

# 修改 client/index.js 后重新构建
npm run build:client

# 安装到 web profile 并重启 DSH
dsh plugin --profile web add .
```

## License

MIT © [wenbin-wb](https://github.com/wenbin-wb)
