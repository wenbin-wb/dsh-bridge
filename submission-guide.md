# dsh-bridge 插件收录指南

## 已准备的提交内容

### 1. libukai/awesome-deepseek-harness（社区精选列表）
**状态**: 本地分支已准备好

**操作步骤**:
```bash
cd C:\Users\Administrator\AppData\Local\Temp\1\deepseek-repos\awesome-deepseek-harness
git remote add fork https://github.com/wenbin-wb/awesome-deepseek-harness.git
git push fork add-dsh-bridge
```

然后访问 https://github.com/libukai/awesome-deepseek-harness 创建 PR

**PR 标题**: feat: add dsh-bridge plugin

**PR 描述**:
```markdown
## 插件信息

- **名称**: dsh-bridge
- **仓库**: https://github.com/wenbin-wb/dsh-bridge
- **npm**: @wenbin_wb/dsh-bridge@1.0.8
- **许可证**: MIT
- **分类**: 浏览器、视觉与界面

## 功能简介

多通道远程访问插件，支持：
- 局域网扫码访问
- Cloudflare 隧道
- 自建隧道服务器

让你随时随地访问本地 DSH。

## 安装方式

```bash
npm install -g @wenbin_wb/dsh-bridge
dsh plugin --profile web add @wenbin_wb/dsh-bridge
```

## 相关链接

- 中文文档: [README.zh-CN.md](https://github.com/wenbin-wb/dsh-bridge/blob/main/README.zh-CN.md)
- 英文文档: [README.md](https://github.com/wenbin-wb/dsh-bridge/blob/main/README.md)
```

---

### 2. linxiecoder/deepseek-harness-plugins（第三方插件集合）
**状态**: 本地分支已准备好

**操作步骤**:
```bash
cd C:\Users\Administrator\AppData\Local\Temp\1\deepseek-repos\deepseek-harness-plugins
git remote add fork https://github.com/wenbin-wb/deepseek-harness-plugins.git
git push fork add-dsh-bridge
```

然后访问 https://github.com/linxiecoder/deepseek-harness-plugins 创建 PR

**PR 标题**: Add dsh-bridge plugin

**PR 描述**:
```markdown
Multi-channel remote access plugin for DeepSeek Harness:

## Features
- LAN QR code scanning for mobile access
- Cloudflare tunnel integration for zero-config public access
- Custom tunnel server support for enterprise deployment

## Installation
```bash
npm install -g @wenbin_wb/dsh-bridge
dsh plugin --profile web add @wenbin_wb/dsh-bridge
```

## Links
- Repository: https://github.com/wenbin-wb/dsh-bridge
- npm: https://www.npmjs.com/package/@wenbin_wb/dsh-bridge
- License: MIT
```

---

### 3. web-casa/Awesome-DeepSeek-Harness-Plugins（官方自动生成列表）
**状态**: 需要在 cordis.run 提交

这个列表从 cordis.run 自动同步，不接受直接 PR。

**操作步骤**:
1. 访问 https://cordis.run
2. 注册/登录账号
3. 提交插件信息：
   - Package name: `@wenbin_wb/dsh-bridge`
   - npm URL: https://www.npmjs.com/package/@wenbin_wb/dsh-bridge
   - GitHub: https://github.com/wenbin-wb/dsh-bridge
   - Description: Multi-channel remote access plugin for DeepSeek Harness: LAN QR code, Cloudflare tunnel, and custom tunnel server support
   - Category: Productivity / Tools

提交后会自动扫描并收录到列表中。

---

### 4. DeepSeek 官方 awesome-deepseek-integration（可选）
如果插件适用于更广泛的 DeepSeek 集成场景，可以提交到官方集成列表：

访问 https://github.com/deepseek-ai/awesome-deepseek-integration 提交 issue 或 PR

---

## 快速执行所有提交

```bash
# 1. Fork 这两个仓库到你的 GitHub 账号
# https://github.com/libukai/awesome-deepseek-harness
# https://github.com/linxiecoder/deepseek-harness-plugins

# 2. 推送分支
cd C:\Users\Administrator\AppData\Local\Temp\1\deepseek-repos\awesome-deepseek-harness
git remote add fork https://github.com/wenbin-wb/awesome-deepseek-harness.git
git push fork add-dsh-bridge

cd C:\Users\Administrator\AppData\Local\Temp\1\deepseek-repos\deepseek-harness-plugins
git remote add fork https://github.com/wenbin-wb/deepseek-harness-plugins.git
git push fork add-dsh-bridge

# 3. 去 GitHub 创建 PR
# https://github.com/libukai/awesome-deepseek-harness/compare
# https://github.com/linxiecoder/deepseek-harness-plugins/compare

# 4. 去 cordis.run 提交插件
# https://cordis.run
```
