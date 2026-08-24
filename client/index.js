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
const inject = ['slots', 'connection'];

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
  card:     { background: 'var(--dsw-alias-bg-layer-2,#f9fafb)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 },
  block:    { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 12, paddingTop: 12 },
  muted:    { color: 'var(--dsw-alias-label-tertiary,#8b93a1)', fontSize: 12, lineHeight: 1.5 },
  label:    { color: 'var(--dsw-alias-label-primary,currentColor)', fontSize: 13, fontWeight: 500 },
  code:     { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary,currentColor)' },
  btnPri:   { font: 'inherit', cursor: 'pointer', border: 'none', background: 'var(--dsw-alias-brand-primary,#4f6ef7)', color: 'var(--dsw-alias-label-primary-foreground,#fff)', height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnGhost: { font: 'inherit', cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-2,#f9fafb)', color: 'var(--dsw-alias-label-primary,currentColor)', height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' },
  btnLink:  { font: 'inherit', cursor: 'pointer', border: 'none', background: 'none', color: 'var(--dsw-alias-brand-primary,#4f6ef7)', fontSize: 12, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' },
  qr:       { width: 200, height: 200, borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', margin: '8px 0', display: 'block', background: '#ffffff', padding: 6, boxSizing: 'border-box' },
  tag:      { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 500 },
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
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
            background: 'var(--dsw-alias-state-success-bg,#ecfdf5)',
            border: '1px solid var(--dsw-alias-state-success-primary,#10b981)',
            borderRadius: 8, fontSize: 12, color: 'var(--dsw-alias-state-success-primary,#059669)',
            marginBottom: 8, fontWeight: 500,
            cursor: onNavigateSecurity ? 'pointer' : 'default',
          },
          onClick: onNavigateSecurity,
          title: onNavigateSecurity ? '点击前往「安全认证」配置' : undefined,
        },
          '🛡️ 访问安全认证已生效 · 扫码设备自动完成免密授权',
          onNavigateSecurity && React.createElement('span', { style: { textDecoration: 'underline', fontSize: 11, marginLeft: 4 } }, '设置 ➔')
        )
      : React.createElement('div', {
          style: { ...s.warn, cursor: onNavigateSecurity ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
          onClick: onNavigateSecurity,
          title: onNavigateSecurity ? '点击前往「安全认证」开启访问保护' : undefined,
        },
          React.createElement('span', null, '⚠️ 当前未开启访问认证，建议在「安全认证」开启密码或扫码保护。'),
          onNavigateSecurity && React.createElement('span', { style: { fontWeight: 600, textDecoration: 'underline', fontSize: 12, color: 'var(--dsw-alias-brand-primary,#4f6ef7)' } }, '去开启 ➔')
        ),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 } },
      React.createElement('code', { style: { ...s.code, flex: 1 } }, url),
      React.createElement('button', {
        style: { ...s.btnGhost, height: 26, padding: '0 10px', fontSize: 12, flexShrink: 0 },
        onClick: copy,
      }, copied ? '✓ 已复制' : '复制'),
      React.createElement('button', {
        style: { ...s.btnGhost, height: 26, padding: '0 10px', fontSize: 12, flexShrink: 0 },
        onClick: toggleQr,
      }, showQr ? '隐藏二维码' : '显示二维码'),
    ),
    showQr && qr && React.createElement('div', { style: { marginTop: 8 } },
      React.createElement('img', { src: qr, alt: 'QR', style: s.qr }),
      React.createElement('div', { style: { ...s.muted, marginTop: 4 } }, '请在私密环境下使用'),
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

const TunnelCard = React.memo(function TunnelCard({ title, desc, data, onStart, onStop, onReset, auth, onNavigateSecurity, children }) {
  const { running, configured, url, qr, state } = data ?? {};
  const phase = state?.phase ?? 'idle';

  return React.createElement('div', { style: s.card },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      React.createElement('div', null,
        React.createElement('div', { style: s.label }, title),
        React.createElement('div', { style: { ...s.muted, marginTop: 2 } }, desc),
      ),
      React.createElement(StatusTag, { running }),
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
        maxMessageChars:    String(platform.config.maxMessageChars    ?? (platformId === 'telegram' ? 4096 : 2000)),
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
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      React.createElement('div', null,
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

// 单条升级命令行：命令文本 + 复制按钮
function UpgradeCommandRow({ cmd }) {
  const [copied, copy] = useCopy();
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
    React.createElement('code', {
      style: {
        ...s.code,
        fontSize: 11,
        color: 'var(--dsw-alias-label-secondary,#6b7280)',
        flex: 1,
        minWidth: 0,
        wordBreak: 'break-all',
        background: 'var(--dsw-alias-bg-layer-1,#ffffff)',
        padding: '4px 8px',
        borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
      },
    }, cmd),
    React.createElement('button', {
      style: { ...s.btnGhost, height: 26, padding: '0 10px', fontSize: 12, flexShrink: 0 },
      onClick: () => copy(cmd),
      title: '复制升级命令',
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
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.upgradePlugin, { version: info.latest });
      if (r?.ok && r.value?.ok) {
        setUpgradeResult({ ok: true, message: `已成功升级到 v${info.latest}！请重启 DSH 服务使新版本生效。` });
        setTimeout(() => check(), 3000);
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
  }, [info?.latest, upgrading, rpcCall, check]);

  const links = React.createElement('div', { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
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
          disabled: loading || upgrading,
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
                opacity: upgrading ? 0.6 : 1,
              },
              onClick: handleUpgrade,
              disabled: upgrading || upgradeResult?.ok,
            },
              upgrading
                ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
                    React.createElement('span', { style: { animation: 'spin 1s linear infinite', display: 'inline-flex' } }, React.createElement(Icons.refresh)),
                    '正在自动升级…',
                  )
                : upgradeResult?.ok
                  ? '✓ 已完成升级'
                  : `一键升级到 v${info.latest}`
            ),
          ),

          upgradeResult && React.createElement('div', {
            style: {
              background: upgradeResult.ok ? 'var(--dsw-alias-state-success-bg,#ecfdf5)' : 'var(--dsw-alias-state-error-bg,#fef2f2)',
              border: `1px solid ${upgradeResult.ok ? 'var(--dsw-alias-state-success-border,#a7f3d0)' : 'var(--dsw-alias-state-error-border,#fecaca)'}`,
              color: upgradeResult.ok ? 'var(--dsw-alias-state-success-primary,#065f46)' : 'var(--dsw-alias-state-error-primary,#991b1b)',
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
];

function TabBar({ active, onChange, dots }) {
  return React.createElement('div', {
    style: {
      display: 'flex', gap: 4, marginBottom: 20,
      borderBottom: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
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
          padding: '8px 16px', fontSize: 13, fontWeight: isActive ? 600 : 400,
          color: isActive
            ? 'var(--dsw-alias-brand-primary,#4f6ef7)'
            : 'var(--dsw-alias-label-secondary,#6b7280)',
          borderBottom: isActive
            ? '2px solid var(--dsw-alias-brand-primary,#4f6ef7)'
            : '2px solid transparent',
          marginBottom: -1,
          display: 'inline-flex', alignItems: 'center', gap: 7,
          transition: 'color .15s, border-color .15s',
          whiteSpace: 'nowrap',
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
    let token = adminToken;
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
        setAdminToken(res.value?.adminToken || '');
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
  const onStartCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCustomTunnel), [act]);
  const onStopCustom  = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCustomTunnel), [act]);
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
    });
  } else if (activeTab === 'tunnel') {
    tabContent = React.createElement(React.Fragment, null,
      React.createElement(TunnelCard, {
        title: 'Cloudflare 隧道',
        desc: '一键获取公网地址（重启后 URL 会变化）',
        data: {
          running: status?.cloudflared?.running,
          url: status?.cloudflared?.url,
          qr: status?.cloudflared?.qr,
          state: status?.cloudflared?.state,
        },
        auth: status?.auth,
        onNavigateSecurity: navSecurity,
        onStart: onStartCloudflared,
        onStop:  onStopCloudflared,
        onReset: status?.cloudflared?.running ? onResetCloudflared : null,
      }),
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

// ---- 插件入口 ----

function apply(ctx) {
  const rpcCall = (endpoint, payload, signal) =>
    ctx.connection.rpc.call(BRIDGE_RPC_CHANNEL, endpoint, payload, signal);

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
