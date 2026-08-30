// dsh-bridge 客户端插件：设置页「远程访问」面板

// 兼容非 HTTPS 环境（如手机局域网 HTTP 访问）：为非安全上下文补齐 crypto.randomUUID
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function() {
      if (typeof window.crypto.getRandomValues === 'function') {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c) {
          return (c ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> (c / 4)).toString(16);
        });
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

import { BRIDGE_RPC_CHANNEL, BRIDGE_ENDPOINTS } from '../lib/bridge-rpc-constants.js';

let _globalAdminToken = '';
function setGlobalAdminToken(t) {
  _globalAdminToken = t || '';
  if (typeof window !== 'undefined') {
    try {
      if (t) sessionStorage.setItem('dsh_admin_token', t);
      else sessionStorage.removeItem('dsh_admin_token');
    } catch {}
  }
}

function getGlobalAdminToken() {
  if (_globalAdminToken) return _globalAdminToken;
  if (typeof window !== 'undefined') {
    try {
      const saved = sessionStorage.getItem('dsh_admin_token');
      if (saved) {
        _globalAdminToken = saved;
        return saved;
      }
    } catch {}
  }
  return '';
}

function isLocalEnvironment() {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname || '';
  const proto = window.location.protocol || '';
  return (
    host === '127.0.0.1' ||
    host === 'localhost' ||
    host === '::1' ||
    host === '' ||
    proto === 'file:' ||
    proto === 'vscode-webview:' ||
    proto === 'app:' ||
    typeof window.__DSH_ELECTRON__ !== 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Electron'))
  );
}

const GITHUB_URL = 'https://github.com/wenbin-wb/dsh-bridge';
const RELEASES_URL = 'https://github.com/wenbin-wb/dsh-bridge/releases';
const ISSUES_URL = 'https://github.com/wenbin-wb/dsh-bridge/issues/new';
const TUNNEL_DOCS_URL = 'https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/custom-tunnel.md';

// 生成升级命令（拼接具体版本号；用 add 而非 update，update --latest 受已安装依赖版本约束可能无法升级到最新版）
function upgradeCommands(latest) {
  const spec = `@wenbin_wb/dsh-bridge@${latest}`;
  return [
    { id: 'dsh',    cmd: `dsh plugin --profile web add ${spec}` },
    { id: 'npx',    cmd: `npx --yes @deepseek-ai/dsh plugin --profile web add ${spec}` },
  ];
}

const name = 'dsh-bridge';
const inject = ['slots', 'connection', 'workspaces', 'sessions'];

// semver 比较：a > b
function semverGt(a, b) {
  const parse = (v) => {
    const [main = '', pre = ''] = String(v).split('-');
    const [maj = 0, min = 0, pat = 0] = main.split('.').map(Number);
    return { maj, min, pat, pre };
  };
  const av = parse(a), bv = parse(b);
  if (av.maj !== bv.maj) return av.maj > bv.maj;
  if (av.min !== bv.min) return av.min > bv.min;
  if (av.pat !== bv.pat) return av.pat > bv.pat;
  if (!av.pre && bv.pre) return true;
  if (av.pre && !bv.pre) return false;
  return av.pre > bv.pre;
}

const s = {
  card:     { background: 'var(--dsw-alias-bg-layer-2,#f9fafb)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, boxSizing: 'border-box' },
  block:    { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 12, paddingTop: 12 },
  muted:    { color: 'var(--dsw-alias-label-tertiary,#8b93a1)', fontSize: 12, lineHeight: 1.5 },
  label:    { color: 'var(--dsw-alias-label-primary,currentColor)', fontSize: 13, fontWeight: 500 },
  code:     { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary,currentColor)' },
  btnPri:   { font: 'inherit', cursor: 'pointer', border: 'none', background: 'var(--dsw-alias-brand-primary,#4f6ef7)', color: 'var(--dsw-alias-label-primary-foreground,#fff)', height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnGhost: { font: 'inherit', cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-2,#f9fafb)', color: 'var(--dsw-alias-label-primary,currentColor)', height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' },
  btnLink:  { font: 'inherit', cursor: 'pointer', border: 'none', background: 'none', color: 'var(--dsw-alias-brand-primary,#4f6ef7)', fontSize: 12, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' },
  qr:       { width: 200, height: 200, maxWidth: '100%', borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', margin: '8px 0', display: 'block', background: '#ffffff', padding: 6, boxSizing: 'border-box' },
  tag:      { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'max-content', lineHeight: 1.4 },
  input:    { width: '100%', font: 'inherit', fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-2,#f9fafb)', color: 'var(--dsw-alias-label-primary,currentColor)', outline: 'none', boxSizing: 'border-box' },
  warn:     { background: 'var(--dsw-alias-state-warn-bg,#fffbeb)', border: '1px solid var(--dsw-alias-state-warn-border,#fde68a)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--dsw-alias-state-warn-primary,#92400e)', lineHeight: 1.6 },
  tip:      { background: 'var(--dsw-alias-bg-layer-2,#f9fafb)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.6 },
};

// ---- 官方品牌与 UI SVG 图标 ----

const Icons = {
  wechat: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M8.5 2C4.36 2 1 4.91 1 8.5c0 2.01 1.05 3.81 2.69 4.97l-.69 2.06 2.45-1.22c.94.43 1.98.69 3.05.69.21 0 .42-.01.62-.03-.23-.62-.37-1.28-.37-1.97 0-3.59 3.36-6.5 7.5-6.5.21 0 .41.01.62.03C15.87 4.54 12.44 2 8.5 2zM6 6.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm7.5 3.5c-3.59 0-6.5 2.46-6.5 5.5 0 1.66.86 3.14 2.21 4.1l-.56 1.69 2.01-1c.78.36 1.64.57 2.54.57 3.59 0 6.5-2.46 6.5-5.5s-2.91-5.5-6.5-5.5zm-2 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z' })
  ),
  qq: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M12 2C7.58 2 4 5.37 4 9.53c0 1.95.78 3.73 2.07 5.07-.37 1.15-.99 2.19-1.8 3.08-.18.2-.04.52.23.52 2.22 0 3.99-1.07 4.9-1.86.8.25 1.66.39 2.6.39 4.42 0 8-3.37 8-7.53S16.42 2 12 2zm-3 8a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm6 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z' })
  ),
  feishu: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M12 2.5L3.5 11.2l6.8 1.8 2.2 6.5 1.8-4.7 5.2-1.4L12 2.5zm-.8 11.1l-4.1-1.1 6.5-6.6-4.2 8.3 1.8-.6z' })
  ),
  telegram: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z' })
  ),
  lan: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.29 19.3a1 1 0 0 0 1.41 1.41l1.7-1.7C9.02 19.64 10.46 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' })
  ),
  tunnel: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z' })
  ),
  security: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z' })
  ),
  bot: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z' })
  ),
  github: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 13, height: 13, fill: 'currentColor', ...props },
    React.createElement('path', { d: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' })
  ),
  refresh: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props },
    React.createElement('path', { d: 'M23 4v6h-6M1 20v-6h6' }),
    React.createElement('path', { d: 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' })
  ),
  check: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', ...props },
    React.createElement('polyline', { points: '20 6 9 17 4 12' })
  ),
  ops: (props) => React.createElement('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props },
    React.createElement('circle', { cx: 12, cy: 12, r: 3 }),
    React.createElement('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' })
  ),
};

// ---- 子组件 ----

// 通用复制 hook：返回 [copied, copy]，copy(text) 复制文本并短暂显示成功状态
function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback((text) => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    // 降级方案：使用 document.execCommand (HTTP 环境下 Clipboard API 不可用)
    function fallbackCopy() {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) done();
    }
  }, []);
  return [copied, copy];
}

function StatusTag({ running, status }) {
  let bg = 'var(--dsw-alias-bg-layer-2,#f3f4f6)';
  let color = 'var(--dsw-alias-label-secondary,#6b7280)';
  let text = running ? '运行中' : '未启动';

  if (status === 'connected') {
    bg = 'var(--dsw-alias-state-success-bg,#ecfdf5)';
    color = 'var(--dsw-alias-state-success-primary,#059669)';
    text = '已连接';
  } else if (status === 'starting') {
    bg = 'var(--dsw-alias-state-info-bg,#eff6ff)';
    color = 'var(--dsw-alias-state-info-primary,#3b82f6)';
    text = '连接中…';
  } else if (status === 'reconnecting') {
    bg = 'var(--dsw-alias-state-warn-bg,#fffbeb)';
    color = 'var(--dsw-alias-state-warn-primary,#d97706)';
    text = '重连中…';
  } else if (status === 'paused') {
    bg = 'var(--dsw-alias-state-warn-bg,#fffbeb)';
    color = 'var(--dsw-alias-state-warn-primary,#d97706)';
    text = '暂停中';
  } else if (status === 'error') {
    bg = 'var(--dsw-alias-state-error-bg,#fef2f2)';
    color = 'var(--dsw-alias-state-error-primary,#dc2626)';
    text = '异常';
  } else if (running) {
    bg = 'var(--dsw-alias-state-success-bg,#ecfdf5)';
    color = 'var(--dsw-alias-state-success-primary,#059669)';
    text = '运行中';
  }

  return React.createElement('span', {
    style: { ...s.tag, background: bg, color },
  }, text);
}

function QrBlock({ url, qr, onReset, auth, onNavigateSecurity }) {
  const [copied, setCopied] = React.useState(false);
  const [showQr, setShowQr] = React.useState(true);

  const copy = React.useCallback(() => {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    
    // 降级方案：使用 document.execCommand (HTTP 环境下 Clipboard API 不可用)
    function fallbackCopy() {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [url]);

  const toggleQr = React.useCallback(() => setShowQr(v => !v), []);

  return React.createElement('div', { style: { marginTop: 10 } },
    auth?.enabled
      ? React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '6px 10px',
            background: 'var(--dsw-alias-state-success-bg,#ecfdf5)',
            border: '1px solid var(--dsw-alias-state-success-primary,#10b981)',
            borderRadius: 8, fontSize: 12, color: 'var(--dsw-alias-state-success-primary,#059669)',
            marginBottom: 8, fontWeight: 500, flexWrap: 'wrap',
            cursor: onNavigateSecurity ? 'pointer' : 'default',
          },
          onClick: onNavigateSecurity,
          title: onNavigateSecurity ? '点击前往「安全认证」配置' : undefined,
        },
          React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, '🛡️ 访问安全认证已生效 · 扫码设备免密'),
          onNavigateSecurity && React.createElement('span', { style: { textDecoration: 'underline', fontSize: 11, fontWeight: 600 } }, '设置 ➔')
        )
      : React.createElement('div', {
          style: { ...s.warn, cursor: onNavigateSecurity ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
          onClick: onNavigateSecurity,
          title: onNavigateSecurity ? '点击前往「安全认证」开启访问保护' : undefined,
        },
          React.createElement('span', null, '⚠️ 当前未开启访问认证，建议在「安全认证」开启密码或扫码保护。'),
          onNavigateSecurity && React.createElement('span', { style: { fontWeight: 600, textDecoration: 'underline', fontSize: 12, color: 'var(--dsw-alias-brand-primary,#4f6ef7)' } }, '去开启 ➔')
        ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 } },
      React.createElement('div', { style: { padding: '6px 10px', background: 'var(--dsw-alias-bg-layer-1,#ffffff)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 8 } },
        React.createElement('code', { style: { ...s.code, display: 'block', wordBreak: 'break-all', fontSize: 12, lineHeight: 1.5 } }, url),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        React.createElement('button', {
          style: { ...s.btnGhost, height: 28, padding: '0 12px', fontSize: 12, flex: '1 1 auto', justifyContent: 'center' },
          onClick: copy,
        }, copied ? '✓ 已复制' : '复制链接'),
        React.createElement('button', {
          style: { ...s.btnGhost, height: 28, padding: '0 12px', fontSize: 12, flex: '1 1 auto', justifyContent: 'center' },
          onClick: toggleQr,
        }, showQr ? '隐藏二维码' : '显示二维码'),
      ),
    ),
    showQr && qr && React.createElement('div', { style: { marginTop: 10 } },
      React.createElement('img', { src: qr, alt: 'QR', style: s.qr }),
      React.createElement('div', { style: { ...s.muted, marginTop: 4 } }, '请在私密环境下使用'),
      React.createElement('div', { style: { ...s.muted, marginTop: 4, fontSize: 11, color: 'var(--dsw-alias-brand-primary, #4f6ef7)' } },
        '📱 提示：手机浏览器扫码打开后，在菜单点击「添加到主屏幕」即可作为独立全屏 App 运行。'
      ),
    ),
    onReset && React.createElement('div', { style: { marginTop: 8 } },
      React.createElement('button', {
        style: { ...s.btnGhost, fontSize: 12, height: 28 },
        onClick: onReset,
        title: '关闭隧道并重新开启，可获得新的 URL',
      }, '🔄 重置链接'),
    ),
  );
}

const LanNetworkSelector = React.memo(function LanNetworkSelector({ lan, onSelectIp }) {
  const interfaces = lan?.interfaces || [];
  const selectedIp = lan?.selectedIp || '';
  const currentIp = lan?.ip || '';
  const [switching, setSwitching] = React.useState(false);

  if (!interfaces || interfaces.length <= 1) return null;

  const handleChange = async (e) => {
    const val = e.target.value;
    setSwitching(true);
    try {
      await onSelectIp(val || null);
    } finally {
      setSwitching(false);
    }
  };

  return React.createElement('div', {
    style: {
      ...s.block,
      background: 'var(--dsw-alias-bg-layer-2, rgba(243, 244, 246, 0.6))',
      padding: '10px 12px',
      borderRadius: 8,
      border: '1px solid var(--dsw-alias-border-l2, #e5e7eb)',
      marginTop: 8,
      marginBottom: 6,
    },
  },
    React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--dsw-alias-label-primary, currentColor)',
      },
    },
      React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
        '🛜 局域网网卡 / IP 选择'
      ),
      switching && React.createElement('span', {
        style: { fontSize: 11, color: 'var(--dsw-alias-brand-primary, #4f6ef7)' },
      }, '切换中…')
    ),
    React.createElement('div', { style: { ...s.muted, fontSize: 11, marginBottom: 6 } },
      '检测到主机存在多张网卡（如物理 Wi-Fi、以太网、WSL 或虚拟机）。若默认 IP 无法被移动端访问，可手动切换：'
    ),
    React.createElement('select', {
      style: {
        ...s.input,
        height: 32,
        fontSize: 12,
        padding: '0 8px',
        background: 'var(--dsw-alias-bg-layer-1, #ffffff)',
        cursor: 'pointer',
      },
      value: selectedIp,
      onChange: handleChange,
      disabled: switching,
    },
      React.createElement('option', { value: '' }, `⚡ 自动推荐 (${interfaces[0]?.address || currentIp} · ${interfaces[0]?.label || interfaces[0]?.name || ''})`),
      interfaces.map((iface) => React.createElement('option', {
        key: `${iface.name}-${iface.address}`,
        value: iface.address,
      }, `${iface.address} · ${iface.label || iface.name}${iface.isVirtual ? ' [虚拟/WSL]' : ''}`)),
    ),
  );
});

const CustomTunnelGuide = React.memo(function CustomTunnelGuide() {
  return React.createElement('div', { style: s.block },
    React.createElement('a', {
      href: TUNNEL_DOCS_URL,
      target: '_blank',
      rel: 'noreferrer',
      style: { ...s.btnGhost, fontSize: 12, height: 28, display: 'inline-flex' },
    }, '查看自建隧道服务器搭建教程'),
  );
});

const CustomTunnelConfigForm = React.memo(function CustomTunnelConfigForm({ serverUrl: initUrl, accessToken: initToken, onSave }) {
  const [serverUrl, setServerUrl]     = React.useState(initUrl ?? '');
  const [accessToken, setAccessToken] = React.useState(initToken ?? '');
  const [saving, setSaving]           = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (!syncedRef.current && (initUrl || initToken)) {
      setServerUrl(initUrl ?? '');
      setAccessToken(initToken ?? '');
      syncedRef.current = true;
    }
  }, [initUrl, initToken]);

  const dirty = serverUrl !== (initUrl ?? '') || accessToken !== (initToken ?? '');
  const [saveErr, setSaveErr] = React.useState(null);
  const handleSave = React.useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveErr(null);
    try {
      await onSave(serverUrl, accessToken);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setSaveErr(e.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  }, [onSave, serverUrl, accessToken]);
  const handleUrlChange   = React.useCallback((e) => { setServerUrl(e.target.value); setSaveSuccess(false); setSaveErr(null); }, []);
  const handleTokenChange = React.useCallback((e) => { setAccessToken(e.target.value); setSaveSuccess(false); setSaveErr(null); }, []);

  return React.createElement('div', { style: s.block },
    React.createElement('div', { style: { ...s.muted, marginBottom: 8 } }, '隧道服务器配置'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      React.createElement('input', {
        style: s.input,
        placeholder: 'WebSocket 地址，例如 wss://tunnel.example.com/connect',
        value: serverUrl,
        onChange: handleUrlChange,
        onKeyDown: (e) => { if (e.key === 'Enter' && dirty && !saving) handleSave(); },
        disabled: saving,
      }),
      React.createElement('input', {
        style: s.input,
        type: 'password',
        placeholder: '隧道服务端连接令牌（Tunnel Access Token）',
        value: accessToken,
        onChange: handleTokenChange,
        onKeyDown: (e) => { if (e.key === 'Enter' && dirty && !saving) handleSave(); },
        disabled: saving,
      }),
      saveErr && React.createElement('div', { style: s.err }, `❌ ${saveErr}`),
      React.createElement('div', { style: { ...s.muted, fontSize: 11 } },
        '💡 用于与您的 VPS 隧道服务端建立反向通道（与 Web 网页访客访问密码互相独立）。'
      ),
      React.createElement('button', {
        style: {
          ...s.btnPri,
          alignSelf: 'flex-start',
          opacity: (!dirty || saving) ? (saveSuccess ? 1 : 0.5) : 1,
          background: saveSuccess ? 'var(--dsw-alias-state-success-primary,#059669)' : undefined,
        },
        disabled: (!dirty && !saveSuccess) || saving,
        onClick: handleSave,
      }, saving ? '保存中…' : saveSuccess ? '✓ 已保存' : '保存配置'),
    ),
  );
});

const TunnelCard = React.memo(function TunnelCard({
  title,
  desc,
  data,
  autoStart,
  onToggleAutoStart,
  onStart,
  onStop,
  onReset,
  auth,
  onNavigateSecurity,
  children
}) {
  const { running, configured, url, qr, state } = data ?? {};
  const phase = state?.phase ?? 'idle';

  return React.createElement('div', { style: s.card },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 } },
      React.createElement('div', { style: { flex: '1 1 auto', minWidth: 0 } },
        React.createElement('div', { style: s.label }, title),
        React.createElement('div', { style: { ...s.muted, marginTop: 2 } }, desc),
      ),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 } },
        React.createElement(StatusTag, { running }),
        onToggleAutoStart && React.createElement('label', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--dsw-alias-label-secondary,#6b7280)',
            cursor: 'pointer',
            userSelect: 'none',
          },
          title: 'DSH 启动时自动恢复该隧道的运行状态',
        },
          React.createElement('input', {
            type: 'checkbox',
            checked: Boolean(autoStart),
            onChange: (e) => onToggleAutoStart(e.target.checked),
          }),
          '随 DSH 启动自动开启',
        ),
      ),
    ),
    children,
    phase !== 'idle' && phase !== 'ready' && React.createElement('div', {
      style: {
        ...s.block, fontSize: 12,
        color: phase === 'error' ? 'var(--dsw-alias-state-error-primary,#dc2626)' : 'var(--dsw-alias-label-secondary,#6b7280)',
      },
    }, state?.detail ?? phase),
    url && React.createElement(QrBlock, { url, qr, onReset, auth, onNavigateSecurity }),
    (onStart || onStop) && React.createElement('div', {
      style: { ...s.block, display: 'flex', gap: 8, flexWrap: 'wrap' },
    },
      !running && onStart && React.createElement('button', {
        style: { ...s.btnPri, opacity: configured === false ? 0.4 : 1 },
        onClick: onStart,
        disabled: configured === false || phase === 'connecting' || phase === 'downloading',
        title: configured === false ? '请先保存服务器配置' : '',
      }, phase === 'connecting' ? '连接中…' : phase === 'downloading' ? '下载中…' : '开启'),
      running && onStop && React.createElement('button', { style: s.btnGhost, onClick: onStop }, '关闭'),
    ),
  );
});

// Cloudflare 命名隧道（固定域名 / Token）高级配置表单
const CloudflareConfigForm = React.memo(function CloudflareConfigForm({ token, hostname, onSave }) {
  const [open, setOpen] = React.useState(Boolean(token || hostname));
  const [tokenVal, setTokenVal] = React.useState(token || '');
  const [hostnameVal, setHostnameVal] = React.useState(hostname || '');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  React.useEffect(() => {
    setTokenVal(token || '');
    setHostnameVal(hostname || '');
  }, [token, hostname]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await onSave({ token: tokenVal, hostname: hostnameVal });
      setMsg({ ok: true, text: '✓ 固定域名配置已保存' });
    } catch (err) {
      setMsg({ ok: false, text: err.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  return React.createElement('div', {
    style: {
      ...s.block,
      borderTop: '1px solid var(--dsw-alias-border-secondary, #e5e7eb)',
      paddingTop: 10,
      marginTop: 10,
    },
  },
    React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' },
      onClick: () => setOpen(v => !v),
    },
      React.createElement('div', { style: { fontSize: 12, fontWeight: 500, color: 'var(--dsw-alias-brand-primary, #3b82f6)' } },
        '⚙️ 高级配置：固定域名 (Cloudflare Token) ',
        (token || hostname) && React.createElement('span', { style: { fontSize: 11, color: 'var(--dsw-alias-state-success-primary, #059669)', fontWeight: 400 } }, '● 已配置固定域名')
      ),
      React.createElement('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #9ca3af)' } }, open ? '▴ 折叠' : '▾ 展开'),
    ),
    open && React.createElement('form', { onSubmit: handleSave, style: { marginTop: 10 } },
      React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #6b7280)', marginBottom: 8, lineHeight: 1.5 } },
        '在 Cloudflare Zero Trust 控制台创建 Tunnel 即可获取专属 Token 并绑定自己的域名（如 dsh.yourname.com），每次重启 URL 永不变更。不填则使用默认免登录临时随机域名。'
      ),
      React.createElement('div', { style: { marginBottom: 8 } },
        React.createElement('input', {
          style: s.input,
          type: 'text',
          placeholder: '自定义固定域名 (例如: dsh.yourdomain.com)',
          value: hostnameVal,
          onChange: (e) => setHostnameVal(e.target.value),
        }),
      ),
      React.createElement('div', { style: { marginBottom: 8 } },
        React.createElement('input', {
          style: s.input,
          type: 'password',
          placeholder: 'Tunnel Token (例如: eyJhIjoi...)',
          value: tokenVal,
          onChange: (e) => setTokenVal(e.target.value),
        }),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
        React.createElement('button', {
          type: 'submit',
          style: { ...s.btnPri, height: 28, fontSize: 12, padding: '0 12px' },
          disabled: saving,
        }, saving ? '保存中…' : '保存固定域名配置'),
        (tokenVal || hostnameVal) && React.createElement('button', {
          type: 'button',
          style: { ...s.btnGhost, height: 28, fontSize: 12, padding: '0 10px' },
          onClick: () => {
            setTokenVal('');
            setHostnameVal('');
            onSave({ token: '', hostname: '' });
          },
        }, '清除'),
        msg && React.createElement('span', {
          style: { fontSize: 12, color: msg.ok ? 'var(--dsw-alias-state-success-primary, #059669)' : 'var(--dsw-alias-state-error-primary, #dc2626)' },
        }, msg.text),
      ),
    ),
  );
});

// ---- 访问安全认证卡片 ----

const AccessAuthCard = React.memo(function AccessAuthCard({ auth, rpcCall, onUpdate }) {
  const [enabled, setEnabled] = React.useState(auth?.enabled ?? false);
  const [mode, setMode] = React.useState(auth?.mode ?? 'token_and_password');
  const [scope, setScope] = React.useState(auth?.scope ?? 'all');
  const [adminPolicy, setAdminPolicy] = React.useState(auth?.adminPolicy ?? 'password_unlock');

  // 1. 访客访问密码状态
  const [accessPassword, setAccessPassword] = React.useState('');
  const [showAccessPassword, setShowAccessPassword] = React.useState(false);
  const [savingAccess, setSavingAccess] = React.useState(false);
  const [saveAccessSuccess, setSaveAccessSuccess] = React.useState(false);
  const [msgAccess, setMsgAccess] = React.useState(null);

  // 2. 后台管理密码状态
  const [adminPassword, setAdminPassword] = React.useState('');
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
  const [savingAdmin, setSavingAdmin] = React.useState(false);
  const [saveAdminSuccess, setSaveAdminSuccess] = React.useState(false);
  const [msgAdmin, setMsgAdmin] = React.useState(null);

  const [topMsg, setTopMsg] = React.useState(null);

  React.useEffect(() => {
    if (auth) {
      setEnabled(auth.enabled ?? false);
      setMode(auth.mode ?? 'token_and_password');
      setScope(auth.scope ?? 'all');
      setAdminPolicy(auth.adminPolicy ?? 'password_unlock');
    }
  }, [auth]);

  const handleToggleEnabled = async () => {
    const prev = enabled;
    const next = !enabled;
    setEnabled(next);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { enabled: next });
      if (!res?.ok) throw new Error(res?.error?.message || '更新失败');
      setTopMsg({ ok: true, text: next ? '✓ 访问安全认证已开启（现有登录态已刷新）' : '✓ 访问安全认证已关闭' });
      onUpdate?.();
    } catch (e) {
      setEnabled(prev);
      setTopMsg({ ok: false, text: e.message || '更新失败' });
    }
  };

  const handleChangeMode = async (m) => {
    const prev = mode;
    setMode(m);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { mode: m });
      if (!res?.ok) throw new Error(res?.error?.message || '更新失败');
      setTopMsg({ ok: true, text: '✓ 外部验证模式已切换，已刷新全域登录态' });
      onUpdate?.();
    } catch (e) {
      setMode(prev);
      setTopMsg({ ok: false, text: e.message || '更新失败' });
    }
  };

  const handleChangeScope = async (sc) => {
    const prev = scope;
    setScope(sc);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { scope: sc });
      if (!res?.ok) throw new Error(res?.error?.message || '更新失败');
      setTopMsg({ ok: true, text: '✓ 防护生效范围已更新' });
      onUpdate?.();
    } catch (e) {
      setScope(prev);
      setTopMsg({ ok: false, text: e.message || '更新失败' });
    }
  };

  const handleChangeAdminPolicy = async (pol) => {
    const prev = adminPolicy;
    setAdminPolicy(pol);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminPolicy: pol });
      if (!res?.ok) throw new Error(res?.error?.message || '更新失败');
      setTopMsg({ ok: true, text: '✓ 远程管理防篡改策略已更新' });
      onUpdate?.();
    } catch (e) {
      setAdminPolicy(prev);
      setTopMsg({ ok: false, text: e.message || '更新失败' });
    }
  };

  // 保存访客访问密码
  const handleSaveAccessPassword = async () => {
    setSavingAccess(true);
    setMsgAccess(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { password: accessPassword });
      if (res?.ok) {
        setSaveAccessSuccess(true);
        setMsgAccess({ ok: true, text: '✓ 访客访问密码已成功保存！原有的历史访客会话已全部安全刷新。' });
        setAccessPassword('');
        setTimeout(() => setSaveAccessSuccess(false), 3500);
        onUpdate?.();
      } else {
        setMsgAccess({ ok: false, text: res?.error?.message || '保存失败' });
      }
    } catch (e) {
      setMsgAccess({ ok: false, text: e.message || '保存失败' });
    } finally {
      setSavingAccess(false);
    }
  };

  // 保存后台管理密码
  const handleSaveAdminPassword = async () => {
    setSavingAdmin(true);
    setMsgAdmin(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminPassword });
      if (res?.ok) {
        setSaveAdminSuccess(true);
        setMsgAdmin({ ok: true, text: '✓ 后台管理密码已成功保存！远程管理解锁状态已重置生效。' });
        setAdminPassword('');
        setTimeout(() => setSaveAdminSuccess(false), 3500);
        onUpdate?.();
      } else {
        setMsgAdmin({ ok: false, text: res?.error?.message || '保存失败' });
      }
    } catch (e) {
      setMsgAdmin({ ok: false, text: e.message || '保存失败' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('重置后，之前包含旧 Token 的二维码和分享链接将立即失效。是否确认重置？')) return;
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authRegenerateToken, {});
      if (!res?.ok) throw new Error(res?.error?.message || '重置失败');
      setTopMsg({ ok: true, text: '✓ 安全 Token 已重置，二维码与专属链接已刷新' });
      onUpdate?.();
    } catch (e) {
      setTopMsg({ ok: false, text: e.message || '重置失败' });
    }
  };

  const scopeLabel = scope === 'all' ? '全部通道 (局域网+公网)' : scope === 'public_only' ? '仅公网隧道' : '仅局域网';
  const modeLabel = mode === 'token_and_password' ? '扫码免密 + 密码' : mode === 'password_only' ? '仅密码登录' : '仅安全 Token';
  const adminLabel = adminPolicy === 'password_unlock' ? '需密码解锁' : adminPolicy === 'local_only' ? '仅限电脑本机管理' : '宽松模式';

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
    // ---- 顶部总控与状态概览卡片 ----
    React.createElement('div', { style: s.card },
      React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
      },
        React.createElement('div', { style: { flex: '1 1 260px' } },
          React.createElement('div', { style: { ...s.label, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 } },
            '🔐 全局访问安全防护体系',
          ),
          React.createElement('div', { style: { ...s.muted, marginTop: 4 } },
            '集成外部访问门禁拦截与管理后台防篡改控制，双重守护远程会话与网络配置安全',
          ),
        ),
        React.createElement('button', {
          style: { ...(enabled ? s.btnPri : s.btnGhost), whiteSpace: 'nowrap', flexShrink: 0 },
          onClick: handleToggleEnabled,
        }, enabled ? '✓ 已启用安全防护' : '未开启安全防护'),
      ),

      enabled && React.createElement('div', {
        style: {
          display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 12,
          borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
        },
      },
        React.createElement('div', {
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 16, fontSize: 11, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)',
            color: 'var(--dsw-alias-label-secondary,#4b5563)',
          },
        }, '🌐 保护范围: ', React.createElement('strong', { style: { color: 'var(--dsw-alias-brand-primary,#4f6ef7)' } }, scopeLabel)),
        React.createElement('div', {
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 16, fontSize: 11, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)',
            color: 'var(--dsw-alias-label-secondary,#4b5563)',
          },
        }, '🔑 外部验证: ', React.createElement('strong', { style: { color: 'var(--dsw-alias-brand-primary,#4f6ef7)' } }, modeLabel)),
        React.createElement('div', {
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 16, fontSize: 11, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)',
            color: 'var(--dsw-alias-label-secondary,#4b5563)',
          },
        }, '🔒 后台防篡改: ', React.createElement('strong', { style: { color: 'var(--dsw-alias-state-success-primary,#059669)' } }, adminLabel)),
      ),

      topMsg && React.createElement('div', {
        style: {
          marginTop: 12, padding: '8px 12px', borderRadius: 6, fontSize: 12,
          background: topMsg.ok ? 'var(--dsw-alias-state-success-bg,#ecfdf5)' : 'var(--dsw-alias-state-error-bg,#fef2f2)',
          color: topMsg.ok ? 'var(--dsw-alias-state-success-primary,#059669)' : 'var(--dsw-alias-state-error-primary,#dc2626)',
        },
      }, topMsg.text),
    ),

    enabled && React.createElement(React.Fragment, null,
      // =========================================================================
      // ---- 第一道防线：外部访问门禁（控制谁能进入 Web 界面使用 AI） ----
      // =========================================================================
      React.createElement('div', { style: s.card },
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement('div', { style: { ...s.label, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 } },
            '🛡️ 第一道防线：外部访问门禁（控制谁能使用 AI）',
          ),
          React.createElement('div', { style: { ...s.muted, marginTop: 3 } },
            '控制外部设备通过局域网 IP 或公网隧道（Cloudflare/自建隧道）进入 DSH 聊天界面时的身份验证方式',
          ),
        ),

        // 验证模式选择
        React.createElement('div', { style: { marginBottom: 16 } },
          React.createElement('label', { style: { ...s.label, display: 'block', marginBottom: 8, fontSize: 12 } }, '验证模式选择'),
          React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            [
              { id: 'token_and_password', title: '🟢 扫码免密 + 密码认证 (推荐)', desc: '二维码自带专属 Token 扫码秒进；直接输 IP/公网域名需输密码' },
              { id: 'password_only', title: '🔑 仅密码 / PIN 码登录', desc: '所有外部访问必须手动输入访问密码方可进入' },
              { id: 'token_only', title: '🎫 仅安全 Token 免密', desc: '仅持有带安全 Token 的二维码或专属分享链接方可进入' },
            ].map(opt => {
              const isSel = mode === opt.id;
              return React.createElement('div', {
                key: opt.id,
                onClick: () => handleChangeMode(opt.id),
                style: {
                  flex: '1 1 200px',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${isSel ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : 'var(--dsw-alias-border-l2,#e5e7eb)'}`,
                  background: isSel ? 'var(--dsw-alias-state-info-bg,#eff6ff)' : 'var(--dsw-alias-bg-layer-2,#f9fafb)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                },
              },
                React.createElement('div', { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : 'var(--dsw-alias-label-primary,currentColor)' } }, opt.title),
                React.createElement('div', { style: { ...s.muted, fontSize: 11, marginTop: 4 } }, opt.desc),
              );
            })
          ),
        ),

        // 防护生效范围
        React.createElement('div', { style: { marginBottom: 16 } },
          React.createElement('label', { style: { ...s.label, display: 'block', marginBottom: 8, fontSize: 12 } }, '防护生效通道'),
          React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            [
              { id: 'all', title: '全部通道防护 (推荐)', desc: '局域网 IP 直连与公网隧道全部受安全保护' },
              { id: 'public_only', title: '仅公网隧道开启防护', desc: '局域网内设备直接免密直连，公网隧道强制验证' },
              { id: 'lan_only', title: '仅局域网开启防护', desc: '仅局域网直连需验证，公网隧道不开启' },
            ].map(opt => {
              const isSel = scope === opt.id;
              return React.createElement('div', {
                key: opt.id,
                onClick: () => handleChangeScope(opt.id),
                style: {
                  flex: '1 1 180px',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1px solid ${isSel ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : 'var(--dsw-alias-border-l2,#e5e7eb)'}`,
                  background: isSel ? 'var(--dsw-alias-state-info-bg,#eff6ff)' : 'var(--dsw-alias-bg-layer-2,#f9fafb)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                },
              },
                React.createElement('div', { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : 'var(--dsw-alias-label-primary,currentColor)' } }, opt.title),
                React.createElement('div', { style: { ...s.muted, fontSize: 11, marginTop: 3 } }, opt.desc),
              );
            })
          ),
        ),

        // 访客访问密码输入框 (当非 token_only 时展示)
        mode !== 'token_only' && React.createElement('div', { style: { marginBottom: 16 } },
          React.createElement('label', { style: { ...s.label, display: 'block', marginBottom: 6, fontSize: 12 } },
            `设置外部访客访问密码 ${auth?.hasPassword ? '(✓ 已设置访客密码)' : '(⚠️ 尚未设置密码，直接输入 IP 将免密)'}`,
          ),
          React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            React.createElement('input', {
              type: showAccessPassword ? 'text' : 'password',
              style: { ...s.input, flex: 1 },
              placeholder: auth?.hasPassword ? '输入新密码以修改（留空保存可清除访客密码）' : '设置外部访客访问密码 / PIN 码',
              value: accessPassword,
              onChange: e => setAccessPassword(e.target.value),
            }),
            React.createElement('button', {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 },
              onClick: () => setShowAccessPassword(v => !v),
            }, showAccessPassword ? '隐藏' : '显示'),
            React.createElement('button', {
              style: {
                ...s.btnPri, height: 32, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
                background: saveAccessSuccess ? '#059669' : 'var(--dsw-alias-brand-primary, #4f6ef7)',
                color: '#ffffff',
                cursor: savingAccess ? 'wait' : 'pointer',
              },
              onClick: handleSaveAccessPassword,
              disabled: savingAccess,
            }, savingAccess ? '保存中…' : saveAccessSuccess ? '✓ 已成功保存！' : '保存访问密码'),
          ),
          React.createElement('div', { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
            '💡 当外部朋友或同事未通过二维码扫码，而是直接输入 IP 或公网域名访问时，需输入此密码登录。'
          ),
          msgAccess && React.createElement('div', {
            style: {
              marginTop: 8, padding: '6px 12px', borderRadius: 6, fontSize: 12,
              background: msgAccess.ok ? 'var(--dsw-alias-state-success-bg,#ecfdf5)' : 'var(--dsw-alias-state-error-bg,#fef2f2)',
              color: msgAccess.ok ? 'var(--dsw-alias-state-success-primary,#059669)' : 'var(--dsw-alias-state-error-primary,#dc2626)',
            },
          }, msgAccess.text),
        ),

        // 免密 Token 管理
        mode !== 'password_only' && React.createElement('div', { style: s.block },
          React.createElement('label', { style: { ...s.label, display: 'block', marginBottom: 6, fontSize: 12 } }, '免密扫码 Token (专属访问凭据)'),
          React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            React.createElement('code', { style: { ...s.code, flex: 1, padding: '6px 10px', background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)' } },
              auth?.secretToken ? `${auth.secretToken.slice(0, 10)}****************` : '未生成'
            ),
            React.createElement('button', {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 },
              onClick: handleRegenerateToken,
              title: '重新生成 Token，使之前分享的旧二维码和链接立即失效',
            }, '🔄 重置安全 Token'),
          ),
          React.createElement('div', { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
            '💡 控制台生成的局域网与公网二维码已自动嵌入此 Token，手机扫码即可免密进入聊天界面（但不赋予后台管理设置权限）。'
          ),
        ),
      ),

      // =========================================================================
      // ---- 第二道防线：后台管理防篡改（控制谁能修改本插件所有设置） ----
      // =========================================================================
      React.createElement('div', { style: s.card },
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement('div', { style: { ...s.label, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 } },
            '🔒 第二道防线：管理后台防篡改（控制谁能修改本插件所有设置）',
          ),
          React.createElement('div', { style: { ...s.muted, marginTop: 3 } },
            '锁定整个插件设置后台（包含局域网、公网隧道、IM 机器人密钥与安全设置），防止他人随意篡改配置',
          ),
        ),

        // 管理员密码设置
        React.createElement('div', { style: { marginBottom: 16 } },
          React.createElement('label', { style: { ...s.label, display: 'block', marginBottom: 6, fontSize: 12 } },
            `设置独立管理员密码 ${auth?.hasAdminPassword ? '(✓ 已设置独立管理密码)' : '(未单独设置，默认使用上述访客访问密码)'}`,
          ),
          React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            React.createElement('input', {
              type: showAdminPassword ? 'text' : 'password',
              style: { ...s.input, flex: 1 },
              placeholder: auth?.hasAdminPassword ? '输入新密码以修改（留空保存可清除独立管理密码）' : '设置后台管理解锁密码（建议与访客密码不同）',
              value: adminPassword,
              onChange: e => setAdminPassword(e.target.value),
            }),
            React.createElement('button', {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 },
              onClick: () => setShowAdminPassword(v => !v),
            }, showAdminPassword ? '隐藏' : '显示'),
            React.createElement('button', {
              style: {
                ...s.btnPri, height: 32, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
                background: saveAdminSuccess ? '#059669' : 'var(--dsw-alias-brand-primary, #4f6ef7)',
                color: '#ffffff',
                cursor: savingAdmin ? 'wait' : 'pointer',
              },
              onClick: handleSaveAdminPassword,
              disabled: savingAdmin,
            }, savingAdmin ? '保存中…' : saveAdminSuccess ? '✓ 已成功保存！' : '保存管理密码'),
          ),
          React.createElement('div', { style: { ...s.muted, fontSize: 11, marginTop: 4, color: 'var(--dsw-alias-brand-primary,#4f6ef7)' } },
            '🔑 核心作用：用于远程设备进入设置后台时的解锁验证。设置后，即便把访问密码告知他人，他人也无法进入设置后台改配置。'
          ),
          msgAdmin && React.createElement('div', {
            style: {
              marginTop: 8, padding: '6px 12px', borderRadius: 6, fontSize: 12,
              background: msgAdmin.ok ? 'var(--dsw-alias-state-success-bg,#ecfdf5)' : 'var(--dsw-alias-state-error-bg,#fef2f2)',
              color: msgAdmin.ok ? 'var(--dsw-alias-state-success-primary,#059669)' : 'var(--dsw-alias-state-error-primary,#dc2626)',
            },
          }, msgAdmin.text),
        ),

        // 远程管理权限控制策略
        React.createElement('div', { style: s.block },
          React.createElement('label', { style: { ...s.label, display: 'block', marginBottom: 8, fontSize: 12 } }, '远程设备管理权限策略'),
          React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            [
              { id: 'password_unlock', title: '🔒 需密码解锁 (推荐)', desc: '远程手机/外网打开本插件设置时默认全局锁定，输入管理密码解锁后方可使用' },
              { id: 'local_only', title: '🚫 仅限电脑本机管理 (最严格)', desc: '远程设备彻底锁定整个设置后台，仅允许在 127.0.0.1 电脑本机上操作' },
              { id: 'open', title: '🔓 宽松模式', desc: '任何已通过第一道防线登录的设备均可直接修改所有配置' },
            ].map(opt => {
              const isSel = adminPolicy === opt.id;
              return React.createElement('div', {
                key: opt.id,
                onClick: () => handleChangeAdminPolicy(opt.id),
                style: {
                  flex: '1 1 180px',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${isSel ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : 'var(--dsw-alias-border-l2,#e5e7eb)'}`,
                  background: isSel ? 'var(--dsw-alias-state-info-bg,#eff6ff)' : 'var(--dsw-alias-bg-layer-2,#f9fafb)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                },
              },
                React.createElement('div', { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : 'var(--dsw-alias-label-primary,currentColor)' } }, opt.title),
                React.createElement('div', { style: { ...s.muted, fontSize: 11, marginTop: 4 } }, opt.desc),
              );
            })
          ),
        ),
      ),
    ),
  );
});

// ---- 通用 IM 平台卡片 ----

function PlatformCard({ platformId, platformName, platformDesc, rpcCall, onStatusChange }) {
  const [platform, setPlatform] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);

  // 高级设置本地草稿
  const [cfgDraft, setCfgDraft] = React.useState(null);
  React.useEffect(() => {
    if (platform?.config && !cfgDraft) {
      setCfgDraft({
        digestIntervalSec:  String(platform.config.digestIntervalSec  ?? 300),
        approvalTimeoutSec: String(platform.config.approvalTimeoutSec ?? 600),
        maxMessageChars:    String((platform.config.maxMessageChars >= 500 ? platform.config.maxMessageChars : null) ?? (platformId === 'telegram' ? 4096 : 2000)),
        sendChunkDelayMs:   String(platform.config.sendChunkDelayMs   ?? 1500),
        appId: platform.config.appId ?? '',
        // Secret 不由后端回传；空值表示沿用已保存密钥
        clientSecret: '',
        appSecret: '',
        domain: platform.config.domain ?? 'feishu',
        botToken: '',
        proxy: platform.config.proxy ?? '',
      });
    }
  }, [platform?.config, platformId]);

  // 向上传递连接状态（供平台列表卡片绿点使用）
  React.useEffect(() => {
    const connected = platform?.status === 'connected' || platform?.status === 'starting' || platform?.status === 'reconnecting';
    onStatusChange?.(connected);
  }, [platform?.status, onStatusChange]);

  const loadInFlightRef = React.useRef(false);
  const seqRef = React.useRef(0);
  const load = React.useCallback(async (quiet = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const currentSeq = ++seqRef.current;
    try {
      // 用通用端点读取平台状态（不执行登录操作，只获取状态）
      const r = await rpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
      if (currentSeq !== seqRef.current) return; // 丢弃过时响应
      if (!r?.ok) throw new Error(r?.error?.message ?? 'RPC failed');
      const allPlatforms = r.value ?? {};
      setPlatform(allPlatforms[platformId] ?? null);
      if (!quiet) setErr(null);
    } catch (e) {
      if (currentSeq === seqRef.current && !quiet) setErr(e.message);
    } finally {
      loadInFlightRef.current = false;
    }
  }, [rpcCall, platformId]);

  // 轮询：登录中（qr/scaned）快速刷新，其余放慢
  React.useEffect(() => {
    load();
    const activeLogin = platform?.login && (platform.login.phase === 'qr' || platform.login.phase === 'scaned');
    const interval = activeLogin ? 1500 : 3000;
    const t = setInterval(() => load(true), interval);
    return () => clearInterval(t);
  }, [load, platform?.login?.phase]);

  const act = React.useCallback(async (endpoint, payload) => {
    setBusy(true);
    try {
      const r = await rpcCall(endpoint, { platformId, ...payload });
      if (!r?.ok) throw new Error(r?.error?.message ?? 'RPC failed');
      setPlatform(r.value);
      setErr(null);
      await load(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [rpcCall, load, platformId]);

  const onLogin = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformLogin, {}), [act]);
  const onStop  = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformStop, {}), [act]);

  // 白名单管理
  const [newId, setNewId] = React.useState('');
  const addAllow = React.useCallback(async () => {
    const id = newId.trim();
    if (!id) return;
    const list = [...(platform?.allowFrom ?? []), id];
    setBusy(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.platformSetAllowFrom, { platformId, allowFrom: list });
      if (!r?.ok) throw new Error(r?.error?.message ?? '添加白名单失败');
      setPlatform(r.value);
      setNewId('');
      setErr(null);
      await load(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [rpcCall, platformId, newId, platform?.allowFrom, load]);
  const removeAllow = React.useCallback(async (id) => {
    const list = (platform?.allowFrom ?? []).filter((x) => x !== id);
    await act(BRIDGE_ENDPOINTS.platformSetAllowFrom, { allowFrom: list });
  }, [act, platform?.allowFrom]);
  const handleNewId = React.useCallback((e) => setNewId(e.target.value), []);

  // 密码明文/密文切换
  const [showSecret, setShowSecret] = React.useState(false);

  // 恢复推荐默认值
  const resetDefaults = React.useCallback(() => {
    setCfgDraft((d) => ({
      ...d,
      digestIntervalSec: '300',
      approvalTimeoutSec: '600',
      maxMessageChars: platformId === 'telegram' ? '4096' : '2000',
      sendChunkDelayMs: '1500',
    }));
  }, [platformId]);

  // 高级设置保存
  const saveConfig = React.useCallback(async () => {
    if (!cfgDraft) return;
    const payload = {
      digestIntervalSec:  Number(cfgDraft.digestIntervalSec),
      approvalTimeoutSec: Number(cfgDraft.approvalTimeoutSec),
      maxMessageChars:    Number(cfgDraft.maxMessageChars),
      sendChunkDelayMs:   Number(cfgDraft.sendChunkDelayMs),
    };
    // QQ / 飞书 / Telegram 平台额外携带凭证
    if (platformId === 'qq') {
      payload.appId = cfgDraft.appId.trim();
      payload.clientSecret = cfgDraft.clientSecret.trim();
    } else if (platformId === 'feishu') {
      payload.appId = cfgDraft.appId.trim();
      payload.appSecret = cfgDraft.appSecret.trim();
      payload.domain = cfgDraft.domain || 'feishu';
    } else if (platformId === 'telegram') {
      payload.botToken = cfgDraft.botToken.trim();
      payload.proxy = cfgDraft.proxy.trim();
    }
    await act(BRIDGE_ENDPOINTS.platformSetConfig, payload);
  }, [act, cfgDraft, platformId]);
  const cfgDirty = cfgDraft && platform?.config && (
    Number(cfgDraft.digestIntervalSec)  !== platform.config.digestIntervalSec  ||
    Number(cfgDraft.approvalTimeoutSec) !== platform.config.approvalTimeoutSec ||
    Number(cfgDraft.maxMessageChars)    !== platform.config.maxMessageChars    ||
    Number(cfgDraft.sendChunkDelayMs)   !== platform.config.sendChunkDelayMs   ||
    (platformId === 'qq' && (
      cfgDraft.appId !== (platform.config.appId ?? '') ||
      cfgDraft.clientSecret !== (platform.config.clientSecret ?? '')
    )) ||
    (platformId === 'feishu' && (
      cfgDraft.appId !== (platform.config.appId ?? '') ||
      cfgDraft.appSecret !== (platform.config.appSecret ?? '')
    )) ||
    (platformId === 'telegram' && (
      cfgDraft.botToken !== '' ||
      cfgDraft.proxy !== (platform.config.proxy ?? '')
    ))
  );

  if (!platform && !err) {
    return React.createElement('div', { style: s.card },
      React.createElement('div', { style: s.label }, platformName),
      React.createElement('div', { style: { ...s.muted, marginTop: 6 } }, '加载中…'),
    );
  }

  const connected = platform?.status === 'connected' || platform?.status === 'starting' || platform?.status === 'reconnecting';
  const login = platform?.login ?? {};
  const showQr = login.phase === 'qr' || login.phase === 'scaned';
  const statusLabel = platform?.status === 'connected' ? '已连接'
    : platform?.status === 'starting' ? '连接中…'
    : platform?.status === 'reconnecting' ? '重连中…'
    : platform?.status === 'paused' ? '暂停（会话过期）'
    : platform?.status === 'error' ? '错误'
    : '未连接';

  return React.createElement('div', { style: s.card },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 } },
      React.createElement('div', { style: { flex: '1 1 auto', minWidth: 0 } },
        React.createElement('div', { style: { ...s.label, display: 'flex', alignItems: 'center', gap: 7 } },
          platformId === 'wechat' && React.createElement(Icons.wechat, { style: { color: '#07C160', width: 20, height: 20 } }),
          platformId === 'qq' && React.createElement(Icons.qq, { style: { color: '#12B7F5', width: 20, height: 20 } }),
          platformId === 'feishu' && React.createElement(Icons.feishu, { style: { color: '#00D6B9', width: 20, height: 20 } }),
          platformId === 'telegram' && React.createElement(Icons.telegram, { style: { color: '#24A1DE', width: 20, height: 20 } }),
          platformName,
        ),
        React.createElement('div', { style: { ...s.muted, marginTop: 2 } }, platformDesc),
      ),
      React.createElement(StatusTag, { status: platform?.status, running: connected }),
    ),

    // 快捷入口：使用说明 / 开放平台 / 命令速查
    React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' } },
      platformId === 'wechat' && React.createElement('a', {
        href: 'https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/wechat-usage.md',
        target: '_blank', rel: 'noopener noreferrer',
        style: s.btnGhost,
      }, '📖 微信使用说明'),
      platformId === 'qq' && React.createElement('a', {
        href: 'https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/qq-usage.md',
        target: '_blank', rel: 'noopener noreferrer',
        style: s.btnGhost,
      }, '📖 QQ 使用说明'),
      platformId === 'qq' && React.createElement('a', {
        href: 'https://bot.q.qq.com/wiki/develop/api-v2/',
        target: '_blank', rel: 'noopener noreferrer',
        style: s.btnGhost,
      }, '🌐 QQ 开放平台'),
      platformId === 'feishu' && React.createElement('a', {
        href: 'https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/feishu-usage.md',
        target: '_blank', rel: 'noopener noreferrer',
        style: s.btnGhost,
      }, '📖 飞书使用说明'),
      platformId === 'feishu' && React.createElement('a', {
        href: 'https://open.feishu.cn/app',
        target: '_blank', rel: 'noopener noreferrer',
        style: s.btnGhost,
      }, '🌐 飞书开放平台'),
      platformId === 'telegram' && React.createElement('a', {
        href: 'https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/telegram-usage.md',
        target: '_blank', rel: 'noopener noreferrer',
        style: s.btnGhost,
      }, '📖 Telegram 使用说明'),
      platformId === 'telegram' && React.createElement('a', {
        href: 'https://t.me/BotFather',
        target: '_blank', rel: 'noopener noreferrer',
        style: s.btnGhost,
      }, '🌐 @BotFather 申请 Bot'),
      React.createElement('button', {
        style: s.btnGhost,
        onClick: () => setShowHelp(v => !v),
      }, showHelp ? '收起命令' : '命令列表'),
    ),

    // 命令速查
    showHelp && React.createElement('div', { style: { ...s.block, fontSize: 12, lineHeight: 1.8, fontFamily: 'monospace' } },
      React.createElement('div', null, '/new <提示词> — 新建会话并开始（当前工作区）'),
      React.createElement('div', null, '/new <提示词> @N — 在指定工作区新建会话'),
      React.createElement('div', null, '/sessions（或 /list）— 列出会话（按工作区分组，带标题）'),
      React.createElement('div', null, '/use N（或 /resume N）— 切换到会话 N'),
      React.createElement('div', null, '/workspaces — 列出所有可用工作区'),
      React.createElement('div', null, '/end — 结束当前会话（回到无活动会话状态）'),
      React.createElement('div', null, '/stop — 停止当前任务'),
      React.createElement('div', null, '/status — 查看 Agent 状态与会话摘要'),
      React.createElement('div', null, '/yes 或 /no（或 1/2）— 回应权限审批请求'),
      React.createElement('div', null, '/help — 显示完整命令帮助'),
    ),

    err && React.createElement('div', { style: { ...s.warn, marginTop: 10 } }, err),

    // 已配置：结构化状态看板 + 白名单
    platform?.configured && React.createElement('div', { style: s.block },
      // 结构化状态卡片看板
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8,
          marginBottom: 12,
        },
      },
        React.createElement('div', {
          style: {
            background: 'var(--dsw-alias-bg-layer-1,#fff)',
            border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
            borderRadius: 8,
            padding: '8px 12px',
          },
        },
          React.createElement('div', { style: { ...s.muted, fontSize: 11 } }, '连接状态'),
          React.createElement('div', { style: { ...s.label, fontSize: 13, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 } },
            React.createElement('span', {
              style: {
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? 'var(--dsw-alias-state-success-primary,#10b981)' : 'var(--dsw-alias-label-tertiary,#9ca3af)',
              },
            }),
            statusLabel,
          ),
        ),
        platform.accountId && React.createElement('div', {
          style: {
            background: 'var(--dsw-alias-bg-layer-1,#fff)',
            border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
            borderRadius: 8,
            padding: '8px 12px',
          },
        },
          React.createElement('div', { style: { ...s.muted, fontSize: 11 } }, '登录账号'),
          React.createElement('div', { style: { ...s.code, fontSize: 12, marginTop: 2, fontWeight: 500 } }, platform.accountId),
        ),
        platform.sessionId && React.createElement('div', {
          style: {
            background: 'var(--dsw-alias-bg-layer-1,#fff)',
            border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
            borderRadius: 8,
            padding: '8px 12px',
          },
        },
          React.createElement('div', { style: { ...s.muted, fontSize: 11 } }, '活动会话'),
          React.createElement('div', { style: { ...s.code, fontSize: 12, marginTop: 2 } }, platform.sessionId),
        ),
      ),
      React.createElement('div', { style: { ...s.muted, fontSize: 12, marginTop: 8, lineHeight: 1.6 } },
        `白名单 (已授权 ${platform.allowFrom?.length || 0} 个账号/群):`
      ),
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 } },
        (platform.allowFrom?.length
          ? platform.allowFrom.map((id) =>
              React.createElement('span', { key: id, style: { ...s.tag, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', color: 'var(--dsw-alias-label-primary,currentColor)', gap: 6 } },
                React.createElement('span', { style: { fontSize: 12, wordBreak: 'break-all' } }, id),
                React.createElement('button', {
                  style: { cursor: 'pointer', border: 'none', background: 'none', color: 'var(--dsw-alias-state-error-primary,#dc2626)', fontSize: 12, padding: 0 },
                  onClick: () => removeAllow(id), title: '移出白名单',
                }, '×'),
              )
            )
          : React.createElement('div', { style: { ...s.muted, fontSize: 12 } },
              platformId === 'wechat'
                ? '(空 — 扫码后首个发消息的微信用户将自动加入)'
                : '(空 — 首个发消息的用户将自动加入)'
            )),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' } },
        React.createElement('input', {
          style: { ...s.input, flex: 1 },
          placeholder: platformId === 'wechat' ? '添加允许的微信 ID（如 xxx@im.wechat），按 Enter 添加' : '添加允许的用户/群 ID，按 Enter 添加',
          value: newId,
          onChange: handleNewId,
          onKeyDown: (e) => { if (e.key === 'Enter' && newId.trim() && !busy) addAllow(); },
        }),
        React.createElement('button', {
          style: { ...s.btnGhost, whiteSpace: 'nowrap', opacity: (newId.trim() && !busy) ? 1 : 0.5 },
          onClick: addAllow, disabled: busy || !newId.trim(),
        }, '添加'),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' } },
        platform.status !== 'connected' && platform.status !== 'starting' &&
          React.createElement('button', { style: s.btnPri, onClick: onLogin, disabled: busy }, '重新连接'),
        (platform.status === 'connected' || platform.status === 'starting') &&
          React.createElement('button', { style: s.btnGhost, onClick: onStop, disabled: busy }, '断开'),
        React.createElement('button', {
          style: { ...s.btnGhost, color: 'var(--dsw-alias-state-error-primary,#dc2626)', borderColor: 'var(--dsw-alias-state-error-primary,#dc2626)', opacity: busy ? 0.5 : 1 },
          disabled: busy,
          onClick: () => { if (window.confirm('确认解绑？这将清除保存的凭证。')) act(BRIDGE_ENDPOINTS.platformUnbind, {}); },
          title: '清除登录凭证，下次需重新配置',
        }, '解绑账号'),
      ),
      // 飞书 / Telegram 扫码直达对话引导卡片
      (platformId === 'feishu' || platformId === 'telegram') && platform.botQr && React.createElement('div', {
        style: {
          marginTop: 12,
          padding: 12,
          background: 'var(--dsw-alias-bg-layer-1,#ffffff)',
          border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
          borderRadius: 8,
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          flexWrap: 'wrap',
        },
      },
        React.createElement('img', { src: platform.botQr, alt: `${platformName} Bot QR`, style: { width: 110, height: 110, borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', padding: 4, background: '#fff' } }),
        React.createElement('div', { style: { flex: 1, minWidth: 160 } },
          React.createElement('div', { style: { ...s.label, fontSize: 13, fontWeight: 600 } }, `📱 手机 ${platformName} 扫码直达对话`),
          React.createElement('div', { style: { ...s.muted, fontSize: 12, marginTop: 4, lineHeight: 1.5 } },
            `用 ${platformName} 扫描左侧二维码，立即打开与 Bot 对话；发送首条消息自动完成白名单授权。`
          ),
          platform.botLink && React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
            React.createElement('a', {
              href: platform.botLink,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: { ...s.btnGhost, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12 },
            }, `在 ${platformName} 客户端打开 ↗`),
          ),
        ),
      ),
    ),

    // 未配置 / 登录中：表单（QQ / 飞书 / Telegram）或二维码（微信）
    (!platform?.configured || showQr) && React.createElement('div', { style: s.block },
      showQr && login.qr
        ? React.createElement('div', null,
            React.createElement('img', { src: login.qr, alt: 'login QR', style: s.qr }),
            React.createElement('div', { style: { ...s.muted, marginTop: 4 } },
              login.phase === 'scaned'
                ? '已扫码，请在手机上确认…'
                : (platformId === 'wechat' ? '请使用微信扫码登录（ClawBot）' : '请扫码登录')
            ),
            login.error && React.createElement('div', { style: { ...s.muted, marginTop: 4, color: 'var(--dsw-alias-state-warn-primary,#92400e)' } }, login.error),
          )
        : (platformId === 'qq' || platformId === 'feishu' || platformId === 'telegram')
          ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 } },
              platformId === 'feishu' && React.createElement('div', {
                style: {
                  background: 'var(--dsw-alias-bg-layer-1,#ffffff)',
                  border: '1px dashed var(--dsw-alias-border-l2,#e5e7eb)',
                  borderRadius: 6,
                  padding: '8px 10px',
                  fontSize: 12,
                  lineHeight: 1.5,
                },
              },
                React.createElement('span', { style: s.label }, '💡 扫码自动创建引导：'),
                React.createElement('span', { style: s.muted }, ' 可在终端运行 '),
                React.createElement('code', { style: { ...s.code, fontSize: 11, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', padding: '2px 4px', borderRadius: 4 } }, 'npx feishu-bot-bootstrap'),
                React.createElement('span', { style: s.muted }, ' 手机扫码一键自动创建应用并输出凭证；或在下方手动填入凭证。')
              ),
              platformId === 'telegram'
                ? React.createElement(React.Fragment, null,
                    React.createElement('div', null,
                      React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, 'Bot Token — Telegram @BotFather 下发的机器人 Token'),
                      React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                        React.createElement('input', {
                          style: { ...s.input, flex: 1 },
                          type: showSecret ? 'text' : 'password',
                          placeholder: '请输入 Telegram Bot Token (如 123456789:ABCdef...)',
                          value: cfgDraft?.botToken ?? '',
                          onChange: (e) => setCfgDraft(d => ({ ...d, botToken: e.target.value })),
                        }),
                        React.createElement('button', {
                          style: { ...s.btnGhost, height: 32, padding: '0 10px', fontSize: 13, flexShrink: 0 },
                          onClick: () => setShowSecret(v => !v),
                          type: 'button',
                          title: showSecret ? '隐藏密钥' : '显示明文',
                        }, showSecret ? '🙈 隐藏' : '👁️ 显示'),
                      ),
                    ),
                    React.createElement('div', null,
                      React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '网络代理 (可选) — 支持国内 HTTP / HTTPS 代理'),
                      React.createElement('input', {
                        style: { ...s.input, width: '100%' },
                        placeholder: '可选，例如 http://127.0.0.1:7890（为空则直连或读取环境变量）',
                        value: cfgDraft?.proxy ?? '',
                        onChange: (e) => setCfgDraft(d => ({ ...d, proxy: e.target.value })),
                      }),
                    ),
                  )
                : React.createElement(React.Fragment, null,
                    React.createElement('div', null,
                      React.createElement('div', { style: { ...s.muted, marginBottom: 4 } },
                        platformId === 'qq' ? 'AppID — QQ 开放平台机器人应用 ID' : 'App ID — 飞书开放平台自建应用 ID (cli_xxx)'
                      ),
                      React.createElement('input', {
                        style: { ...s.input, width: '100%' },
                        placeholder: platformId === 'qq' ? '请输入 AppID' : '请输入 App ID (如 cli_a1b2c3d4...)',
                        value: cfgDraft?.appId ?? '',
                        onChange: (e) => setCfgDraft(d => ({ ...d, appId: e.target.value })),
                      }),
                    ),
                    React.createElement('div', null,
                      React.createElement('div', { style: { ...s.muted, marginBottom: 4 } },
                        platformId === 'qq' ? 'ClientSecret — QQ 开放平台机器人密钥' : 'App Secret — 飞书开放平台应用密钥'
                      ),
                      React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                        React.createElement('input', {
                          style: { ...s.input, flex: 1 },
                          type: showSecret ? 'text' : 'password',
                          placeholder: platformId === 'qq' ? '请输入 ClientSecret' : '请输入 App Secret',
                          value: platformId === 'qq' ? (cfgDraft?.clientSecret ?? '') : (cfgDraft?.appSecret ?? ''),
                          onChange: (e) => setCfgDraft(d => platformId === 'qq' ? ({ ...d, clientSecret: e.target.value }) : ({ ...d, appSecret: e.target.value })),
                        }),
                        React.createElement('button', {
                          style: { ...s.btnGhost, height: 32, padding: '0 10px', fontSize: 13, flexShrink: 0 },
                          onClick: () => setShowSecret(v => !v),
                          type: 'button',
                          title: showSecret ? '隐藏密钥' : '显示明文',
                        }, showSecret ? '🙈 隐藏' : '👁️ 显示'),
                      ),
                    ),
                  ),
              React.createElement('div', null,
                React.createElement('a', {
                  href: platformId === 'qq'
                    ? 'https://bot.q.qq.com/wiki/develop/api-v2/'
                    : platformId === 'feishu'
                      ? 'https://open.feishu.cn/app'
                      : 'https://t.me/BotFather',
                  target: '_blank', rel: 'noopener noreferrer',
                  style: s.btnLink,
                }, platformId === 'qq' ? '📖 前往 QQ 开放平台申请机器人' : '📖 前往飞书开放平台创建企业自建应用'),
              ),
              React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                React.createElement('button', {
                  style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
                  onClick: saveConfig,
                  disabled: busy || (platformId === 'telegram'
                    ? !cfgDraft?.botToken?.trim()
                    : (!cfgDraft?.appId?.trim() || (platformId === 'qq' ? !cfgDraft?.clientSecret?.trim() : !cfgDraft?.appSecret?.trim()))),
                }, busy ? '保存中…' : '保存并连接'),
                login.phase === 'error' && React.createElement('div', { style: { ...s.muted, fontSize: 12 } }, login.error ?? '连接失败'),
              ),
            )
          : React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' } },
              React.createElement('button', {
                style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
                onClick: onLogin, disabled: busy,
              }, busy ? '处理中…' : '扫码登录'),
              login.phase === 'error' && React.createElement('div', { style: { ...s.muted, fontSize: 12 } }, login.error ?? '登录失败'),
            ),
    ),

    React.createElement('div', { style: s.block },
      React.createElement('div', { style: { ...s.tip, fontSize: 12 } },
        platformId === 'wechat'
          ? '说明: 扫码成功后，向该微信 Bot 发送第一条消息即自动完成白名单授权。仅白名单内的微信用户能驱动 agent，其他人消息会被忽略。使用专用微信号，避免影响主号。'
          : platformId === 'qq'
            ? '说明: 填入 QQ 开放平台机器人的 AppID 与 ClientSecret 后保存即自动连接。用户向 Bot 发送第一条消息即自动完成白名单授权。仅白名单内的 QQ 用户能驱动 agent，其他人消息会被忽略。'
            : '说明: 登录成功后，发送第一条消息即自动完成白名单授权。仅白名单内的用户能驱动 agent，其他人消息会被忽略。'
      ),
    ),
  );
}

// 宿主系统运行监控看板
function SystemMetricsWidget({ metrics }) {
  if (!metrics) return null;
  const memUsedPercent = metrics.memory?.usedPercent ?? 0;
  const memUsedGb = (metrics.memory?.usedBytes / (1024 ** 3)).toFixed(1);
  const memTotalGb = (metrics.memory?.totalBytes / (1024 ** 3)).toFixed(1);
  const heapMb = Math.round((metrics.memory?.processHeapUsed || 0) / (1024 ** 2));

  const formatUptime = (sec = 0) => {
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}天 ${hrs}小时 ${mins}分`;
    if (hrs > 0) return `${hrs}小时 ${mins}分`;
    return `${mins}分钟`;
  };

  const progressColor = memUsedPercent > 85 ? '#dc2626' : memUsedPercent > 70 ? '#d97706' : '#059669';

  return React.createElement('div', {
    style: {
      ...s.card,
      marginBottom: 16,
    },
  },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 } },
      React.createElement('div', { style: { ...s.label, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } },
        '📊 宿主系统与运行看板'
      ),
      React.createElement('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #6b7280)' } },
        `Node ${metrics.os?.nodeVersion || ''} · ${metrics.os?.platform || ''} ${metrics.os?.arch || ''}`
      ),
    ),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 12 } },
      React.createElement('div', null,
        React.createElement('div', { style: { color: 'var(--dsw-alias-label-tertiary, #9ca3af)', fontSize: 11, marginBottom: 2 } }, 'CPU 核心与型号'),
        React.createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary, currentColor)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: metrics.cpu?.model },
          `${metrics.cpu?.cores || 0} 核心 (${(metrics.cpu?.model || '').split('@')[0].trim()})`
        ),
      ),
      React.createElement('div', null,
        React.createElement('div', { style: { color: 'var(--dsw-alias-label-tertiary, #9ca3af)', fontSize: 11, marginBottom: 2 } }, 'DSH 运行时间 (Uptime)'),
        React.createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-state-success-primary, #059669)' } },
          formatUptime(metrics.uptime?.processSec)
        ),
      ),
      React.createElement('div', null,
        React.createElement('div', { style: { color: 'var(--dsw-alias-label-tertiary, #9ca3af)', fontSize: 11, marginBottom: 2 } }, 'Node 进程堆内存'),
        React.createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary, currentColor)' } },
          `${heapMb} MB`
        ),
      ),
    ),
    React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dsw-alias-label-secondary, #6b7280)', marginBottom: 4 } },
        React.createElement('span', null, `系统内存占用: ${memUsedGb} GB / ${memTotalGb} GB`),
        React.createElement('span', { style: { fontWeight: 600, color: progressColor } }, `${memUsedPercent}%`),
      ),
      React.createElement('div', {
        style: {
          width: '100%', height: 6, background: 'var(--dsw-alias-border-l2, #e5e7eb)', borderRadius: 999, overflow: 'hidden',
        },
      },
        React.createElement('div', {
          style: {
            width: `${memUsedPercent}%`, height: '100%', background: progressColor, borderRadius: 999, transition: 'width .3s ease',
          },
        }),
      ),
    ),
  );
}

// 网络连通性诊断小工具
function NetworkDiagnosticWidget({ rpcCall }) {
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const runDiagnose = React.useCallback(async () => {
    setRunning(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.diagnoseNetwork, {});
      if (r?.ok) setResult(r.value);
    } catch (e) {
      setResult({ overall: 'warning', results: [{ item: 'err', name: '诊断请求异常', status: 'fail', detail: e.message }] });
    } finally {
      setRunning(false);
    }
  }, [rpcCall]);

  return React.createElement('div', { style: { ...s.card, marginBottom: 16 } },
    React.createElement('div', { style: { marginBottom: 10 } },
      React.createElement('div', { style: { ...s.label, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } },
        '🔍 网络连通性一键诊断'
      ),
      React.createElement('div', { style: { ...s.muted, marginTop: 3 } },
        '一键检测本地反向代理端口、局域网 IPv4、Cloudflare Anycast 延迟以及国内 npmmirror 镜像源连通性。'
      ),
    ),

    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: result ? 12 : 0 } },
      React.createElement('button', {
        type: 'button',
        style: { ...s.btnPri, height: 32, fontSize: 12, padding: '0 14px' },
        onClick: runDiagnose,
        disabled: running,
      },
        running ? '正在探测连通性…' : result ? '🔄 重新诊断网络' : '🔍 开始一键诊断'
      ),
      result && React.createElement('span', {
        style: {
          fontSize: 12,
          color: result.overall === 'healthy' ? 'var(--dsw-alias-state-success-primary, #059669)' : 'var(--dsw-alias-state-warn-primary, #d97706)',
          fontWeight: 600,
        },
      }, result.overall === 'healthy' ? '✓ 所有网络探测项正常' : '▲ 检测到部分延迟较高或异常'),
    ),

    running && !result && React.createElement('div', {
      style: {
        marginTop: 10, padding: '10px 14px', borderRadius: 8,
        background: 'var(--dsw-alias-bg-layer-2, #f9fafb)',
        display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dsw-alias-brand-primary, #4f6ef7)',
        fontSize: 12,
      },
    },
      React.createElement('span', { style: { animation: 'spin 1s linear infinite', display: 'inline-flex' } }, React.createElement(Icons.refresh)),
      '正在执行网络端口与云端节点连通性探测…'
    ),

    result?.results && React.createElement('div', {
      style: {
        display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10,
        paddingTop: 10, borderTop: '1px solid var(--dsw-alias-border-l2, #e5e7eb)',
      },
    },
      result.results.map((item, idx) => {
        const isPass = item.status === 'pass';
        const isWarn = item.status === 'warn';
        return React.createElement('div', {
          key: idx,
          style: {
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
            padding: '8px 10px', borderRadius: 6,
            background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.7))',
            border: `1px solid ${isPass ? 'var(--dsw-alias-state-success-border, #a7f3d0)' : isWarn ? 'var(--dsw-alias-state-warn-border, #fde68a)' : 'var(--dsw-alias-state-error-border, #fecaca)'}`,
            boxSizing: 'border-box',
          },
        },
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary, currentColor)', marginBottom: 2 } },
              isPass ? '✓ ' : isWarn ? '▲ ' : '✕ ',
              item.name
            ),
            React.createElement('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #6b7280)' } }, item.detail),
          ),
          item.latencyMs != null && React.createElement('span', {
            style: {
              fontSize: 11, fontWeight: 600, flexShrink: 0,
              color: item.latencyMs < 500 ? 'var(--dsw-alias-state-success-primary, #059669)' : 'var(--dsw-alias-state-warn-primary, #d97706)',
            },
          }, `${item.latencyMs}ms`),
        );
      })
    )
  );
}

// 全局配置备份与恢复小卡片
function BackupRestoreWidget({ rpcCall, onUpdate }) {
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const handleExport = async () => {
    setExporting(true);
    setMsg(null);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.exportBackup, {});
      if (r?.ok && r.value) {
        const jsonStr = JSON.stringify(r.value, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        a.href = url;
        a.download = `dsh-bridge-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMsg({ ok: true, text: '✓ 备份文件已成功导出并下载到本地！' });
      } else {
        setMsg({ ok: false, text: r?.error?.message || '导出备份失败' });
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message || '导出异常' });
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setImporting(true);
    setMsg(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const r = await rpcCall(BRIDGE_ENDPOINTS.importBackup, { backup });
      if (r?.ok) {
        setMsg({ ok: true, text: '✓ 配置已成功导入并刷新生效！' });
        onUpdate?.(r.value?.status);
      } else {
        setMsg({ ok: false, text: r?.error?.message || '导入配置失败' });
      }
    } catch (err) {
      setMsg({ ok: false, text: `导入解析失败: ${err.message}` });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return React.createElement('div', { style: { ...s.card, marginBottom: 16 } },
    React.createElement('div', { style: { marginBottom: 10 } },
      React.createElement('div', { style: { ...s.label, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } },
        '🗄️ 全局配置备份与恢复'
      ),
      React.createElement('div', { style: { ...s.muted, marginTop: 3 } },
        '支持一键导出或导入恢复本插件所有配置（包含各 IM 平台凭证、授权白名单、公网隧道与安全认证规则）。'
      ),
    ),
    React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
      React.createElement('button', {
        type: 'button',
        style: { ...s.btnPri, height: 32, fontSize: 12, padding: '0 14px' },
        onClick: handleExport,
        disabled: exporting || importing,
      }, exporting ? '正在导出…' : '📥 导出配置备份 (.json)'),
      React.createElement('button', {
        type: 'button',
        style: { ...s.btnGhost, height: 32, fontSize: 12, padding: '0 14px' },
        onClick: () => fileInputRef.current?.click(),
        disabled: exporting || importing,
      }, importing ? '正在导入…' : '📤 导入配置恢复'),
      React.createElement('input', {
        type: 'file',
        ref: fileInputRef,
        accept: '.json',
        style: { display: 'none' },
        onChange: handleFileChange,
      }),
    ),
    msg && React.createElement('div', {
      style: {
        marginTop: 10, padding: '6px 12px', borderRadius: 6, fontSize: 12,
        background: msg.ok ? 'var(--dsw-alias-state-success-bg,#ecfdf5)' : 'var(--dsw-alias-state-error-bg,#fef2f2)',
        color: msg.ok ? 'var(--dsw-alias-state-success-primary,#059669)' : 'var(--dsw-alias-state-error-primary,#dc2626)',
      },
    }, msg.text),
  );
}

// 运维 Tab 内的手动重启 DSH 服务小卡片
function RestartDshCard({ rpcCall }) {
  const [restarting, setRestarting] = React.useState(false);
  const [status, setStatus] = React.useState(null);

  const handleRestart = async () => {
    setRestarting(true);
    setStatus({ phase: 'restarting', text: '正在向 DSH 服务发送重启指令…' });
    try {
      await rpcCall(BRIDGE_ENDPOINTS.restartDsh, {});
    } catch {}

    setStatus({ phase: 'reconnecting', text: 'DSH 服务正在重启中，正在自动重新连接…' });
    await new Promise(r => setTimeout(r, 2000));

    let attempts = 0;
    const maxAttempts = 30;
    const pollHealth = setInterval(async () => {
      attempts++;
      try {
        const r = await rpcCall(BRIDGE_ENDPOINTS.checkVersion, {});
        if (r?.ok) {
          clearInterval(pollHealth);
          setStatus({ phase: 'success', text: '🎉 重启成功！已重新建立连接，正在刷新页面…' });
          setTimeout(() => { window.location.reload(); }, 1000);
          return;
        }
      } catch {}

      if (attempts >= maxAttempts) {
        clearInterval(pollHealth);
        setStatus({ phase: 'timeout', text: '重连等待超时，请手动刷新页面。' });
        setRestarting(false);
      }
    }, 1000);
  };

  return React.createElement('div', { style: { ...s.card, marginBottom: 16 } },
    React.createElement('div', { style: { marginBottom: 10 } },
      React.createElement('div', { style: { ...s.label, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } },
        '🔄 DSH 服务平滑重启'
      ),
      React.createElement('div', { style: { ...s.muted, marginTop: 3 } },
        '优雅退出并重新拉起当前 DSH 进程与所有插件服务，前端将在几秒后自动探测重连并刷新页面。'
      ),
    ),
    !restarting && !status && React.createElement('button', {
      type: 'button',
      style: { ...s.btnGhost, height: 32, fontSize: 12, padding: '0 14px' },
      onClick: handleRestart,
    }, '🔄 立即重启 DSH 服务'),
    (restarting || status) && React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
        color: status?.phase === 'success'
          ? 'var(--dsw-alias-state-success-primary, #059669)'
          : status?.phase === 'timeout'
            ? 'var(--dsw-alias-state-error-primary, #dc2626)'
            : 'var(--dsw-alias-state-info-primary, #2563eb)',
        fontWeight: 500,
      },
    },
      status?.phase !== 'success' && status?.phase !== 'timeout' && React.createElement('span', {
        style: { animation: 'spin 1s linear infinite', display: 'inline-flex' },
      }, React.createElement(Icons.refresh)),
      status?.text || '正在调度…',
    ),
  );
}

// 运维 Tab 内的远程工作区管理卡片
function RemoteWorkspaceCard({ rpcCall }) {
  const [workspaces, setWorkspaces] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!rpcCall) return;
    setLoading(true);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.listWorkspaces, {});
      const list = res?.value || res;
      if (Array.isArray(list)) setWorkspaces(list);
      else if (list?.workspaces && Array.isArray(list.workspaces)) setWorkspaces(list.workspaces);
    } catch {}
    finally { setLoading(false); }
  }, [rpcCall]);

  React.useEffect(() => {
    load();
  }, [load]);

  return React.createElement('div', { style: { ...s.card, marginBottom: 16 } },
    React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
    },
      React.createElement('div', null,
        React.createElement('div', { style: { ...s.label, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } },
          '🗂️ 远程工作区管理 (目录浏览器)'
        ),
        React.createElement('div', { style: { ...s.muted, marginTop: 3 } },
          '在移动端或远程设备上可视点选电脑上的文件夹或直接输入路径添加至 DSH。'
        ),
      ),
      React.createElement('button', {
        type: 'button',
        style: { ...s.btnPri, height: 32, fontSize: 12, padding: '0 14px' },
        onClick: () => {
          if (typeof window.__dshOpenRemoteWorkspaceModal === 'function') {
            window.__dshOpenRemoteWorkspaceModal();
          } else if (typeof showRemoteWorkspaceDialog === 'function') {
            showRemoteWorkspaceDialog(rpcCall, () => load());
          }
        },
      }, '+ 远程添加工作区'),
    ),
    workspaces.length > 0 ? React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
    },
      workspaces.map((ws, i) => React.createElement('div', {
        key: ws.path || i,
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          background: 'var(--dsw-alias-bg-layer-1,#ffffff)',
          border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
          borderRadius: 8,
          fontSize: 12,
        },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' } },
          React.createElement('span', { style: { fontWeight: 600, color: 'var(--dsw-alias-brand-primary,#4f6ef7)', flexShrink: 0 } }, `@${i + 1} ${ws.title || ''}`),
          React.createElement('span', { style: { ...s.code, color: 'var(--dsw-alias-label-tertiary,#6b7280)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, ws.path),
        ),
      )),
    ) : React.createElement('div', {
      style: { ...s.muted, marginTop: 6, padding: '10px 14px', background: 'var(--dsw-alias-bg-layer-1,#ffffff)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 8, textAlign: 'center' },
    }, loading ? '正在读取工作区列表…' : '暂无已注册工作区，点击右上角「+ 远程添加工作区」即可浏览添加。'),
  );
}

// 手动升级命令行：展示命令 + 一键复制
function UpgradeCommandRow({ cmd }) {
  const [copied, copy] = useCopy();
  return React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
    React.createElement('code', {
      style: { ...s.code, flex: '1 1 auto', fontSize: 12, lineHeight: 1.5, wordBreak: 'break-all' },
    }, cmd),
    React.createElement('button', {
      style: { ...s.btnGhost, height: 26, padding: '0 10px', fontSize: 11, flex: '0 0 auto' },
      onClick: () => copy(cmd),
    }, copied ? '✓ 已复制' : '复制'),
  );
}

// 版本检查 + 一键升级 + GitHub/反馈入口
function VersionBanner({ rpcCall }) {
  const [info, setInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [upgrading, setUpgrading] = React.useState(false);
  const [upgradeResult, setUpgradeResult] = React.useState(null);
  const [showManual, setShowManual] = React.useState(false);
  const [restarting, setRestarting] = React.useState(false);
  const [restartStatus, setRestartStatus] = React.useState(null);
  const [dismissRestart, setDismissRestart] = React.useState(false);

  const check = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.checkVersion, {});
      if (r?.ok) setInfo(r.value);
    } finally {
      setLoading(false);
    }
  }, [rpcCall]);

  React.useEffect(() => { check(); }, [check]);

  const hasUpdate = info?.latest && info?.current && !info.error && semverGt(info.latest, info.current);
  const isLatest = info?.latest && info?.current && !info.error && !semverGt(info.latest, info.current);

  const handleUpgrade = React.useCallback(async () => {
    if (!info?.latest || upgrading) return;
    setUpgrading(true);
    setUpgradeResult(null);
    setDismissRestart(false);
    setRestartStatus(null);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.upgradePlugin, { version: info.latest });
      if (r?.ok && r.value?.ok) {
        setUpgradeResult({ ok: true, message: `已成功升级到 v${info.latest}！` });
      } else {
        setUpgradeResult({ ok: false, message: r?.value?.error || r?.error?.message || '升级失败' });
        setShowManual(true);
      }
    } catch (e) {
      setUpgradeResult({ ok: false, message: e.message || '升级请求失败' });
      setShowManual(true);
    } finally {
      setUpgrading(false);
    }
  }, [info?.latest, upgrading, rpcCall]);

  const handleRestart = React.useCallback(async () => {
    setRestarting(true);
    setRestartStatus({ phase: 'restarting', text: '正在调度 DSH 服务重启…' });
    try {
      await rpcCall(BRIDGE_ENDPOINTS.restartDsh, {});
    } catch {
      // 忽略 RPC 错误（因为服务可能瞬间关闭导致网络连接断开）
    }

    setRestartStatus({ phase: 'reconnecting', text: 'DSH 服务正在重启中，正在自动重新连接…' });

    // 等待 2 秒后开始健康检查轮询
    await new Promise(r => setTimeout(r, 2000));

    let attempts = 0;
    const maxAttempts = 30; // 最多探测 30 次（约 30 秒）
    const pollHealth = setInterval(async () => {
      attempts++;
      try {
        const r = await rpcCall(BRIDGE_ENDPOINTS.checkVersion, {});
        if (r?.ok) {
          clearInterval(pollHealth);
          setRestartStatus({ phase: 'success', text: '🎉 重启成功！已自动加载最新版本。正在刷新页面…' });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      } catch {
        // 仍在启动中，继续等待
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollHealth);
        setRestartStatus({ phase: 'timeout', text: '重连等待超时，请手动刷新页面。' });
        setRestarting(false);
      }
    }, 1000);
  }, [rpcCall]);

  const links = React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
    React.createElement('a', {
      href: GITHUB_URL, target: '_blank', rel: 'noreferrer', style: s.btnLink,
    }, React.createElement(Icons.github), 'GitHub'),
    React.createElement('a', {
      href: RELEASES_URL, target: '_blank', rel: 'noreferrer', style: s.btnLink,
    }, '更新日志'),
    React.createElement('a', {
      href: ISSUES_URL, target: '_blank', rel: 'noreferrer', style: s.btnLink,
    }, '反馈 Issue'),
  );

  return React.createElement('div', { style: { marginBottom: 16 } },
    // 顶部状态行：版本徽标 + 刷新按钮 + 链接组
    React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      },
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        // 版本状态徽标
        React.createElement('span', {
          style: {
            ...s.tag,
            background: hasUpdate
              ? 'var(--dsw-alias-state-info-bg,#eff6ff)'
              : isLatest
                ? 'var(--dsw-alias-state-success-bg,#ecfdf5)'
                : 'var(--dsw-alias-bg-layer-2,#f3f4f6)',
            color: hasUpdate
              ? 'var(--dsw-alias-state-info-primary,#2563eb)'
              : isLatest
                ? 'var(--dsw-alias-state-success-primary,#059669)'
                : 'var(--dsw-alias-label-secondary,#6b7280)',
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          },
        },
          loading
            ? React.createElement('span', {
                style: { display: 'inline-flex', alignItems: 'center' },
              }, React.createElement(Icons.refresh))
            : isLatest
              ? React.createElement(Icons.check)
              : null,
          info ? `v${info.current}` : '版本检查中…',
          isLatest && React.createElement('span', { style: { opacity: 0.85, fontSize: 11, fontWeight: 400 } }, '· 已是最新'),
          hasUpdate && React.createElement('span', { style: { fontWeight: 600, fontSize: 11 } }, `➔ v${info.latest}`),
          info?.error && React.createElement('span', { style: { color: 'var(--dsw-alias-state-warn-primary,#d97706)', fontSize: 11 } }, '(网络超时)'),
        ),
        // 刷新检查按钮
        React.createElement('button', {
          style: {
            ...s.btnGhost,
            height: 24,
            padding: '0 8px',
            fontSize: 11,
            opacity: loading ? 0.5 : 1,
            gap: 4,
          },
          onClick: check,
          disabled: loading || upgrading || restarting,
          title: '重新检查 npm 线上版本',
        },
          React.createElement(Icons.refresh),
          loading ? '检查中…' : '检查更新',
        ),
      ),
      links,
    ),

    // 发现新版本高亮卡片（支持一键直接升级）
    hasUpdate && React.createElement('div', {
      style: {
        ...s.card,
        background: 'var(--dsw-alias-state-info-bg,#eff6ff)',
        border: '1px solid var(--dsw-alias-state-info-border,#bfdbfe)',
        padding: '14px 16px',
        marginTop: 10,
        marginBottom: 0,
      },
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12 } },
        React.createElement('span', { style: { fontSize: 22 } }, '🚀'),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 } },
            React.createElement('div', {
              style: {
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--dsw-alias-state-info-primary,#1e40af)',
              },
            }, `发现新版本 v${info.latest}（当前 v${info.current}）`),
            React.createElement('button', {
              style: {
                ...s.btnPri,
                height: 28,
                fontSize: 12,
                padding: '0 14px',
                background: upgradeResult?.ok
                  ? 'var(--dsw-alias-state-success-primary,#059669)'
                  : 'var(--dsw-alias-brand-primary,#4f6ef7)',
                opacity: (upgrading || restarting) ? 0.6 : 1,
              },
              onClick: handleUpgrade,
              disabled: upgrading || restarting || upgradeResult?.ok,
            },
              upgrading
                ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
                    React.createElement('span', { style: { animation: 'spin 1s linear infinite', display: 'inline-flex' } }, React.createElement(Icons.refresh)),
                    '正在自动升级…',
                  )
                : upgradeResult?.ok
                  ? '✓ 升级完成'
                  : `一键升级到 v${info.latest}`
            ),
          ),

          // 简短更新内容 / Release Notes 亮点展示
          info?.releaseNotes && React.createElement('div', {
            style: {
              fontSize: 12,
              color: 'var(--dsw-alias-label-primary, #374151)',
              background: 'var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.85))',
              border: '1px solid var(--dsw-alias-state-info-border, rgba(191, 219, 254, 0.8))',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 10,
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            },
          },
            React.createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-state-info-primary, #2563eb)', marginBottom: 2 } }, '✨ 更新亮点：'),
            info.releaseNotes
          ),

          // 升级成功后：引导重启 DSH 操作卡片
          upgradeResult?.ok && !dismissRestart && React.createElement('div', {
            style: {
              background: 'var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.95))',
              border: '1px solid var(--dsw-alias-state-success-border, #a7f3d0)',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 10,
            },
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
              React.createElement('span', { style: { fontSize: 16 } }, '✨'),
              React.createElement('span', {
                style: { fontSize: 13, fontWeight: 600, color: 'var(--dsw-alias-state-success-primary, #059669)' },
              }, `已成功升级到 v${info.latest}！需要重启 DSH 服务使新版本生效`),
            ),
            !restarting && !restartStatus && React.createElement('div', {
              style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
            },
              React.createElement('button', {
                style: {
                  ...s.btnPri,
                  height: 30,
                  fontSize: 12,
                  padding: '0 14px',
                  background: 'var(--dsw-alias-state-success-primary, #059669)',
                },
                onClick: handleRestart,
              }, '🔄 立即重启 DSH 服务'),
              React.createElement('button', {
                style: {
                  ...s.btnGhost,
                  height: 30,
                  fontSize: 12,
                  padding: '0 12px',
                },
                onClick: () => setDismissRestart(true),
              }, '稍后手动重启'),
            ),
            (restarting || restartStatus) && React.createElement('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: restartStatus?.phase === 'success'
                  ? 'var(--dsw-alias-state-success-primary, #059669)'
                  : restartStatus?.phase === 'timeout'
                    ? 'var(--dsw-alias-state-error-primary, #dc2626)'
                    : 'var(--dsw-alias-state-info-primary, #2563eb)',
                fontWeight: 500,
              },
            },
              restartStatus?.phase !== 'success' && restartStatus?.phase !== 'timeout' && React.createElement('span', {
                style: { animation: 'spin 1s linear infinite', display: 'inline-flex' },
              }, React.createElement(Icons.refresh)),
              restartStatus?.text || '正在处理…',
            ),
          ),

          // 失败提示
          upgradeResult && !upgradeResult.ok && React.createElement('div', {
            style: {
              background: 'var(--dsw-alias-state-error-bg,#fef2f2)',
              border: '1px solid var(--dsw-alias-state-error-border,#fecaca)',
              color: 'var(--dsw-alias-state-error-primary,#991b1b)',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              marginBottom: 8,
              lineHeight: 1.5,
            },
          }, upgradeResult.message),

          React.createElement('div', { style: { marginTop: 4 } },
            React.createElement('button', {
              style: { ...s.btnLink, fontSize: 11, color: 'var(--dsw-alias-label-secondary,#6b7280)' },
              onClick: () => setShowManual(v => !v),
            }, showManual ? '▴ 折叠手动命令行' : '▾ 查看手动升级命令 (如需)'),
          ),

          showManual && React.createElement('div', {
            style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
          },
            upgradeCommands(info.latest).map(({ id, cmd }) =>
              React.createElement(UpgradeCommandRow, { key: id, cmd })
            ),
          ),
        ),
      ),
    ),
  );
}

// ---- Tab Bar ----

const TABS = [
  { id: 'lan',      label: '局域网',    icon: Icons.lan },
  { id: 'tunnel',   label: '公网隧道',  icon: Icons.tunnel },
  { id: 'im',       label: 'IM 机器人', icon: Icons.bot },
  { id: 'security', label: '安全认证',  icon: Icons.security },
  { id: 'ops',      label: '运维监控',  icon: Icons.ops },
];

function TabBar({ active, onChange, dots }) {
  return React.createElement('div', {
    className: 'dsh-tabbar-container',
    style: {
      display: 'flex', gap: 4, marginBottom: 20,
      borderBottom: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      maxWidth: '100%', flexWrap: 'nowrap',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
  },
    TABS.map(({ id, label, icon: TabIcon }) => {
      const isActive = active === id;
      const hasDot   = dots?.[id];
      return React.createElement('button', {
        key: id,
        onClick: () => onChange(id),
        style: {
          font: 'inherit', cursor: 'pointer', border: 'none', background: 'none',
          padding: '8px 14px', fontSize: 13, fontWeight: isActive ? 600 : 400,
          color: isActive
            ? 'var(--dsw-alias-brand-primary,#4f6ef7)'
            : 'var(--dsw-alias-label-secondary,#6b7280)',
          borderBottom: isActive
            ? '2px solid var(--dsw-alias-brand-primary,#4f6ef7)'
            : '2px solid transparent',
          marginBottom: -1,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'color .15s, border-color .15s',
          whiteSpace: 'nowrap', flexShrink: 0,
        },
      },
        TabIcon && React.createElement(TabIcon, {
          style: {
            color: isActive ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : 'var(--dsw-alias-label-tertiary,#9ca3af)',
            width: 16, height: 16, flexShrink: 0,
          },
        }),
        label,
        hasDot && React.createElement('span', {
          style: {
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--dsw-alias-state-success-primary,#10b981)',
            flexShrink: 0,
          },
        }),
      );
    }),
  );
}

// ---- 主面板 ----

function BridgePanel({ rpcCall }) {
  const [status, setStatus]       = React.useState(null);
  const [err, setErr]             = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('lan');
  // 平台列表和连接状态
  const [platforms, setPlatforms] = React.useState(null);
  const [selectedPlatform, setSelectedPlatform] = React.useState('wechat');

  // 远程设备管理权限解锁状态
  const isLocalhost = typeof window === 'undefined' || (
    !window.location.hostname ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '::1' ||
    window.location.hostname === '' ||
    window.location.protocol === 'file:' ||
    window.location.protocol === 'vscode-webview:' ||
    window.location.protocol === 'app:' ||
    window.location.hostname.endsWith('.local')
  );
  const [adminToken, setAdminToken]       = React.useState('');
  const [adminUnlocked, setAdminUnlocked] = React.useState(false);
  const [unlockPassword, setUnlockPassword] = React.useState('');
  const [unlockErr, setUnlockErr]         = React.useState(null);
  const [unlocking, setUnlocking]         = React.useState(false);
  const [showForgotGuide, setShowForgotGuide] = React.useState(false);
  const [showUnlockModal, setShowUnlockModal] = React.useState(false);

  // 本机物理访问自动静默获取 adminToken，免输密码直通管理（支持 3080 原生端口与 3082 代理端口）
  const fetchLoopbackToken = React.useCallback(async () => {
    if (!isLocalhost) return null;
    const currentPort = typeof window !== 'undefined' ? (window.location.port || (window.location.protocol === 'https:' ? '443' : '80')) : '3082';
    const proxyPort = status?.proxy?.port || 3082;
    const candidateUrls = [
      '/__dsh_bridge__/loopback-token',
      `http://127.0.0.1:${proxyPort}/__dsh_bridge__/loopback-token`,
      `http://localhost:${proxyPort}/__dsh_bridge__/loopback-token`,
      'http://127.0.0.1:3082/__dsh_bridge__/loopback-token',
    ];
    const uniqueUrls = [...new Set(candidateUrls)];

    for (const url of uniqueUrls) {
      try {
        const res = await fetch(url, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.adminToken) {
            setAdminToken(data.adminToken);
            setGlobalAdminToken(data.adminToken);
            setAdminUnlocked(true);
            return data.adminToken;
          }
        }
      } catch {}
    }
    return null;
  }, [isLocalhost, status?.proxy?.port]);

  React.useEffect(() => {
    if (isLocalhost && !adminUnlocked) {
      fetchLoopbackToken();
    }
  }, [isLocalhost, adminUnlocked, fetchLoopbackToken]);

  const authRpcCall = React.useCallback(async (endpoint, payload = {}, signal) => {
    let token = adminToken || getGlobalAdminToken();
    if (isLocalhost && !token) {
      token = await fetchLoopbackToken();
    }
    const enriched = {
      ...payload,
      ...(token ? { adminToken: token } : {}),
      ...(isLocalhost ? { isLocalhost: true } : {}),
    };
    const res = await rpcCall(endpoint, enriched, signal);
    if (res?.ok === false) {
      const msg = res?.error?.message || '';
      if (msg.includes('管理员权限') || msg.includes('管理密码解锁')) {
        setUnlockErr(msg);
        setShowUnlockModal(true);
      }
    }
    return res;
  }, [rpcCall, adminToken, isLocalhost, fetchLoopbackToken]);

  const handleUnlockAdmin = React.useCallback(async (e) => {
    e?.preventDefault?.();
    setUnlocking(true);
    setUnlockErr(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authAdminUnlock, { password: unlockPassword });
      if (res?.ok) {
        const token = res.value?.adminToken || '';
        setAdminToken(token);
        setGlobalAdminToken(token);
        setAdminUnlocked(true);
        setUnlockPassword('');
        setShowUnlockModal(false);
        setErr(null);
      } else {
        setUnlockErr(res?.error?.message || '管理员密码错误');
      }
    } catch (err) {
      setUnlockErr(err.message || '解锁请求失败');
    } finally {
      setUnlocking(false);
    }
  }, [rpcCall, unlockPassword]);

  const handleLockAdmin = React.useCallback(async () => {
    try {
      if (adminToken) {
        await rpcCall(BRIDGE_ENDPOINTS.authAdminLock, { adminToken });
      }
    } catch {}
    setAdminToken('');
    setGlobalAdminToken('');
    setAdminUnlocked(false);
  }, [rpcCall, adminToken]);

  const loadInFlightRef = React.useRef(false);
  const loadSeqRef = React.useRef(0);
  const load = React.useCallback(async (quiet = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const currentSeq = ++loadSeqRef.current;
    try {
      const r = await authRpcCall(BRIDGE_ENDPOINTS.getStatus, {});
      if (currentSeq !== loadSeqRef.current) return;
      if (!r?.ok) throw new Error(r?.error?.message ?? 'RPC failed');
      setStatus(r.value);
      if (!quiet) setErr(null);
    } catch (e) {
      if (currentSeq === loadSeqRef.current) setErr(e.message);
    } finally {
      loadInFlightRef.current = false;
    }
  }, [authRpcCall]);

  // 独立轮询所有平台状态（Tab 未选中时也能更新），带 in-flight 锁与序列号防乱序
  const pollPlatformsSeqRef = React.useRef(0);
  React.useEffect(() => {
    let alive = true;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || !alive) return;
      inFlight = true;
      const currentSeq = ++pollPlatformsSeqRef.current;
      try {
        const r = await authRpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
        if (alive && currentSeq === pollPlatformsSeqRef.current && r?.ok) {
          setPlatforms(r.value ?? {});
        }
      } catch { /* 忽略，不影响主面板 */ }
      finally {
        inFlight = false;
      }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [authRpcCall]);

  React.useEffect(() => {
    load();
    const t = setInterval(() => load(true), 3000);
    return () => clearInterval(t);
  }, [load]);

  const act = React.useCallback(async (endpoint, payload) => {
    try {
      const r = await authRpcCall(endpoint, payload ?? {});
      if (!r?.ok) throw new Error(r?.error?.message ?? 'RPC failed');
      setStatus(r.value);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [authRpcCall]);

  const onStartCloudflared = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCloudflared), [act]);
  const onStopCloudflared  = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCloudflared), [act]);
  const onResetCloudflared = React.useCallback(() =>
    act(BRIDGE_ENDPOINTS.stopCloudflared).then(() => act(BRIDGE_ENDPOINTS.startCloudflared))
  , [act]);
  const onToggleCloudflaredAutoStart = React.useCallback((autoStart) =>
    act(BRIDGE_ENDPOINTS.setTunnelAutoStart, { tunnel: 'cloudflared', autoStart })
  , [act]);
  const saveCloudflaredConfig = React.useCallback(({ token, hostname }) =>
    act(BRIDGE_ENDPOINTS.saveCloudflaredConfig, { token, hostname })
  , [act]);

  const onSelectLanIp = React.useCallback((ip) => act(BRIDGE_ENDPOINTS.setLanIp, { ip }), [act]);

  const onStartCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCustomTunnel), [act]);
  const onStopCustom  = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCustomTunnel), [act]);
  const onToggleCustomAutoStart = React.useCallback((autoStart) =>
    act(BRIDGE_ENDPOINTS.setTunnelAutoStart, { tunnel: 'customTunnel', autoStart })
  , [act]);
  const saveConfig = React.useCallback((serverUrl, accessToken) =>
    act(BRIDGE_ENDPOINTS.saveCustomTunnelConfig, { serverUrl, accessToken })
  , [act]);

  const navSecurity = React.useCallback(() => setActiveTab('security'), []);

  if (!status && !err) {
    return React.createElement('div', {
      style: { padding: 32, color: 'var(--dsw-alias-label-tertiary,#9ca3af)', fontSize: 13 },
    }, '加载中…');
  }

  const ct = status?.customTunnel;

  // Tab 状态点：从各自数据源计算
  const imConnected = platforms && Object.values(platforms).some(p => 
    p.status === 'connected' || p.status === 'starting' || p.status === 'reconnecting'
  );
  const dots = {
    lan:      !!(status?.proxy?.running),
    tunnel:   !!(status?.cloudflared?.running || ct?.running),
    im:       !!imConnected,
    security: !!(status?.auth?.enabled),
  };

  // Tab 内容
  let tabContent;
  if (activeTab === 'lan') {
    tabContent = React.createElement(TunnelCard, {
      title: '局域网访问',
      desc: '同一 Wi-Fi 下的设备可直接扫码访问',
      data: { running: status?.proxy?.running, url: status?.lan?.url, qr: status?.lan?.qr },
      auth: status?.auth,
      onNavigateSecurity: navSecurity,
    },
      React.createElement(LanNetworkSelector, {
        lan: status?.lan,
        onSelectIp: onSelectLanIp,
      })
    );
  } else if (activeTab === 'tunnel') {
    tabContent = React.createElement(React.Fragment, null,
      React.createElement(TunnelCard, {
        title: 'Cloudflare 隧道',
        desc: status?.cloudflared?.tokenConfigured
          ? '固定域名模式（Token 运行 · 重启 URL 保持不变）'
          : '一键获取公网地址（免登录临时随机域名）',
        data: {
          running: status?.cloudflared?.running,
          url: status?.cloudflared?.url,
          qr: status?.cloudflared?.qr,
          state: status?.cloudflared?.state,
        },
        autoStart: status?.cloudflared?.autoStart,
        onToggleAutoStart: onToggleCloudflaredAutoStart,
        auth: status?.auth,
        onNavigateSecurity: navSecurity,
        onStart: onStartCloudflared,
        onStop:  onStopCloudflared,
        onReset: status?.cloudflared?.running ? onResetCloudflared : null,
      },
        React.createElement(CloudflareConfigForm, {
          token: status?.cloudflared?.token ?? '',
          hostname: status?.cloudflared?.hostname ?? '',
          onSave: saveCloudflaredConfig,
        }),
      ),
      React.createElement(TunnelCard, {
        title: '自建隧道',
        desc: '连接自己部署的隧道服务器，获得固定域名',
        data: {
          configured: ct?.configured,
          running: ct?.running,
          url: ct?.url,
          qr: ct?.qr,
          state: ct?.state,
        },
        autoStart: ct?.autoStart,
        onToggleAutoStart: onToggleCustomAutoStart,
        auth: status?.auth,
        onNavigateSecurity: navSecurity,
        onStart: onStartCustom,
        onStop:  onStopCustom,
      },
        React.createElement(CustomTunnelGuide),
        React.createElement(CustomTunnelConfigForm, {
          serverUrl: ct?.serverUrl ?? '',
          accessToken: ct?.accessToken ?? '',
          onSave: saveConfig,
        }),
      ),
    );
  } else if (activeTab === 'security') {
    tabContent = React.createElement(AccessAuthCard, {
      auth: status?.auth,
      rpcCall: authRpcCall,
      onUpdate: () => load(true),
    });
  } else if (activeTab === 'ops') {
    tabContent = React.createElement(React.Fragment, null,
      React.createElement(SystemMetricsWidget, { metrics: status?.system }),
      React.createElement(RemoteWorkspaceCard, { rpcCall: authRpcCall }),
      React.createElement(NetworkDiagnosticWidget, { rpcCall: authRpcCall }),
      React.createElement(BackupRestoreWidget, {
        rpcCall: authRpcCall,
        onUpdate: () => load(true),
      }),
      React.createElement(RestartDshCard, { rpcCall: authRpcCall }),
    );
  } else if (activeTab === 'im') {
    // 从 listPlatforms 动态生成平台列表
    const IM_PLATFORMS = [
      { id: 'wechat',   label: '微信',     icon: Icons.wechat,   brandColor: '#07C160', desc: 'ClawBot 扫码直连 · 无需公网' },
      { id: 'qq',       label: 'QQ',       icon: Icons.qq,       brandColor: '#12B7F5', desc: '官方机器人 · 私聊/群聊/按钮' },
      { id: 'feishu',   label: '飞书',     icon: Icons.feishu,   brandColor: '#00D6B9', desc: '官方 WebSocket 长连接 · 免公网' },
      { id: 'telegram', label: 'Telegram', icon: Icons.telegram, brandColor: '#24A1DE', desc: '官方 Bot API' },
    ];
    
    tabContent = React.createElement('div', null,
      // 平台选择器（可点击切换）
      React.createElement('div', {
        style: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
      },
        IM_PLATFORMS.map(({ id, label, icon: IconComponent, brandColor, desc }) => {
          const platformData = platforms?.[id];
          const available = !!platformData;
          const active = platformData?.status === 'connected' || platformData?.status === 'starting' || platformData?.status === 'reconnecting';
          
          return React.createElement('div', {
            key: id,
            style: {
              flex: '1 1 135px',
              border: `1px solid ${selectedPlatform === id ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : active ? 'var(--dsw-alias-state-success-primary,#10b981)' : 'var(--dsw-alias-border-l2,#e5e7eb)'}`,
              borderRadius: 10,
              padding: '12px 14px',
              opacity: available ? 1 : 0.5,
              cursor: available ? 'pointer' : 'not-allowed',
              background: selectedPlatform === id ? 'var(--dsw-alias-state-info-bg,#eff6ff)' : active ? 'var(--dsw-alias-state-success-bg,#ecfdf5)' : 'var(--dsw-alias-bg-layer-2,#f9fafb)',
              boxShadow: selectedPlatform === id ? '0 0 0 1px var(--dsw-alias-brand-primary,#4f6ef7)' : 'none',
              transition: 'all 0.15s ease',
            },
            onClick: available ? () => setSelectedPlatform(id) : undefined,
          },
            React.createElement('div', { style: { ...s.label, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
              React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
                IconComponent && React.createElement(IconComponent, { style: { color: brandColor, width: 18, height: 18, flexShrink: 0 } }),
                label,
              ),
              active && React.createElement('span', {
                style: { width: 6, height: 6, borderRadius: '50%', background: 'var(--dsw-alias-state-success-primary,#10b981)', flexShrink: 0 },
              }),
              !active && available && React.createElement('span', {
                style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary,#6b7280)', fontWeight: 400 },
              }, '未连接'),
              !available && React.createElement('span', {
                style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary,#9ca3af)', fontWeight: 400 },
              }, '即将支持'),
            ),
            React.createElement('div', { style: { ...s.muted, marginTop: 4, fontSize: 11 } }, desc),
          );
        }),
      ),
      // 显示选中的平台卡片（带有 key 保证切换时重置表单状态）
      selectedPlatform && platforms?.[selectedPlatform] && React.createElement(PlatformCard, {
        key: selectedPlatform,
        platformId: selectedPlatform,
        platformName: IM_PLATFORMS.find(p => p.id === selectedPlatform)?.label ?? selectedPlatform,
        platformDesc: IM_PLATFORMS.find(p => p.id === selectedPlatform)?.desc ?? '',
        rpcCall: authRpcCall,
        onStatusChange: () => {}, // 状态变化已由 listPlatforms 轮询处理，不需要回调
      }),
    );
  }

  const auth = status?.auth;
  const policy = auth?.adminPolicy ?? 'password_unlock';
  const isLocked = !isLocalhost && auth?.enabled && policy !== 'open' && !adminUnlocked;

  // 远程设备被锁定：全局展示锁定页面，阻断所有 Tab 的查看与操作
  if (isLocked) {
    return React.createElement('div', { style: { maxWidth: 620 } },
      policy === 'local_only' ? (
        React.createElement('div', {
          style: { ...s.card, textAlign: 'center', padding: '36px 20px', marginTop: 10 },
        },
          React.createElement('div', { style: { fontSize: 40, marginBottom: 12 } }, '🛡️'),
          React.createElement('div', { style: { ...s.label, fontSize: 16, fontWeight: 600, marginBottom: 8 } }, '管理控制台已锁定（仅限电脑本机管理）'),
          React.createElement('div', { style: { ...s.muted, maxWidth: 420, margin: '0 auto', lineHeight: 1.6, fontSize: 13 } },
            '当前设备通过远程局域网或公网接入。已开启「仅限电脑本机管理」最高安全策略，远程设备禁止查看与修改任何网络与机器人配置。如需管理请在电脑本机（127.0.0.1）上操作。'
          ),
          React.createElement('div', { style: { marginTop: 20 } },
            React.createElement('button', {
              type: 'button',
              style: { ...s.btnLink, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' },
              onClick: () => setShowForgotGuide(v => !v),
            }, '❓ 远程如何救急解除锁定？'),
          ),
          showForgotGuide && React.createElement('div', {
            style: {
              marginTop: 14, padding: '12px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.6,
              background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
              color: 'var(--dsw-alias-label-secondary,#4b5563)', textAlign: 'left', maxWidth: 420, margin: '14px auto 0',
            },
          },
            React.createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary,currentColor)', marginBottom: 4 } }, '🛟 救急解除锁定指引：'),
            React.createElement('div', null, '1. ', React.createElement('strong', null, '电脑本机直连修改'), '：直接在运行本程序的电脑本机打开本控制台（127.0.0.1 享有物理免锁特权），可随时修改策略或清除密码。'),
            React.createElement('div', { style: { marginTop: 4 } }, '2. ', React.createElement('strong', null, '服务器救急指令'), '：在宿主电脑/服务器终端执行 ', React.createElement('code', { style: s.code }, 'touch ~/.dsh/dsh-bridge/reset-auth'), ' 即可瞬间清空密码恢复初始状态。'),
          ),
        )
      ) : (
        React.createElement('div', {
          style: { ...s.card, maxWidth: 440, margin: '20px auto', padding: '32px 24px' },
        },
          React.createElement('div', { style: { textAlign: 'center', marginBottom: 20 } },
            React.createElement('div', { style: { fontSize: 40, marginBottom: 10 } }, '🔒'),
            React.createElement('div', { style: { ...s.label, fontSize: 16, fontWeight: 600 } }, '管理控制台已锁定'),
            React.createElement('div', { style: { ...s.muted, fontSize: 12, marginTop: 6, lineHeight: 1.5 } },
              '当前设备为远程访问。为保护您的网络与平台配置安全，请输入管理员密码解锁管理权限。'
            ),
          ),
          React.createElement('form', {
            onSubmit: handleUnlockAdmin,
            style: { display: 'flex', flexDirection: 'column', gap: 12 },
          },
            React.createElement('input', {
              type: 'password',
              style: s.input,
              placeholder: '输入后台管理密码',
              value: unlockPassword,
              onChange: (e) => setUnlockPassword(e.target.value),
              autoFocus: true,
            }),
            unlockErr && React.createElement('div', {
              style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary,#dc2626)' },
            }, unlockErr),
            React.createElement('button', {
              type: 'submit',
              style: { ...s.btnPri, width: '100%', justifyContent: 'center', height: 36, background: '#4f6ef7', color: '#ffffff' },
              disabled: unlocking,
            }, unlocking ? '验证中…' : '解锁管理权限'),
          ),
          React.createElement('div', { style: { marginTop: 16, textAlign: 'center' } },
            React.createElement('button', {
              type: 'button',
              style: { ...s.btnLink, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' },
              onClick: () => setShowForgotGuide(v => !v),
            }, '❓ 忘记后台管理密码？'),
          ),
          showForgotGuide && React.createElement('div', {
            style: {
              marginTop: 12, padding: '12px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.6,
              background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
              color: 'var(--dsw-alias-label-secondary,#4b5563)', textAlign: 'left',
            },
          },
            React.createElement('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary,currentColor)', marginBottom: 4 } }, '🛟 找回与重置密码指引：'),
            React.createElement('div', null, '1. ', React.createElement('strong', null, '电脑本机直连修改'), '：直接在运行本程序的电脑本机打开本控制台（127.0.0.1 享有物理免锁特权），可随时修改管理密码。'),
            React.createElement('div', { style: { marginTop: 4 } }, '2. ', React.createElement('strong', null, '服务器救急指令'), '：在宿主电脑终端执行 ', React.createElement('code', { style: s.code }, 'touch ~/.dsh/dsh-bridge/reset-auth'), ' 即可瞬间清空密码恢复初始状态。'),
          ),
        )
      )
    );
  }

  const isInterceptionErr = err && (err.includes('管理员权限') || err.includes('管理密码解锁'));

  return React.createElement('div', { style: { maxWidth: 620, position: 'relative' } },
    // 错误横幅（如果是权限拦截，直接提供醒目的输入密码解锁按钮）
    err && React.createElement('div', {
      style: {
        ...s.card,
        background: 'var(--dsw-alias-state-error-bg,#fef2f2)',
        color: 'var(--dsw-alias-state-error-primary,#dc2626)',
        fontSize: 13,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
      },
    },
      React.createElement('span', { style: { flex: '1 1 auto' } }, err),
      isInterceptionErr && React.createElement('button', {
        type: 'button',
        style: { ...s.btnPri, background: '#dc2626', color: '#ffffff', height: 26, fontSize: 12, padding: '0 10px', flexShrink: 0 },
        onClick: () => {
          setUnlockErr(err);
          setShowUnlockModal(true);
        },
      }, '🔑 立即输入管理密码解锁'),
    ),

    // 管理员解锁状态提示条
    !isLocalhost && adminUnlocked && React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', background: 'var(--dsw-alias-state-info-bg,#eff6ff)',
        border: '1px solid var(--dsw-alias-brand-primary,#4f6ef7)', borderRadius: 8,
        marginBottom: 14, fontSize: 12, color: 'var(--dsw-alias-brand-primary,#4f6ef7)',
      },
    },
      React.createElement('span', null, '🔓 管理员权限已解锁（当前临时会话有效）'),
      React.createElement('button', {
        style: { ...s.btnGhost, height: 24, fontSize: 11, padding: '0 8px' },
        onClick: handleLockAdmin,
      }, '🔒 重新锁定后台'),
    ),

    // 未解锁时的顶部引导条
    !isLocalhost && !adminUnlocked && auth?.enabled && policy !== 'open' && React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', background: 'var(--dsw-alias-state-warn-bg,#fffbeb)',
        border: '1px solid var(--dsw-alias-state-warn-border,#fde68a)', borderRadius: 8,
        marginBottom: 14, fontSize: 12, color: 'var(--dsw-alias-state-warn-primary,#92400e)',
      },
    },
      React.createElement('span', null, '🔒 后台管理权限未解锁（修改敏感配置需先解锁）'),
      React.createElement('button', {
        type: 'button',
        style: { ...s.btnPri, height: 24, fontSize: 11, padding: '0 10px', background: '#d97706' },
        onClick: () => setShowUnlockModal(true),
      }, '🔑 解锁管理权限'),
    ),

    React.createElement(VersionBanner, { rpcCall: authRpcCall }),

    React.createElement(TabBar, { active: activeTab, onChange: setActiveTab, dots }),

    tabContent,

    // 全局交互式解锁弹窗 Modal
    showUnlockModal && React.createElement('div', {
      style: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      },
      onClick: (e) => { if (e.target === e.currentTarget) setShowUnlockModal(false); },
    },
      React.createElement('div', {
        style: {
          background: 'var(--dsw-alias-bg-layer-1,#ffffff)', borderRadius: 14,
          padding: '24px 24px', maxWidth: 420, width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
        },
      },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
          React.createElement('div', { style: { fontSize: 16, fontWeight: 600, color: 'var(--dsw-alias-label-primary,currentColor)', display: 'flex', alignItems: 'center', gap: 8 } },
            '🔒 解锁后台管理权限'
          ),
          React.createElement('button', {
            type: 'button',
            style: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--dsw-alias-label-tertiary,#9ca3af)', padding: 0 },
            onClick: () => setShowUnlockModal(false),
          }, '✕'),
        ),
        React.createElement('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-secondary,#4b5563)', marginBottom: 16, lineHeight: 1.5 } },
          '当前操作需要后台管理员权限。为保护您的网络配置与机器人平台安全，请输入管理密码解锁：'
        ),
        React.createElement('form', {
          onSubmit: handleUnlockAdmin,
          style: { display: 'flex', flexDirection: 'column', gap: 12 },
        },
          React.createElement('input', {
            type: 'password',
            style: s.input,
            placeholder: '请输入后台管理密码',
            value: unlockPassword,
            onChange: (e) => setUnlockPassword(e.target.value),
            autoFocus: true,
          }),
          unlockErr && React.createElement('div', {
            style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary,#dc2626)' },
          }, unlockErr),
          React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 } },
            React.createElement('button', {
              type: 'button',
              style: s.btnGhost,
              onClick: () => setShowUnlockModal(false),
            }, '取消'),
            React.createElement('button', {
              type: 'submit',
              style: { ...s.btnPri, background: '#4f6ef7', color: '#fff' },
              disabled: unlocking || !unlockPassword,
            }, unlocking ? '验证中…' : '立即解锁'),
          ),
        ),
        React.createElement('div', { style: { marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--dsw-alias-border-l2,#f3f4f6)', fontSize: 11, color: 'var(--dsw-alias-label-tertiary,#9ca3af)', textAlign: 'center', lineHeight: 1.5 } },
          '💡 提示：若未单独配置管理密码，请输入初次设置的访问密码；电脑本机（127.0.0.1）访问享有免密管理特权。'
        ),
      ),
    ),
  );
}

// ---- 移动端自适应与触控交互增强 ----

function injectMobileStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('dsh-bridge-mobile-styles')) return;

  const style = document.createElement('style');
  style.id = 'dsh-bridge-mobile-styles';
  style.textContent = `
    /* DSH Bridge 隐藏 Tab 栏原生滚动条并保持平滑滑动 */
    .dsh-tabbar-container {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .dsh-tabbar-container::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    /* DSH Bridge 移动端自适应与触控交互增强样式 */
    :root {
      --dsh-mobile-header-h: 52px;
      --dsh-mobile-safe-top: env(safe-area-inset-top, 0px);
      --dsh-mobile-safe-bottom: env(safe-area-inset-bottom, 0px);
    }

    @media (max-width: 768px) {
      /* 1. 主框架为 Header 腾出顶部空间 */
      div[class*="_frame"] {
        display: flex !important;
        flex-direction: column !important;
        width: 100vw !important;
        height: 100dvh !important;
        margin: 0 !important;
        padding-top: var(--dsh-mobile-header-h) !important;
        position: relative !important;
        grid-template-columns: 1fr !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }

      /* 2. 顶部原生导航条：100% 还原 DeepSeek App (左侧双横线，右侧(+)，中间留白，无多余设置按钮) */
      .dsh-mobile-app-header {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: var(--dsh-mobile-header-h) !important;
        padding-top: var(--dsh-mobile-safe-top) !important;
        background: transparent !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
        z-index: 9998 !important;
        box-sizing: border-box !important;
        user-select: none !important;
        pointer-events: none !important;
      }

      /* 左侧双横线按钮 (DeepSeek App 原生图标) */
      .dsh-header-menu-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--dsw-alias-label-primary, #111827);
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        cursor: pointer;
        padding: 0;
        transition: opacity 0.15s;
        pointer-events: auto !important;
      }
      .dsh-header-menu-btn:active {
        opacity: 0.6;
      }

      /* 右侧 (+) 新建会话按钮 (DeepSeek App 原生图标) */
      .dsh-header-new-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--dsw-alias-label-primary, #111827);
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        cursor: pointer;
        padding: 0;
        transition: opacity 0.15s;
        pointer-events: auto !important;
      }
      .dsh-header-new-btn:active {
        opacity: 0.6;
      }

      /* 中间动态会话标题 (单行居中打点截断，100% 还原原生 App 导航体验) */
      .dsh-mobile-header-title {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        text-align: center !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        padding: 0 10px !important;
        user-select: none !important;
        pointer-events: none !important;
        letter-spacing: -0.2px !important;
      }

      /* 3. 中间主内容区与输入框 */
      div[class*="_centerCol"] {
        flex: 1 1 100% !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        display: flex !important;
        height: 100% !important;
      }

      div[class*="_detailsCol"],
      div[class*="toggleCluster"],
      div[class*="W-zNGW_toggleCluster"] {
        display: none !important;
      }

      /* 3.0 工作区 Workbench / 任务管理 / 多 Tab 栏移动端自适应适配 */
      body:not(.dsh-workbench-open) div[class*="nArs4W_panel"],
      body:not(.dsh-workbench-open) div[class*="workbench_panel"],
      body:not(.dsh-workbench-open) div[class*="workbenchPanel"],
      div[class*="nArs4W_panel"][class*="panelHidden"],
      div[class*="workbench_panel"][class*="panelHidden"],
      div[class*="workbenchPanel"][class*="panelHidden"],
      div[class*="panelHidden"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        max-height: 0 !important;
        z-index: -1 !important;
        opacity: 0 !important;
        transform: translateX(105%) !important;
      }

      body.dsh-workbench-open div[class*="nArs4W_panel"]:not([class*="panelHidden"]),
      body.dsh-workbench-open div[class*="workbench_panel"]:not([class*="panelHidden"]),
      body.dsh-workbench-open div[class*="workbenchPanel"]:not([class*="panelHidden"]) {
        display: flex !important;
        visibility: visible !important;
        pointer-events: auto !important;
        top: var(--dsh-mobile-header-h, 52px) !important;
        height: calc(100dvh - var(--dsh-mobile-header-h, 52px)) !important;
        max-height: calc(100dvh - var(--dsh-mobile-header-h, 52px)) !important;
        z-index: 50 !important;
        box-sizing: border-box !important;
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        transform: none !important;
        opacity: 1 !important;
      }

      /* Tab 栏：横向滑动手势 + 干净的底部边框，杜绝与顶部移动端 Header 重叠 */
      div[class*="nArs4W_tabBar"],
      div[class*="workbench_tabBar"],
      div[class*="tabBar"] {
        min-height: 40px !important;
        height: 40px !important;
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 8px !important;
        gap: 6px !important;
        overflow: visible !important;
        box-sizing: border-box !important;
      }

      div[class*="nArs4W_tabList"],
      div[class*="tabList"] {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        overflow-x: auto !important;
        scrollbar-width: none !important;
        -webkit-overflow-scrolling: touch !important;
      }
      div[class*="nArs4W_tabList"]::-webkit-scrollbar,
      div[class*="tabList"]::-webkit-scrollbar {
        display: none !important;
      }

      /* 单个 Tab 胶囊化，文字超长自动打点，防止 Tab 互相挤压 */
      div[class*="nArs4W_tab"],
      div[class*="workbench_tab"] {
        flex: 0 0 auto !important;
        max-width: 170px !important;
        min-width: 70px !important;
        height: 30px !important;
        padding: 0 8px 0 10px !important;
        border-radius: 6px !important;
        font-size: 12.5px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        background: var(--dsw-alias-bg-layer-2, #f3f4f6) !important;
        color: var(--dsw-alias-label-secondary, #6b7280) !important;
        cursor: pointer !important;
        user-select: none !important;
        box-sizing: border-box !important;
      }

      div[class*="nArs4W_tabActive"],
      div[class*="workbench_tabActive"] {
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
        font-weight: 600 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      }

      span[class*="nArs4W_tabTitle"],
      span[class*="tabTitle"] {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        flex: 1 1 auto !important;
      }

      button[class*="nArs4W_tabClose"],
      button[class*="tabClose"] {
        width: 18px !important;
        height: 18px !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        opacity: 0.6 !important;
        padding: 0 !important;
      }

      button[class*="nArs4W_tabBarPlus"],
      button[class*="tabBarPlus"] {
        width: 28px !important;
        height: 28px !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }

      /* 移动端面板右上角“返回对话 / ✕ 收起”按钮：常驻右侧，醒目且易触达 */
      .dsh-mobile-panel-close-btn {
        margin-left: 8px !important;
        flex: 0 0 auto !important;
        height: 28px !important;
        padding: 0 10px !important;
        border-radius: 14px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        background: #2563eb !important;
        color: #ffffff !important;
        border: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        cursor: pointer !important;
        user-select: none !important;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.28) !important;
        white-space: nowrap !important;
        transition: transform 0.1s, opacity 0.15s !important;
        z-index: 10 !important;
      }
      .dsh-mobile-panel-close-btn:active {
        transform: scale(0.95) !important;
        opacity: 0.85 !important;
      }

      /* 3.1 会话对话头部顶栏：移动端防挤压与空间释放优化（严格排除 .dsh-mobile-app-header） */
      div[class*="_centerCol"] header,
      header[class*="wSkVaW_header"] {
        padding: 4px 16px 2px 16px !important;
        position: relative !important;
        overflow: visible !important;
      }

      div[class*="wSkVaW_titleRow"],
      div[class*="titleRow"] {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        min-height: 32px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 移动端将原有嵌入在内容区的长面包屑标题隐藏（已统一提升至顶部导航栏正中），彻底释放第二行空间 */
      nav[class*="wSkVaW_crumbs"],
      nav[class*="crumbs"],
      div[class*="wSkVaW_crumbs"],
      div[class*="crumbs"],
      [class*="wSkVaW_crumbs"] {
        display: none !important;
      }

      /* 子代理/智能体模式胶囊 (Actions)：紧凑圆角胶囊 */
      div[class*="wSkVaW_headerActions"],
      div[class*="headerActions"] {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin-left: 0 !important;
      }

      button[class*="h8S2Va_trigger"],
      button[class*="subagent"] {
        min-height: 26px !important;
        height: 26px !important;
        padding: 2px 8px !important;
        font-size: 11.5px !important;
        line-height: 16px !important;
        border-radius: 13px !important;
        background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.04)) !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
      }

      /* Session Log 导出下载按钮 (Utilities)：在移动端极简为 28px 圆形纯图标按钮，隐藏长文本，极大释放顶部空间 */
      div[class*="wSkVaW_headerUtilities"],
      div[class*="headerUtilities"] {
        flex: 0 0 auto !important;
        margin-left: 4px !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      button[class*="nL4_yW_sessionLogButton"],
      button[class*="sessionLogButton"] {
        min-width: 28px !important;
        width: 28px !important;
        height: 28px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1)) !important;
        background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.03)) !important;
        color: var(--dsw-alias-label-secondary, #6b7280) !important;
        margin-left: 0 !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
      }

      button[class*="nL4_yW_sessionLogButton"]:hover:not(:disabled),
      button[class*="sessionLogButton"]:hover:not(:disabled) {
        background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
      }

      button[class*="nL4_yW_sessionLogButton"] span,
      button[class*="sessionLogButton"] span {
        display: none !important;
      }

      button[class*="nL4_yW_sessionLogButton"] svg,
      button[class*="sessionLogButton"] svg {
        width: 13px !important;
        height: 13px !important;
        margin: 0 !important;
      }

      /* 子代理展开菜单在移动端右对齐与宽度自适应 */
      div[class*="h8S2Va_menu"] {
        max-width: calc(100vw - 32px) !important;
        left: auto !important;
        right: 0 !important;
      }

      /* 输入框底座：DeepSeek App 居中及底部固定 */
      div[class*="wSkVaW_scrollBody"] {
        padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
      }

      /* 输入卡片：DeepSeek App 圆角大胶囊造型 */
      div[class*="uV2eYG_card"] {
        border-radius: 26px !important;
        padding: 14px 16px 12px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgba(0, 0, 0, 0.07) !important;
        background: var(--dsw-alias-bg-layer-2, #f4f4f7) !important;
      }

      /* 输入框底部工具栏：弹性自适应，彻底杜绝权限选择器(Full access)与模型选择器重叠碰撞 */
      div[class*="uV2eYG_row"] {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        width: 100% !important;
        padding: 2px 2px 4px !important;
        box-sizing: border-box !important;
      }

      div[class*="uV2eYG_tools"] {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      div[class*="uV2eYG_modes"] {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      button[class*="Sh0Q9G_trigger"] {
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      div[class*="uV2eYG_trailing"] {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 6px !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }

      div[class*="_7KE1Ra_root"] {
        flex: 0 1 auto !important;
        min-width: 0 !important;
        max-width: 180px !important;
      }

      button[class*="_7KE1Ra_trigger"] {
        max-width: 100% !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
        padding: 0 4px 0 6px !important;
      }

      span[class*="_7KE1Ra_triggerLabel"] {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        min-width: 0 !important;
      }

      /* 4. 原生侧边栏抽屉化 (Drawer) */
      div[class*="_sidebarCol"] {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        height: 100dvh !important;
        width: 290px !important;
        max-width: 82vw !important;
        z-index: 10000 !important;
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        transform: translateX(-105%);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        overflow-y: auto !important;
        border-right: 1px solid rgba(0, 0, 0, 0.06) !important;
        pointer-events: auto !important;
      }
      body.dsh-drawer-open div[class*="_sidebarCol"] {
        transform: translateX(0) !important;
        box-shadow: 4px 0 28px rgba(0, 0, 0, 0.25) !important;
        pointer-events: auto !important;
      }

      /* 抽屉内部：强制 100% 宽度，无论内部状态如何均正常展开并展示 DSH 自带的顶部收起侧边栏图标 */
      body.dsh-drawer-open div[class*="hHd-Xa_root"] {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
      }
      body.dsh-drawer-open div[class*="hHd-Xa_collapsed"] div[class*="hHd-Xa_regionArea"],
      body.dsh-drawer-open div[class*="hHd-Xa_collapsed"] button[class*="hHd-Xa_newSession"],
      body.dsh-drawer-open div[class*="hHd-Xa_collapsed"] div[class*="qDHVXG_root"] {
        display: flex !important;
        visibility: visible !important;
      }
      div[class*="hHd-Xa_logoRow"] {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
        padding: 10px 14px 6px 14px !important;
        box-sizing: border-box !important;
      }
      div[class*="hHd-Xa_logoRow"] button[class*="hHd-Xa_toggle"] {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        border-radius: 8px !important;
        color: var(--dsw-alias-label-secondary, #6b7280) !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        margin-left: auto !important;
        transition: background 0.15s, color 0.15s !important;
      }
      div[class*="hHd-Xa_logoRow"] button[class*="hHd-Xa_toggle"]:active {
        background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.06)) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
      }

      /* 设置弹窗打开时解除抽屉隐藏限制 */
      div[class*="_sidebarCol"]:has(div[class*="VOzbGW_overlay"]) {
        transform: none !important;
        width: 100vw !important;
        max-width: 100vw !important;
        background: transparent !important;
        box-shadow: none !important;
        pointer-events: none !important;
      }

      /* 5. 半透明背景遮罩 */
      .dsh-mobile-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 9999;
        display: none !important;
      }
      body.dsh-drawer-open .dsh-mobile-backdrop {
        display: block !important;
        pointer-events: auto !important;
      }

      /* 6. 设置中心全自适应适配 */
      div[class*="VOzbGW_overlay"] {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(0, 0, 0, 0.45) !important;
        backdrop-filter: blur(4px) !important;
        -webkit-backdrop-filter: blur(4px) !important;
        z-index: 10002 !important;
        padding: 10px !important;
        box-sizing: border-box !important;
        pointer-events: auto !important;
      }
      div[class*="VOzbGW_panel"] {
        width: 100% !important;
        max-width: 100% !important;
        height: 92dvh !important;
        max-height: 92dvh !important;
        display: flex !important;
        flex-direction: row !important;
        border-radius: 18px !important;
        overflow: hidden !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25) !important;
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
      }
      nav[class*="VOzbGW_nav"] {
        width: 78px !important;
        min-width: 78px !important;
        max-width: 78px !important;
        padding: 10px 4px !important;
        box-sizing: border-box !important;
        border-right: 1px solid var(--dsw-alias-border-l2, #e5e7eb) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        overflow-y: auto !important;
      }
      nav[class*="VOzbGW_nav"] button[class*="VOzbGW_navCell"],
      button[class*="VOzbGW_navCell"] {
        padding: 8px 2px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        height: auto !important;
        min-height: 48px !important;
        gap: 4px !important;
        border-radius: 10px !important;
      }
      span[class*="VOzbGW_navLabel"] {
        font-size: 10.5px !important;
        line-height: 1.2 !important;
        white-space: normal !important;
        word-break: break-all !important;
        text-align: center !important;
      }
      div[class*="VOzbGW_content"] {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        width: calc(100% - 78px) !important;
        max-width: calc(100% - 78px) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
      }
      div[class*="VOzbGW_options"] {
        flex: 1 1 auto !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        padding: 0 14px 20px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }

      /* 设置中心选项行手机自适应（垂直流式，防文字单字折行） */
      div[class*="VOzbGW_options"] div[class*="_row"] {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
        width: 100% !important;
        padding: 12px 0 !important;
        box-sizing: border-box !important;
      }
      div[class*="VOzbGW_options"] div[class*="_rowText"] {
        width: 100% !important;
        max-width: 100% !important;
      }
      div[class*="VOzbGW_options"] button[class*="_selector"],
      div[class*="VOzbGW_options"] select,
      div[class*="VOzbGW_options"] input {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 7. 代码块、表格与徽标自适应 */
      pre, code, pre > code, table {
        max-width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        font-size: 12.5px !important;
      }

      /* 状态徽标与药丸按钮永不折字 */
      span[style*="border-radius: 999"],
      span[style*="border-radius:999"] {
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        min-width: max-content !important;
      }

      /* 二维码与图片移动端弹性缩放 */
      img[alt="QR"], img[src^="data:image"] {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 8. 确保所有 Popover 弹出菜单、操作气泡、下拉框位于抽屉之上且支持触控交互 */
      div[class*="_portal"],
      div[class*="portal"],
      div[class*="popup"],
      div[class*="dropdown"],
      div[class*="menu"],
      div[role="menu"],
      div[role="dialog"] {
        z-index: 10005 !important;
        pointer-events: auto !important;
      }

      /* 9. 移动端侧边栏：会话与工作区三点操作按钮始终清晰可见且易于点击 */
      div[class*="sessionRow"] span[class*="rowActions"],
      div[class*="sessionRow"] button[class*="iconButton"],
      div[class*="treeBody"] button[class*="iconButton"] {
        opacity: 0.8 !important;
        display: inline-flex !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
      div[class*="sessionRow"]:active {
        background: var(--dsw-alias-bg-layer-2, #f3f4f6) !important;
      }

      /* 全局 overlayLayer 绝不被染黑 */
      div[class*="overlayLayer"],
      div[class*="uV2eYG_overlayAnchor"] {
        background: transparent !important;
        pointer-events: none !important;
      }
      div[class*="overlayLayer"] > * {
        pointer-events: auto !important;
      }
    }

    /* 远程工作区选择弹窗移动端/桌面端自适应样式 */
    #dsh-remote-workspace-modal {
      position: fixed !important;
      inset: 0 !important;
      z-index: 100000 !important;
      background: rgba(0, 0, 0, 0.65) !important;
      backdrop-filter: blur(5px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: var(--dsw-alias-label-primary, #111827) !important;
    }

    .dsh-ws-dialog-card {
      background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
      border: 1px solid var(--dsw-alias-border-l1, #e5e7eb) !important;
      border-radius: 16px !important;
      width: 100% !important;
      max-width: 620px !important;
      max-height: 88vh !important;
      display: flex !important;
      flex-direction: column !important;
      box-shadow: 0 25px 35px -5px rgba(0,0,0,0.3), 0 12px 16px -5px rgba(0,0,0,0.2) !important;
      overflow: hidden !important;
      animation: dshModalFadeIn 0.2s ease-out !important;
    }

    .dsh-ws-chips-scroll {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      overflow-x: auto !important;
      white-space: nowrap !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
      -webkit-overflow-scrolling: touch !important;
      padding: 2px 0 !important;
    }
    .dsh-ws-chips-scroll::-webkit-scrollbar {
      display: none !important;
    }

    @media (max-width: 640px) {
      #dsh-remote-workspace-modal {
        align-items: flex-end !important;
        padding: 0 !important;
      }

      .dsh-ws-dialog-card {
        max-height: 92dvh !important;
        height: 92dvh !important;
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
        border-bottom: none !important;
        max-width: 100vw !important;
        width: 100vw !important;
        margin: 0 !important;
        animation: dshBottomSheetUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      .dsh-ws-drag-handle {
        display: block !important;
      }
    }

    @keyframes dshModalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes dshBottomSheetUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    @media (min-width: 769px) {
      .dsh-mobile-app-header,
      .dsh-mobile-backdrop,
      .dsh-mobile-panel-close-btn {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function setupMobileExperience(rpcCall, ctx) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  injectMobileStyles();

  // 1. 创建顶部 DeepSeek App 风格导航条 (Header: 左侧双横线，中间当前会话标题，右侧(+))
  let header = document.querySelector('.dsh-mobile-app-header');
  let titleEl = document.querySelector('.dsh-mobile-header-title');
  if (!header) {
    header = document.createElement('header');
    header.className = 'dsh-mobile-app-header';

    // 左侧双横线菜单按钮 (DeepSeek App 原生图标)：联动展开 DSH 原生侧边栏会话列表
    const leftBtn = document.createElement('button');
    leftBtn.className = 'dsh-header-menu-btn';
    leftBtn.title = '打开菜单';
    leftBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="3" y1="8" x2="21" y2="8"></line>
        <line x1="3" y1="15" x2="14" y2="15"></line>
      </svg>
    `;
    leftBtn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = document.body.classList.toggle('dsh-drawer-open');
      if (isOpen) {
        const expand = document.querySelector('button[aria-label*="打开侧边栏"], button[title*="打开侧边栏"]');
        if (expand) expand.click();
      }
    };

    // 中间动态会话标题 (居中展示当前会话名称，点击可快速切回对话流)
    titleEl = document.createElement('div');
    titleEl.className = 'dsh-mobile-header-title';
    titleEl.innerText = '新会话';
    titleEl.onclick = () => {
      const openPanels = document.querySelectorAll('div[class*="nArs4W_panel"]:not([class*="panelHidden"]), div[class*="workbench_panel"]:not([class*="panelHidden"])');
      openPanels.forEach((p) => p.classList.add('nArs4W_panelHidden'));
    };

    // 右侧 (+) 新建会话按钮 (DeepSeek App 圆形加号风格)
    const rightBtn = document.createElement('button');
    rightBtn.className = 'dsh-header-new-btn';
    rightBtn.title = '新建会话';
    rightBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9.5"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    `;
    rightBtn.onclick = () => {
      const openPanels = document.querySelectorAll('div[class*="nArs4W_panel"]:not([class*="panelHidden"]), div[class*="workbench_panel"]:not([class*="panelHidden"])');
      openPanels.forEach((p) => p.classList.add('nArs4W_panelHidden'));
      const dshNewBtn = document.querySelector('button[aria-label="新建会话"]');
      if (dshNewBtn) dshNewBtn.click();
    };

    header.appendChild(leftBtn);
    header.appendChild(titleEl);
    header.appendChild(rightBtn);
    document.body.appendChild(header);
  }

  // 绑定会话标题实时同步 (切换会话或收到首条回复自动更新)
  const syncMobileTitle = () => {
    if (!titleEl) titleEl = document.querySelector('.dsh-mobile-header-title');
    if (!titleEl) return;
    const snap = ctx?.sessions?.list?.getSnapshot?.();
    if (!snap) return;
    const cur = snap.current ? snap.byId?.[snap.current] : null;
    if (!cur || cur.blank) {
      titleEl.innerText = '新会话';
    } else {
      titleEl.innerText = cur.displayTitle || cur.title || '会话';
    }
  };

  syncMobileTitle();
  if (typeof ctx?.sessions?.list?.subscribe === 'function') {
    ctx.sessions.list.subscribe(syncMobileTitle);
  }
  if (typeof ctx?.sessions?.active?.subscribe === 'function') {
    ctx.sessions.active.subscribe(() => {
      if (document.body.classList.contains('dsh-drawer-open')) {
        document.body.classList.remove('dsh-drawer-open');
      }
      // 仅在移动端切换会话时自动收起右侧面板回到对话（PC端绝不干扰）
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        document.body.classList.remove('dsh-workbench-open');
        const openPanels = document.querySelectorAll('div[class*="nArs4W_panel"]:not([class*="panelHidden"]), div[class*="workbench_panel"]:not([class*="panelHidden"])');
        openPanels.forEach((p) => p.classList.add('nArs4W_panelHidden'));
      }
    });
  }

  // 1.1 移动端右侧边栏 / Workbench 面板管理：仅在移动端（<= 768px）挂载“返回对话”收起按钮，PC端保持纯净
  const ensurePanelCloseButton = () => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth > 768) {
      document.querySelectorAll('.dsh-mobile-panel-close-btn').forEach(btn => btn.remove());
      return;
    }
    const panels = document.querySelectorAll('div[class*="nArs4W_panel"]:not([class*="panelHidden"]), div[class*="workbench_panel"]:not([class*="panelHidden"])');
    panels.forEach((p) => {
      const bar = p.querySelector('div[class*="tabBar"], div[class*="nArs4W_tabBar"]');
      if (bar && !bar.querySelector('.dsh-mobile-panel-close-btn')) {
        const btn = document.createElement('button');
        btn.className = 'dsh-mobile-panel-close-btn';
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>返回对话</span>`;
        btn.onclick = (e) => {
          e.stopPropagation();
          document.body.classList.remove('dsh-workbench-open');
          p.classList.add('nArs4W_panelHidden');
          const collapseBtn = document.querySelector('button[class*="toggleButton"][aria-label*="收起"]');
          if (collapseBtn) collapseBtn.click();
        };
        bar.appendChild(btn);
      }
    });
  };

  const panelObserver = new MutationObserver(ensurePanelCloseButton);
  panelObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', ensurePanelCloseButton);

  // 移动端点击面板/工作区触发按钮时，自动激活 dsh-workbench-open
  document.addEventListener('click', (e) => {
    if (typeof window === 'undefined' || window.innerWidth > 768) return;
    const trigger = e.target.closest('button[aria-label*="面板"], button[aria-label*="工作区"], div[class*="toggleCluster"] button, button[class*="subagent"], div[class*="headerActions"] button, div[class*="titleRow"] button');
    if (trigger && !trigger.classList.contains('dsh-mobile-panel-close-btn') && !trigger.classList.contains('dsh-header-menu-btn') && !trigger.classList.contains('dsh-header-new-btn')) {
      document.body.classList.add('dsh-workbench-open');
    }
  }, true);

  // 移动端点击 DSH 自带的收起侧边栏图标时，自动收起抽屉
  document.addEventListener('click', (e) => {
    if (typeof window === 'undefined' || window.innerWidth > 768) return;
    const toggle = e.target.closest('button[aria-label*="收起侧边栏"], button[title*="收起侧边栏"]');
    if (toggle) {
      document.body.classList.remove('dsh-drawer-open');
    }
  }, true);

  // 2. 创建背景遮罩（用于抽屉侧边栏）
  let backdrop = document.querySelector('.dsh-mobile-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'dsh-mobile-backdrop';
    backdrop.addEventListener('click', () => {
      document.body.classList.remove('dsh-drawer-open');
    });
    document.body.appendChild(backdrop);
  }

  // 3. 点击遮罩收起抽屉，或点击抽屉内的会话项自动收起抽屉
  let lastLongPressTime = 0;

  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('dsh-drawer-open')) return;

    // 如果刚发生过长按（<= 600ms），拦截所有触发的后续 click
    if (Date.now() - lastLongPressTime < 600) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // 如果点击的是弹出层、菜单、下拉框、模态对话框内部，绝不收起抽屉
    if (e.target.closest('div[class*="portal"], div[class*="_portal"], div[role="menu"], div[role="dialog"], div[class*="popup"], div[class*="dropdown"], div[class*="overlay"]')) {
      return;
    }

    const sidebar = document.querySelector('div[class*="_sidebarCol"]');
    if (sidebar && sidebar.contains(e.target)) {
      // 如果点击的是搜索框、输入框、选择器等
      if (e.target.closest('input, select, textarea, div[class*="searchInput"]')) {
        return;
      }

      // 如果点击的是操作按钮、图标按钮（如三点菜单、添加工作区、视图选项、设置）
      const btn = e.target.closest('button, [role="button"]');
      if (btn) {
        const label = btn.getAttribute('aria-label') || btn.innerText || '';
        // 视图选项、添加工作区、操作菜单、设置、折叠切换等保留在抽屉内操作
        if (
          label.includes('操作') ||
          label.includes('视图') ||
          label.includes('添加') ||
          label.includes('搜索') ||
          label.includes('设置') ||
          btn.matches('button[class*="toggle"], button[class*="trigger"], button[class*="iconButton"], button[class*="searchButton"]')
        ) {
          return;
        }

        // 如果点击的是新建会话按钮，开始新会话并收起抽屉
        if (label.includes('新会话') || btn.matches('button[class*="newSession"]')) {
          document.body.classList.remove('dsh-drawer-open');
          return;
        }
      }

      // 点击会话项后平滑收起抽屉
      const sessionRow = e.target.closest('a, div[class*="sessionRow"], div[role="treeitem"]');
      if (sessionRow) {
        setTimeout(() => {
          if (document.body.classList.contains('dsh-drawer-open')) {
            document.body.classList.remove('dsh-drawer-open');
          }
        }, 80);
      }
    } else if (e.target.classList?.contains('dsh-mobile-backdrop')) {
      document.body.classList.remove('dsh-drawer-open');
    }
  }, true);

  // 4. 移动端抽屉长按（Long Press >= 380ms）呼出操作菜单，以及左右滑动手势
  let longPressTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;

  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    if (!document.body.classList.contains('dsh-drawer-open')) return;

    const sidebar = document.querySelector('div[class*="_sidebarCol"]');
    if (!sidebar || !sidebar.contains(e.target)) return;

    const sessionRow = e.target.closest('div[class*="sessionRow"], div[role="treeitem"]');
    if (!sessionRow) return;

    longPressTimer = setTimeout(() => {
      lastLongPressTime = Date.now();
      try {
        if (navigator.vibrate) navigator.vibrate(40);
      } catch (_) {}

      // 寻找该会话项内的三点操作按钮并触发点击
      const actionBtn = sessionRow.querySelector('button[aria-label*="操作"], button[class*="iconButton"], button');
      if (actionBtn) {
        actionBtn.click();
      }
    }, 380);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (longPressTimer && e.touches && e.touches.length > 0) {
      const moveX = Math.abs(e.touches[0].clientX - touchStartX);
      const moveY = Math.abs(e.touches[0].clientY - touchStartY);
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0 && touchStartX <= 35) {
        document.body.classList.add('dsh-drawer-open');
        const collapsedToggle = document.querySelector('div[class*="hHd-Xa_collapsed"] button[class*="hHd-Xa_toggle"]');
        if (collapsedToggle) collapsedToggle.click();
      } else if (deltaX < 0 && document.body.classList.contains('dsh-drawer-open')) {
        document.body.classList.remove('dsh-drawer-open');
      }
    }
  }, { passive: true });

  // 5. 拦截原生的「添加工作区 / 打开文件夹」操作，在远程与移动端无缝弹出网页版目录选择器（本机电脑保持原生对话框）
  document.addEventListener('click', (e) => {
    if (isLocalEnvironment()) return; // 本机电脑环境不拦截，使用系统原生文件夹对话框
    const btn = e.target.closest('button, [role="button"], a');
    if (!btn) return;
    if (btn.closest('#dsh-remote-workspace-modal')) return;

    const label = (
      btn.getAttribute('aria-label') ||
      btn.innerText ||
      btn.title ||
      ''
    ).trim();

    const isAddWorkspace = (
      label === '添加工作区' ||
      label === '新建工作区' ||
      label === '打开工作区' ||
      label === '打开文件夹' ||
      label === 'Add Workspace' ||
      label === 'Open Folder' ||
      label.includes('添加工作区') ||
      label.includes('打开工作区') ||
      label.includes('打开文件夹') ||
      btn.matches('button[aria-label*="工作区"][aria-label*="添加"], button[aria-label*="工作区"][aria-label*="打开"]')
    );

    if (isAddWorkspace) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (typeof window.__dshOpenRemoteWorkspaceModal === 'function') {
        window.__dshOpenRemoteWorkspaceModal();
      }
    }
  }, true);
}

// 辅助函数：HTML 转义
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- 全局网页端远程工作区目录选择弹窗 (树形层级浏览 + 面包屑导航 + 一键添加与切换) ----

function showRemoteWorkspaceDialog(rpcCall, onWorkspaceAdded, clientCtx, onPicked, onCancel) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const existing = document.getElementById('dsh-remote-workspace-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dsh-remote-workspace-modal';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100000;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--dsw-alias-label-primary, #111827);
  `;

  const modal = document.createElement('div');
  modal.className = 'dsh-ws-dialog-card';

  let currentPath = '';
  let parentPath = null;
  let breadcrumbs = [];
  let entries = [];
  let roots = [];
  let drives = [];
  let workspaces = [];
  let filterQuery = '';
  let showManualInput = false;
  let isLoading = false;
  let isSubmitting = false;
  let statusMessage = null;
  let isErrorMessage = false;

  function closeModal() {
    document.removeEventListener('keydown', handleKeydown);
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s ease';
    setTimeout(() => overlay.remove(), 150);
    if (typeof onCancel === 'function') {
      try {
        onCancel();
      } catch (e) {}
    }
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  function render() {
    const filteredEntries = (entries || []).filter(e => {
      if (!filterQuery.trim()) return true;
      return e.name.toLowerCase().includes(filterQuery.trim().toLowerCase());
    });

    modal.innerHTML = `
      <!-- 移动端顶部下拉指示条 -->
      <div class="dsh-ws-drag-handle" style="width: 36px; height: 4px; background: var(--dsw-alias-border-l2, #d1d5db); border-radius: 2px; margin: 8px auto 0 auto; display: none;"></div>

      <!-- 弹窗顶部标题栏 -->
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e7eb); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: var(--dsw-alias-bg-layer-2, #f9fafb);">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <span style="font-size: 20px; flex-shrink: 0;">🗂️</span>
          <div style="overflow: hidden;">
            <div style="font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary, #111827); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">选择电脑工作区</div>
            <div style="font-size: 11px; color: var(--dsw-alias-label-tertiary, #6b7280); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">点击进入文件夹，或点击「+ 选为工作区」直接添加并切换</div>
          </div>
        </div>
        <button id="dsh-ws-close-btn" style="border: none; background: none; font-size: 18px; cursor: pointer; color: var(--dsw-alias-label-tertiary, #9ca3af); padding: 4px 8px; border-radius: 6px; line-height: 1; flex-shrink: 0;">✕</button>
      </div>

      <div style="padding: 12px 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px;">
        <!-- 提示信息横幅 -->
        ${statusMessage ? `
          <div style="padding: 8px 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; font-weight: 500; display: flex; align-items: center; gap: 8px; ${isErrorMessage ? 'background: var(--dsw-alias-state-error-bg, #fef2f2); border: 1px solid var(--dsw-alias-state-error-border, #fecaca); color: var(--dsw-alias-state-error-primary, #dc2626);' : 'background: var(--dsw-alias-state-success-bg, #ecfdf5); border: 1px solid var(--dsw-alias-state-success-border, #a7f3d0); color: var(--dsw-alias-state-success-primary, #059669);'}">
            <span>${isErrorMessage ? '⚠️' : '🎉'}</span>
            <span>${escapeHtml(statusMessage)}</span>
          </div>
        ` : ''}

        <!-- 快速直达与磁盘横向滑动栏 (极简省空间) -->
        <div class="dsh-ws-chips-scroll">
          ${(drives || []).map(d => {
            const isActive = currentPath.startsWith(d.path) || currentPath === d.path;
            return `
              <button class="dsh-ws-quick-btn" data-path="${escapeHtml(d.path)}" style="border: 1px solid ${isActive ? 'var(--dsw-alias-brand-primary, #4f6ef7)' : 'var(--dsw-alias-border-l2, #d1d5db)'}; background: ${isActive ? 'var(--dsw-alias-brand-primary, #4f6ef7)' : 'var(--dsw-alias-bg-layer-2, #f9fafb)'}; color: ${isActive ? '#fff' : 'var(--dsw-alias-label-primary, #111827)'}; border-radius: 14px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 500; flex-shrink: 0; transition: all 0.1s;">
                💾 ${escapeHtml(d.name)}
              </button>
            `;
          }).join('')}
          <span style="color: var(--dsw-alias-border-l2, #d1d5db); margin: 0 1px; flex-shrink: 0;">|</span>
          ${(roots || []).map(r => {
            const isActive = currentPath === r.path;
            return `
              <button class="dsh-ws-quick-btn" data-path="${escapeHtml(r.path)}" style="border: 1px solid ${isActive ? 'var(--dsw-alias-brand-primary, #4f6ef7)' : 'var(--dsw-alias-border-l2, #d1d5db)'}; background: ${isActive ? 'var(--dsw-alias-state-info-bg, #eff6ff)' : 'var(--dsw-alias-bg-layer-2, #f9fafb)'}; color: ${isActive ? 'var(--dsw-alias-brand-primary, #4f6ef7)' : 'var(--dsw-alias-label-secondary, #374151)'}; border-radius: 14px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 500; flex-shrink: 0;">
                ${escapeHtml(r.name)}
              </button>
            `;
          }).join('')}
        </div>

        <!-- 交互式面包屑路径导航条 (Breadcrumbs Bar) -->
        <div style="background: var(--dsw-alias-bg-layer-3, #f3f4f6); border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); border-radius: 10px; padding: 6px 10px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <div class="dsh-ws-chips-scroll" style="flex: 1;">
            <span style="font-size: 12px; margin-right: 2px; flex-shrink: 0;">📂</span>
            ${(breadcrumbs || []).map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return `
                <button class="dsh-ws-crumb-btn" data-path="${escapeHtml(crumb.path)}" style="border: none; background: ${isLast ? 'var(--dsw-alias-bg-layer-1, #fff)' : 'transparent'}; color: ${isLast ? 'var(--dsw-alias-brand-primary, #4f6ef7)' : 'var(--dsw-alias-label-secondary, #4b5563)'}; font-family: ui-monospace, Menlo, monospace; font-size: 11px; font-weight: ${isLast ? '700' : '500'}; padding: 3px 6px; border-radius: 4px; cursor: pointer; text-decoration: ${isLast ? 'none' : 'underline'}; text-underline-offset: 2px; flex-shrink: 0; box-shadow: ${isLast ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};">
                  ${escapeHtml(crumb.name)}
                </button>
                ${!isLast ? `<span style="color: var(--dsw-alias-label-tertiary, #9ca3af); font-size: 11px; font-weight: 600; flex-shrink: 0;">/</span>` : ''}
              `;
            }).join('')}
          </div>

          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            ${parentPath ? `
              <button id="dsh-ws-up-btn" data-path="${escapeHtml(parentPath)}" title="返回上一级" style="border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 2px;">
                ⬆️ 上级
              </button>
            ` : ''}
            <button id="dsh-ws-refresh-btn" title="刷新目录" style="border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827); padding: 3px 6px; border-radius: 6px; font-size: 11px; cursor: pointer;">
              🔄
            </button>
          </div>
        </div>

        <!-- 当前所在目录确认卡片 (Primary Action Card) -->
        <div style="background: var(--dsw-alias-state-info-bg, #eff6ff); border: 1px solid var(--dsw-alias-state-info-border, #bfdbfe); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <span style="font-size: 11px; font-weight: 600; color: var(--dsw-alias-brand-primary, #2563eb); flex-shrink: 0;">当前目录:</span>
            <span style="font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--dsw-alias-label-primary, #1e3a8a); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: right; font-weight: 600;">${escapeHtml(currentPath)}</span>
          </div>
          <button id="dsh-ws-add-current-btn" style="border: none; background: var(--dsw-alias-brand-primary, #2563eb); color: #fff; height: 36px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; box-shadow: 0 2px 4px rgba(37,99,235,0.25); transition: opacity 0.1s;" ${isSubmitting ? 'disabled' : ''}>
            ${isSubmitting ? '正在添加并切换…' : '👉 设为当前工作区并进入'}
          </button>
        </div>

        <!-- 子目录列表与过滤栏 -->
        <div style="border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff);">
          <!-- 实时过滤搜索框 -->
          <div style="padding: 7px 10px; background: var(--dsw-alias-bg-layer-2, #f9fafb); border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e7eb); display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
              <span style="font-size: 11px; color: var(--dsw-alias-label-tertiary, #9ca3af);">🔍</span>
              <input id="dsh-ws-filter-input" type="text" value="${escapeHtml(filterQuery)}" placeholder="过滤子文件夹…" style="border: none; background: transparent; font-size: 12px; width: 100%; color: var(--dsw-alias-label-primary, #111827); outline: none;" />
            </div>
            <span style="font-size: 10px; color: var(--dsw-alias-label-tertiary, #6b7280); flex-shrink: 0;">
              ${filteredEntries.length} 个文件夹
            </span>
          </div>

          <!-- 子文件夹滚动列表 (移动端舒适大点按区域) -->
          <div style="max-height: 240px; min-height: 120px; overflow-y: auto; padding: 2px 0;">
            ${isLoading ? `
              <div style="padding: 32px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); display: flex; flex-direction: column; align-items: center; gap: 6px;">
                <span style="font-size: 20px;">⏳</span>
                <span>正在读取目录内容…</span>
              </div>
            ` : filteredEntries.length === 0 ? `
              <div style="padding: 26px 16px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <span style="font-size: 22px;">📁</span>
                <span>${filterQuery ? '未找到匹配的子文件夹' : '当前文件夹下没有更多子文件夹'}</span>
                <span style="font-size: 11px; color: var(--dsw-alias-label-tertiary, #9ca3af);">（直接点击上方蓝色按钮即可进入当前目录）</span>
              </div>
            ` : filteredEntries.map(e => `
              <div class="dsh-ws-entry-row" data-path="${escapeHtml(e.path)}" style="display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2, #f3f4f6); cursor: pointer; font-size: 12px; transition: background 0.1s; min-height: 40px;">
                <div class="dsh-ws-drill-btn" data-path="${escapeHtml(e.path)}" style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; padding: 2px 0;">
                  <span style="font-size: 16px; flex-shrink: 0;">📁</span>
                  <span style="font-family: ui-monospace, Menlo, monospace; font-weight: 500; color: var(--dsw-alias-label-primary, #111827); overflow: hidden; text-overflow: ellipsis;">${escapeHtml(e.name)}</span>
                  <span style="color: var(--dsw-alias-label-tertiary, #9ca3af); font-size: 12px; margin-left: 2px; flex-shrink: 0;">›</span>
                </div>
                <button class="dsh-ws-pick-entry-btn" data-path="${escapeHtml(e.path)}" title="直接添加此子文件夹为工作区并进入" style="border: 1px solid var(--dsw-alias-state-success-border, #a7f3d0); background: var(--dsw-alias-state-success-bg, #ecfdf5); color: var(--dsw-alias-state-success-primary, #059669); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; margin-left: 8px; white-space: nowrap; transition: all 0.1s;">
                  + 选为工作区
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 手动输入路径折叠区 -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <button id="dsh-ws-toggle-manual" style="border: none; background: none; color: var(--dsw-alias-label-tertiary, #6b7280); font-size: 11px; cursor: pointer; padding: 2px 0; text-decoration: underline;">
              ${showManualInput ? '▼ 收起绝对路径手动输入' : '▶ 手动粘贴/输入绝对路径'}
            </button>
          </div>
          ${showManualInput ? `
            <div style="margin-top: 6px; display: flex; gap: 6px;">
              <input id="dsh-ws-manual-input" type="text" value="${escapeHtml(currentPath)}" placeholder="输入电脑绝对路径，例如 C:\\Projects\\my-app" style="flex: 1; font-family: ui-monospace, Menlo, monospace; font-size: 11px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827); outline: none;" />
              <button id="dsh-ws-manual-jump-btn" style="border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-2, #f9fafb); color: var(--dsw-alias-label-primary, #111827); padding: 0 10px; border-radius: 8px; font-size: 11px; cursor: pointer; white-space: nowrap;">
                前往
              </button>
              <button id="dsh-ws-manual-add-btn" style="border: none; background: var(--dsw-alias-brand-primary, #4f6ef7); color: #fff; padding: 0 12px; border-radius: 8px; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap;">
                添加并进入
              </button>
            </div>
          ` : ''}
        </div>

        <!-- 已在 DSH 注册的工作区展示 (支持一键切换) -->
        ${(workspaces && workspaces.length > 0) ? `
          <div style="padding-top: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-tertiary, #6b7280); margin-bottom: 4px;">已注册工作区 (${workspaces.length} 个，点击直接切换)：</div>
            <div style="display: flex; flex-direction: column; gap: 4px; max-height: 80px; overflow-y: auto;">
              ${workspaces.map((w, i) => `
                <div class="dsh-ws-registered-row" data-ws-id="${escapeHtml(w.id || '')}" data-ws-path="${escapeHtml(w.path)}" style="display: flex; align-items: center; justify-content: space-between; background: var(--dsw-alias-bg-layer-2, #f9fafb); border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer; transition: background 0.1s;">
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                    <span style="font-weight: 600; color: var(--dsw-alias-brand-primary, #4f6ef7);">@${i + 1} ${escapeHtml(w.title || '')}</span>
                    <span style="color: var(--dsw-alias-label-tertiary, #6b7280); margin-left: 6px; font-family: ui-monospace, Menlo, monospace; font-size: 10px;">${escapeHtml(w.path)}</span>
                  </div>
                  <button class="dsh-ws-switch-btn" data-ws-id="${escapeHtml(w.id || '')}" data-ws-path="${escapeHtml(w.path)}" style="border: 1px solid var(--dsw-alias-brand-primary, #4f6ef7); background: var(--dsw-alias-state-info-bg, #eff6ff); color: var(--dsw-alias-brand-primary, #4f6ef7); padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; flex-shrink: 0; margin-left: 6px; white-space: nowrap;">
                    进入 ➔
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- 弹窗底部操作条 -->
      <div style="padding: 8px 16px; border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb); display: flex; align-items: center; justify-content: space-between; background: var(--dsw-alias-bg-layer-2, #f9fafb); flex-shrink: 0;">
        <span style="font-size: 10px; color: var(--dsw-alias-label-tertiary, #6b7280);">
          💡 点击文件夹可逐级进入
        </span>
        <button id="dsh-ws-cancel-btn" style="border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827); padding: 5px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 500;">关闭</button>
      </div>
    `;

    // 绑定事件处理器
    modal.querySelector('#dsh-ws-close-btn')?.addEventListener('click', closeModal);
    modal.querySelector('#dsh-ws-cancel-btn')?.addEventListener('click', closeModal);

    // 面包屑点击
    modal.querySelectorAll('.dsh-ws-crumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-path');
        if (p) loadDirectory(p);
      });
    });

    // 快捷盘符与常用目录点击
    modal.querySelectorAll('.dsh-ws-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-path');
        if (p) loadDirectory(p);
      });
    });

    // 返回上一级与刷新
    modal.querySelector('#dsh-ws-up-btn')?.addEventListener('click', (e) => {
      const p = e.currentTarget.getAttribute('data-path');
      if (p) loadDirectory(p);
    });
    modal.querySelector('#dsh-ws-refresh-btn')?.addEventListener('click', () => {
      loadDirectory(currentPath);
    });

    // 添加当前目录为工作区
    modal.querySelector('#dsh-ws-add-current-btn')?.addEventListener('click', () => {
      doSubmit(currentPath);
    });

    // 过滤输入框
    const filterInput = modal.querySelector('#dsh-ws-filter-input');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        filterQuery = e.target.value;
        render();
        const nextInput = modal.querySelector('#dsh-ws-filter-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.selectionStart = nextInput.selectionEnd = nextInput.value.length;
        }
      });
    }

    // 深入文件夹
    modal.querySelectorAll('.dsh-ws-drill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.getAttribute('data-path');
        if (p) loadDirectory(p);
      });
    });

    // 列表项点击（整行进入文件夹）
    modal.querySelectorAll('.dsh-ws-entry-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.dsh-ws-pick-entry-btn')) return;
        const p = row.getAttribute('data-path');
        if (p) loadDirectory(p);
      });
    });

    // 快捷选为工作区按钮
    modal.querySelectorAll('.dsh-ws-pick-entry-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.getAttribute('data-path');
        if (p) doSubmit(p);
      });
    });

    // 已注册工作区切换按钮与整行点击
    modal.querySelectorAll('.dsh-ws-registered-row, .dsh-ws-switch-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const wsId = el.getAttribute('data-ws-id');
        const wsPath = el.getAttribute('data-ws-path');
        if (wsId || wsPath) {
          switchToWorkspace(wsId, wsPath);
        }
      });
    });

    // 手动输入折叠切换
    modal.querySelector('#dsh-ws-toggle-manual')?.addEventListener('click', () => {
      showManualInput = !showManualInput;
      render();
    });

    // 手动前往与添加
    const manualInput = modal.querySelector('#dsh-ws-manual-input');
    modal.querySelector('#dsh-ws-manual-jump-btn')?.addEventListener('click', () => {
      if (manualInput && manualInput.value.trim()) {
        loadDirectory(manualInput.value.trim());
      }
    });
    modal.querySelector('#dsh-ws-manual-add-btn')?.addEventListener('click', () => {
      if (manualInput && manualInput.value.trim()) {
        doSubmit(manualInput.value.trim());
      }
    });
    if (manualInput) {
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          doSubmit(manualInput.value.trim());
        }
      });
    }
  }

  async function authRpc(endpoint, payload = {}) {
    let token = getGlobalAdminToken();
    if (!token && isLocalEnvironment()) {
      try {
        const res = await fetch('/__dsh_bridge__/loopback-token', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data?.adminToken) {
            token = data.adminToken;
            setGlobalAdminToken(token);
          }
        }
      } catch {}
    }
    return rpcCall(endpoint, {
      ...payload,
      ...(token ? { adminToken: token } : {}),
      ...(isLocalEnvironment() ? { isLocalhost: true } : {}),
    });
  }

  async function switchToWorkspace(wsId, wsPath) {
    if (isSubmitting) return;
    isSubmitting = true;
    statusMessage = `正在切换工作区…`;
    isErrorMessage = false;
    render();

    if (typeof onPicked === 'function' && wsPath) {
      try {
        onPicked(wsPath);
      } catch (e) {}
    }

    let switched = false;
    if (clientCtx?.workspaces?.startSession && wsId) {
      try {
        clientCtx.workspaces.startSession(wsId);
        switched = true;
      } catch (e) {
        console.warn('[dsh-bridge] startSession failed:', e);
      }
    }

    if (!switched && wsPath) {
      try {
        if (clientCtx?.workspaces?.create) {
          const ws = await clientCtx.workspaces.create({ path: wsPath });
          if (ws?.workspaceId && clientCtx?.workspaces?.startSession) {
            clientCtx.workspaces.startSession(ws.workspaceId);
            switched = true;
          }
        }
        if (!switched) {
          const raw = await authRpc(BRIDGE_ENDPOINTS.addRemoteWorkspace, { path: wsPath });
          const res = raw?.value || raw;
          if (res?.workspaceId && clientCtx?.workspaces?.startSession) {
            try {
              clientCtx.workspaces.startSession(res.workspaceId);
              switched = true;
            } catch (e) {}
          }
          if (!switched && res?.sessionId && clientCtx?.sessions?.open) {
            try {
              clientCtx.sessions.open(res.sessionId);
              switched = true;
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    statusMessage = `✓ 已切换至工作区！`;
    render();
    setTimeout(() => {
      closeModal();
      document.body.classList.remove('dsh-drawer-open');
    }, 400);
  }

  async function loadDirectory(targetPath) {
    if (isSubmitting) return;
    if (!rpcCall) return;
    isLoading = true;
    filterQuery = '';
    statusMessage = null;
    isErrorMessage = false;
    render();

    try {
      const raw = await authRpc(BRIDGE_ENDPOINTS.listRemoteDirectories, { path: targetPath });
      const res = raw?.value || raw;
      if (res) {
        currentPath = res.currentPath || targetPath || '';
        parentPath = res.parentPath || null;
        breadcrumbs = res.breadcrumbs || [];
        entries = res.entries || [];
        roots = res.roots || [];
        drives = res.drives || [];
        workspaces = res.workspaces || [];
        if (res.error) {
          statusMessage = res.error;
          isErrorMessage = true;
        }
      }
    } catch (err) {
      statusMessage = err.message || '读取目录失败';
      isErrorMessage = true;
    } finally {
      isLoading = false;
      render();
    }
  }

  async function doSubmit(pathToRegister) {
    if (isSubmitting) return;
    const p = (pathToRegister || currentPath || '').trim();
    if (!p) {
      statusMessage = '请输入或选择工作区路径';
      isErrorMessage = true;
      render();
      return;
    }
    if (!rpcCall) return;

    isSubmitting = true;
    statusMessage = null;
    isErrorMessage = false;
    render();

    try {
      // 1. 先通过 clientCtx.workspaces.create 注册本地客户端快照
      let clientWs = null;
      if (clientCtx?.workspaces?.create) {
        try {
          clientWs = await clientCtx.workspaces.create({ path: p });
        } catch (e) {
          console.warn('[dsh-bridge] clientCtx.workspaces.create failed:', e);
        }
      }

      // 2. 调用服务端 RPC 进行持久化与 session 绑定
      const raw = await authRpc(BRIDGE_ENDPOINTS.addRemoteWorkspace, { path: p });
      const res = raw?.value || raw;
      if (res && res.ok) {
        statusMessage = `✓ 工作区「${res.title || p}」已选定，正在切换…`;
        isErrorMessage = false;
        workspaces = res.workspaces || [];
        render();

        const targetWorkspaceId = clientWs?.workspaceId || res.workspaceId;

        // 如果是通过 Hero / DirectoryFlow 流程打开的，通知 Flow
        if (typeof onPicked === 'function') {
          try {
            onPicked(p);
          } catch (e) {}
        }

        // 切换至新工作区并创建会话
        let switched = false;
        if (clientCtx?.workspaces?.startSession && targetWorkspaceId) {
          try {
            clientCtx.workspaces.startSession(targetWorkspaceId);
            switched = true;
          } catch (e) {
            console.warn('[dsh-bridge] startSession failed:', e);
          }
        }
        
        if (!switched && clientCtx?.sessions?.open && res.sessionId) {
          try {
            clientCtx.sessions.open(res.sessionId);
            switched = true;
          } catch (e) {
            console.warn('[dsh-bridge] sessions.open failed:', e);
          }
        }

        if (typeof onWorkspaceAdded === 'function') {
          onWorkspaceAdded(res);
        }

        setTimeout(() => {
          closeModal();
          document.body.classList.remove('dsh-drawer-open');
        }, 500);
      } else {
        statusMessage = res?.error || raw?.error || '添加工作区失败';
        isErrorMessage = true;
        render();
      }
    } catch (err) {
      statusMessage = err.message || '添加工作区异常';
      isErrorMessage = true;
      render();
    } finally {
      isSubmitting = false;
    }
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 初次加载目录
  loadDirectory('');
}

// ---- DSH 原生 Slot 目录选择器适配组件 ----

function RemoteDirectoryFlow(props) {
  const { open, pick } = props;
  const outcome = React.useRef(props);
  outcome.current = props;
  const armed = React.useRef(false);

  const openRemoteModal = () => {
    if (typeof window.__dshOpenRemoteWorkspaceModal === 'function') {
      window.__dshOpenRemoteWorkspaceModal(
        (res) => {
          if (res?.path && outcome.current?.onPicked) {
            outcome.current.onPicked(res.path);
          }
        },
        (chosenPath) => {
          if (chosenPath && outcome.current?.onPicked) {
            outcome.current.onPicked(chosenPath);
          }
        },
        () => {
          if (outcome.current?.onCancel) {
            outcome.current.onCancel();
          }
        }
      );
    } else if (outcome.current?.onCancel) {
      outcome.current.onCancel();
    }
  };

  React.useEffect(() => {
    if (!open) {
      armed.current = false;
      return;
    }
    if (armed.current) return;
    armed.current = true;

    // 1. 本机电脑或 Electron 环境：尝试唤起原生文件夹选择对话框
    const isNativeHost = typeof window !== 'undefined' && (window.electron || window.__DSH_NATIVE_HOST__);
    if (isNativeHost || isLocalEnvironment()) {
      const pickFn = typeof pick === 'function' ? pick : (typeof window.__dshClientCtx?.workspaces?.pickDirectory === 'function' ? () => window.__dshClientCtx.workspaces.pickDirectory() : null);
      if (pickFn) {
        try {
          const promise = pickFn();
          if (promise && typeof promise.then === 'function') {
            promise.then((chosenPath) => {
              if (chosenPath === null) {
                if (outcome.current?.onCancel) outcome.current.onCancel();
              } else if (chosenPath) {
                if (outcome.current?.onPicked) outcome.current.onPicked(chosenPath);
              }
            }).catch(() => {
              // 原生选择器在纯网页模式下报 needs the native capability，平滑降级至远程目录树选择器
              openRemoteModal();
            });
            return;
          }
        } catch {
          openRemoteModal();
          return;
        }
      }
    }

    // 2. 远程或移动端访问（手机或局域网跨设备/公网）：呼出网页版远程目录树形选择器！
    openRemoteModal();
  }, [open, pick]);

  return null;
}

// ---- 插件入口 ----

function apply(ctx) {
  window.__dshClientCtx = ctx;
  const rpcCall = (endpoint, payload, signal) =>
    ctx.connection.rpc.call(BRIDGE_RPC_CHANNEL, endpoint, payload, signal);

  window.__dshOpenRemoteWorkspaceModal = (onAdded, onPickDirect, onCancel) =>
    showRemoteWorkspaceDialog(rpcCall, onAdded, ctx, onPickDirect, onCancel);

  setupMobileExperience(rpcCall, ctx);

  const injected = () => ({ pick: () => ctx.workspaces?.pickDirectory?.() });

  // 注册至 DSH 原生目录选择 Slot（设置 priority: -10 覆盖原生 Electron 选择器，在远程/移动网页端生效）
  ctx.slots.inject('conversation.hero.workspace.directoryFlow', () =>
    ctx.slots.inject('sidebar.workspaces.directoryFlow', function* () {
      yield ctx.slots.register(
        {
          name: 'conversation.hero.workspace.directoryFlow',
          priority: -10,
          inject: injected,
        },
        RemoteDirectoryFlow,
      );
      yield ctx.slots.register(
        {
          name: 'sidebar.workspaces.directoryFlow',
          priority: -10,
          inject: injected,
        },
        RemoteDirectoryFlow,
      );
    }),
  );

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-bridge',
        order: 10,
        label: () => '远程访问',
        inject: () => ({ rpcCall }),
      },
      BridgePanel,
    ),
  );
}

export { name, inject, apply };

