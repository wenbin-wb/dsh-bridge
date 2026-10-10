# 发布流程规则（RELEASE PROCESS）

> 本文件是**发布操作的红线规则**，任何一次对外发布（npm / GitHub Release）都必须遵守。

## 铁律：发布前必须人工确认

**任何版本（正式版 / 补丁版）在推 tag、npm publish、创建 GitHub Release 之前，必须先向仓库所有者（wenbin-wb）确认，得到明确同意后才可执行。**

原因（2026-09-01 教训）：v2.10.0 发布时未先确认就自行完成了 合并 → 打 tag → 推送 → npm publish 全流程，随后发现发布说明措辞需要修订，而 npm 不允许覆盖已发布版本，只能再补 v2.10.1 修正，造成不必要的版本噪音。

### 确认清单（发布前发给所有者）

1. **版本号**：下一个版本号（如 `v2.10.1`）是否认可？
2. **发布说明（releaseNotes / CHANGELOG）**：内容是否准确？是否只包含用户可感知的变更（新功能、真实修复），不包含开发过程细节？
3. **发布范围**：npm 发布 + GitHub Release + tag，是否全部执行？

得到「可以发布」的明确回复后，才允许执行发布动作。

## 发布流程

1. **改版本**：`package.json` 的 `version` + `releaseNotes`
2. **写 CHANGELOG**：`CHANGELOG.md` 顶部新增对应版本条目
3. **构建与测试**：
   - `npm run build:client`（**必须**：客户端产物要与源码同步，`npm test` 有一项断言会校验产物内嵌的 CSS 与源码逐字一致）
   - `npm test` + `npm run lint`
   - `npm run verify:mobile-ui`（**发布前必做**：跑真实 GUI 的移动端行为验收，9 个套件（清单以 `test/browser/run-all.mjs` 的 SUITES 为准）。需要 dsh web 正在运行；Chrome 路径可用 `PUPPETEER_EXECUTABLE_PATH` 指定。它不在 CI 里跑，因为 CI 没有宿主）
   - `npm run build:banner`（**仅当 `docs/screenshots/` 素材有变、需要重出 README banner 时执行**；输入没变时应跳过，否则只会产生 JPEG 重编码噪声。注意该脚本默认 Chrome 路径是写死的 Windows 路径，需用 `PUPPETEER_EXECUTABLE_PATH` 覆盖）
   - `npm run build:lark`（**仅在需要重建飞书 vendor bundle 时执行**。它用当前 esbuild 重新打包 `lib/feishu/lark-bundled.mjs`，产物会随 esbuild 版本漂移；**不要放进 `prepack`**，否则每次 `npm publish` 都会让线上 tarball 里的 vendor 文件与 tag 里的不一致）
4. **提交**：合并到 `main`（fast-forward），提交信息 `release: vX.Y.Z — ...`
5. **打 tag**：`git tag vX.Y.Z && git push origin vX.Y.Z`（触发 GitHub Actions 自动创建 Release）
6. **npm 发布**：`npm publish`（prepack 自动构建产物）
7. **验证**：npm 线上版本 + GitHub Release body 是否正确

## 发布说明写作规范

- ✅ 只写**用户可感知**的变更：新功能、真实修复（用户报告的问题）
- ❌ 不写开发过程中自己引入又修复的内部 bug
- ❌ 不罗列内部重构/清理细节（一句话概括即可）
- ✅ 修复类条目建议**合并成一条概括**，不逐条展开技术实现

## 注意事项

- npm **不允许覆盖已发布版本**（403）。发布后发现说明要改，只能 bump 补丁版本——所以发布前确认说明尤其重要。
- `release.yml` workflow 只创建 GitHub Release，npm 发布是手动步骤，不要漏。
- 发布后如发现问题，走补丁版本（`vX.Y.Z+1`），不要尝试覆盖。
