// dsh-bridge 主题令牌补齐 —— **无条件注入**（不经过移动端让位判断）
//
// 为什么必须独立成块：
//   这些深色补丁原先写在 MOBILE_STYLES_CSS 里，而 injectMobileStyles() 在
//   __TAURI__ / __DSH_DESKTOP__ / 外部响应式插件存在时会直接 return
//   （shouldYieldMobileStyles）——深色适配被"移动端让位"一起让掉了，
//   桌面端 Shell 下浅色 fallback 永远生效（浅底 + 浅字）。
//
// 覆盖范围：只补 **DSH 主题系统没有定义**的令牌（全树 grep 0 命中，不会改坏宿主配色）：
//   DSH 只提供 state-*-{primary,secondary,tertiary,label}，
//   没有 *-bg / *-border、没有 info-* 与 danger-*、也没有 border-secondary。
//   浅色沿用各处 var() 的 fallback（本来就是浅色值，无需另行定义），这里补暗色值。
//
// 注：DSH 自己定义的 state-{warn,error,success}-primary 是**强调填充色**（浅色
// amber-500 / red-600 / green-500），当告警面上的正文只有 1.95~4.11:1（不达 AA）。
// 文字一律改用 DSH 的 label-primary（中性正文色，随主题翻转），状态感由底色与边框承担，
// 见 client/index.js 各处 color: 的用法与 test/dark-mode-contrast.test.mjs 的不变式。
export const THEME_TOKENS_CSS = `
  /* 深色：告警面 / 边框 / info 与 danger 补色（DSH 未定义，靠 fallback 会永远拿到浅色） */
  body[data-ds-dark-theme] {
    --dsw-alias-state-info-bg: rgba(65, 118, 230, 0.12);
    --dsw-alias-state-info-border: rgba(65, 118, 230, 0.25);
    --dsw-alias-state-success-bg: rgba(34, 197, 94, 0.12);
    --dsw-alias-state-success-border: rgba(34, 197, 94, 0.25);
    --dsw-alias-state-warn-bg: rgba(245, 158, 11, 0.12);
    --dsw-alias-state-warn-border: rgba(245, 158, 11, 0.25);
    --dsw-alias-state-error-bg: rgba(239, 68, 68, 0.12);
    --dsw-alias-state-error-border: rgba(239, 68, 68, 0.25);
    --dsw-alias-state-info-primary: #60a5fa;
    --dsw-alias-state-danger-bg: rgba(239, 68, 68, 0.12);
    --dsw-alias-state-danger-primary: #f87171;
    --dsw-alias-border-secondary: #3c3c3d;
  }

  /* 深色模式：直接覆盖弹窗内所有使用 #fff/#ffffff fallback 的内联背景，
     确保即使 CSS 变量未正确继承，弹窗也不会显示白色背景 */
  body[data-ds-dark-theme] #dsh-remote-workspace-modal .dsh-ws-dialog-card,
  body[data-ds-dark-theme] #dsh-remote-workspace-modal .dsh-ws-dialog-card * {
    --dsw-alias-bg-layer-1: #1b1b1c;
    --dsw-alias-bg-layer-2: #2c2c2e;
    --dsw-alias-bg-layer-3: #353638;
    --dsw-alias-border-l2: #3c3c3d;
    --dsw-alias-label-primary: #f9fafb;
    --dsw-alias-label-secondary: #adb2b8;
    --dsw-alias-label-tertiary: #81858c;
    --dsw-alias-brand-primary: #f9fafb;
    --dsw-alias-label-primary-foreground: #0f1115;
  }
`;
