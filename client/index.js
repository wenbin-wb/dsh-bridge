// dsh-bridge 客户端插件：设置页「远程访问」面板

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

function QrBlock({ url, qr, onReset }) {
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
    React.createElement('div', { style: s.warn },
      '⚠️ 请勿将此链接或二维码分享给他人，任何人扫码后都可直接访问您的 DSH。'
    ),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 } },
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
  const handleSave = React.useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onSave(serverUrl, accessToken);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
    finally { setSaving(false); }
  }, [onSave, serverUrl, accessToken]);
  const handleUrlChange   = React.useCallback((e) => { setServerUrl(e.target.value); setSaveSuccess(false); }, []);
  const handleTokenChange = React.useCallback((e) => { setAccessToken(e.target.value); setSaveSuccess(false); }, []);

  return React.createElement('div', { style: s.block },
    React.createElement('div', { style: { ...s.muted, marginBottom: 8 } }, '服务器配置'),
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
        placeholder: '访问令牌（Access Token）',
        value: accessToken,
        onChange: handleTokenChange,
        onKeyDown: (e) => { if (e.key === 'Enter' && dirty && !saving) handleSave(); },
        disabled: saving,
      }),
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

const TunnelCard = React.memo(function TunnelCard({ title, desc, data, onStart, onStop, onReset, children }) {
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
    url && React.createElement(QrBlock, { url, qr, onReset }),
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
        maxMessageChars:    String(platform.config.maxMessageChars    ?? 2000),
        sendChunkDelayMs:   String(platform.config.sendChunkDelayMs   ?? 1500),
        appId: platform.config.appId ?? '',
        // Secret 不由后端回传；空值表示沿用已保存密钥
        clientSecret: '',
      });
    }
  }, [platform?.config]);

  // 向上传递连接状态（供平台列表卡片绿点使用）
  React.useEffect(() => {
    const connected = platform?.status === 'connected' || platform?.status === 'starting' || platform?.status === 'reconnecting';
    onStatusChange?.(connected);
  }, [platform?.status, onStatusChange]);

  const load = React.useCallback(async (quiet = false) => {
    try {
      // 用通用端点读取平台状态（不执行登录操作，只获取状态）
      const r = await rpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
      if (!r?.ok) throw new Error(r?.error?.message ?? 'RPC failed');
      const allPlatforms = r.value ?? {};
      setPlatform(allPlatforms[platformId] ?? null);
      if (!quiet) setErr(null);
    } catch (e) {
      if (!quiet) setErr(e.message);
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
    await act(BRIDGE_ENDPOINTS.platformSetAllowFrom, { allowFrom: list });
    setNewId('');
  }, [act, newId, platform?.allowFrom]);
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
      maxMessageChars: '2000',
      sendChunkDelayMs: '1500',
    }));
  }, []);

  // 高级设置保存
  const saveConfig = React.useCallback(async () => {
    if (!cfgDraft) return;
    const payload = {
      digestIntervalSec:  Number(cfgDraft.digestIntervalSec),
      approvalTimeoutSec: Number(cfgDraft.approvalTimeoutSec),
      maxMessageChars:    Number(cfgDraft.maxMessageChars),
      sendChunkDelayMs:   Number(cfgDraft.sendChunkDelayMs),
    };
    // QQ 平台额外携带凭证
    if (platformId === 'qq') {
      payload.appId = cfgDraft.appId.trim();
      payload.clientSecret = cfgDraft.clientSecret.trim();
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
    ))
  );

  if (!platform && !err) {
    return React.createElement('div', { style: s.card },
      React.createElement('div', { style: s.label }, platformName),
      React.createElement('div', { style: { ...s.muted, marginTop: 6 } }, '加载中…'),
    );
  }

  const connected = platform?.status === 'connected' || platform?.status === 'starting';
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
          React.createElement('button', { style: s.btnPri, onClick: onLogin, disabled: busy }, '重新登录'),
        (platform.status === 'connected' || platform.status === 'starting') &&
          React.createElement('button', { style: s.btnGhost, onClick: onStop, disabled: busy }, '断开'),
        React.createElement('button', {
          style: { ...s.btnGhost, color: 'var(--dsw-alias-state-error-primary,#dc2626)', borderColor: 'var(--dsw-alias-state-error-primary,#dc2626)', opacity: busy ? 0.5 : 1 },
          disabled: busy,
          onClick: () => { if (window.confirm('确认解绑？这将清除登录凭证，下次需重新登录。')) act(BRIDGE_ENDPOINTS.platformUnbind, {}); },
          title: '清除登录凭证，下次需重新登录',
        }, '解绑账号'),
      ),
    ),

    // 未配置 / 登录中：二维码（QQ 无二维码，显示凭证表单）
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
        : platformId === 'qq'
          ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 } },
              React.createElement('div', null,
                React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, 'AppID — QQ 开放平台机器人应用 ID'),
                React.createElement('input', {
                  style: { ...s.input, width: '100%' },
                  placeholder: '请输入 AppID',
                  value: cfgDraft?.appId ?? '',
                  onChange: (e) => setCfgDraft(d => ({ ...d, appId: e.target.value })),
                  onKeyDown: (e) => { if (e.key === 'Enter' && cfgDraft?.appId?.trim() && cfgDraft?.clientSecret?.trim() && !busy) saveConfig(); },
                }),
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, 'ClientSecret — QQ 开放平台机器人密钥'),
                React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                  React.createElement('input', {
                    style: { ...s.input, flex: 1 },
                    type: showSecret ? 'text' : 'password',
                    placeholder: '请输入 ClientSecret',
                    value: cfgDraft?.clientSecret ?? '',
                    onChange: (e) => setCfgDraft(d => ({ ...d, clientSecret: e.target.value })),
                    onKeyDown: (e) => { if (e.key === 'Enter' && cfgDraft?.appId?.trim() && cfgDraft?.clientSecret?.trim() && !busy) saveConfig(); },
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
                React.createElement('a', {
                  href: 'https://bot.q.qq.com/wiki/develop/api-v2/',
                  target: '_blank', rel: 'noopener noreferrer',
                  style: s.btnLink,
                }, '📖 前往 QQ 开放平台申请机器人'),
              ),
              React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                React.createElement('button', {
                  style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
                  onClick: saveConfig, disabled: busy || !cfgDraft?.appId?.trim() || !cfgDraft?.clientSecret?.trim(),
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

    // 高级设置（紧凑 2x2 网格 + 恢复默认值）
    cfgDraft && React.createElement('div', { style: s.block },
      React.createElement('button', {
        style: { ...s.btnLink, fontSize: 12, marginBottom: showAdvanced ? 10 : 0 },
        onClick: () => setShowAdvanced(v => !v),
      }, showAdvanced ? '▾ 高级设置' : '▸ 高级设置'),
      showAdvanced && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        // 2x2 参数网格
        React.createElement('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 10,
          },
        },
          // 心跳间隔
          React.createElement('div', null,
            React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '心跳进度间隔 (秒)'),
            React.createElement('input', {
              style: { ...s.input, width: '100%' },
              type: 'number', min: 30, max: 3600,
              value: cfgDraft.digestIntervalSec,
              onChange: (e) => setCfgDraft(d => ({ ...d, digestIntervalSec: e.target.value })),
            }),
          ),
          // 审批超时
          React.createElement('div', null,
            React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '审批超时自动拒绝 (秒)'),
            React.createElement('input', {
              style: { ...s.input, width: '100%' },
              type: 'number', min: 30, max: 86400,
              value: cfgDraft.approvalTimeoutSec,
              onChange: (e) => setCfgDraft(d => ({ ...d, approvalTimeoutSec: e.target.value })),
            }),
          ),
          // 每气泡字数
          React.createElement('div', null,
            React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '单条最大字数限制 (字)'),
            React.createElement('input', {
              style: { ...s.input, width: '100%' },
              type: 'number', min: 100, max: 10000,
              value: cfgDraft.maxMessageChars,
              onChange: (e) => setCfgDraft(d => ({ ...d, maxMessageChars: e.target.value })),
            }),
          ),
          // 分块延迟
          React.createElement('div', null,
            React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '分块发送延迟 (毫秒)'),
            React.createElement('input', {
              style: { ...s.input, width: '100%' },
              type: 'number', min: 0, max: 10000,
              value: cfgDraft.sendChunkDelayMs,
              onChange: (e) => setCfgDraft(d => ({ ...d, sendChunkDelayMs: e.target.value })),
            }),
          ),
        ),
        // QQ 平台凭证
        platformId === 'qq' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 } },
          React.createElement('div', null,
            React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, 'AppID — QQ 开放平台机器人应用 ID'),
            React.createElement('input', {
              style: { ...s.input, width: '100%' },
              placeholder: '请输入 AppID',
              value: cfgDraft.appId,
              onChange: (e) => setCfgDraft(d => ({ ...d, appId: e.target.value })),
            }),
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, 'ClientSecret — QQ 开放平台机器人密钥（留空则保持已保存密钥）'),
            React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
              React.createElement('input', {
                style: { ...s.input, flex: 1 },
                type: showSecret ? 'text' : 'password',
                placeholder: '留空保持已保存密钥',
                value: cfgDraft.clientSecret,
                onChange: (e) => setCfgDraft(d => ({ ...d, clientSecret: e.target.value })),
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
        React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 } },
          React.createElement('button', {
            style: { ...s.btnPri, opacity: (cfgDirty && !busy) ? 1 : 0.5 },
            disabled: !cfgDirty || busy,
            onClick: saveConfig,
          }, busy ? '保存中…' : '保存设置'),
          React.createElement('button', {
            style: { ...s.btnGhost, height: 32, fontSize: 12 },
            onClick: resetDefaults,
            title: '恢复推荐默认配置',
          }, '↺ 恢复推荐默认'),
        ),
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
  { id: 'lan',    label: '局域网',   icon: Icons.lan },
  { id: 'tunnel', label: '公网隧道', icon: Icons.tunnel },
  { id: 'im',     label: 'IM 机器人', icon: Icons.bot },
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

  const load = React.useCallback(async (quiet = false) => {
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.getStatus, {});
      if (!r?.ok) throw new Error(r?.error?.message ?? 'RPC failed');
      setStatus(r.value);
      if (!quiet) setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [rpcCall]);

  // 独立轮询所有平台状态（Tab 未选中时也能更新）
  React.useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await rpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
        if (alive && r?.ok) {
          setPlatforms(r.value ?? {});
        }
      } catch { /* 忽略，不影响主面板 */ }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [rpcCall]);

  React.useEffect(() => {
    load();
    const t = setInterval(() => load(true), 3000);
    return () => clearInterval(t);
  }, [load]);

  const act = React.useCallback(async (endpoint, payload) => {
    try {
      const r = await rpcCall(endpoint, payload ?? {});
      if (!r?.ok) throw new Error(r?.error?.message ?? 'RPC failed');
      setStatus(r.value);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [rpcCall]);

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
    lan:    !!(status?.proxy?.running),
    tunnel: !!(status?.cloudflared?.running || ct?.running),
    im:     !!imConnected,
  };

  // Tab 内容
  let tabContent;
  if (activeTab === 'lan') {
    tabContent = React.createElement(TunnelCard, {
      title: '局域网访问',
      desc: '同一 Wi-Fi 下的设备可直接扫码访问',
      data: { running: status?.proxy?.running, url: status?.lan?.url, qr: status?.lan?.qr },
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
  } else if (activeTab === 'im') {
    // 从 listPlatforms 动态生成平台列表
    const IM_PLATFORMS = [
      { id: 'wechat',   label: '微信',     icon: Icons.wechat,   brandColor: '#07C160', desc: 'ClawBot 扫码直连 · 无需公网' },
      { id: 'qq',       label: 'QQ',       icon: Icons.qq,       brandColor: '#12B7F5', desc: '官方机器人 · 私聊/群聊/按钮' },
      { id: 'feishu',   label: '飞书',     icon: Icons.feishu,   brandColor: '#00D6B9', desc: '官方事件回调 API' },
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
      // 显示选中的平台卡片
      selectedPlatform && platforms?.[selectedPlatform] && React.createElement(PlatformCard, {
        platformId: selectedPlatform,
        platformName: IM_PLATFORMS.find(p => p.id === selectedPlatform)?.label ?? selectedPlatform,
        platformDesc: IM_PLATFORMS.find(p => p.id === selectedPlatform)?.desc ?? '',
        rpcCall,
        onStatusChange: () => {}, // 状态变化已由 listPlatforms 轮询处理，不需要回调
      }),
    );
  }

  return React.createElement('div', { style: { maxWidth: 620 } },
    err && React.createElement('div', {
      style: { ...s.card, background: 'var(--dsw-alias-state-error-bg,#fef2f2)', color: 'var(--dsw-alias-state-error-primary,#dc2626)', fontSize: 13, marginBottom: 16 },
    }, err),

    React.createElement(VersionBanner, { rpcCall }),

    React.createElement(TabBar, { active: activeTab, onChange: setActiveTab, dots }),

    tabContent,
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
