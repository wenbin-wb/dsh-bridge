// dsh-bridge 客户端插件：设置页「远程访问」面板

import { BRIDGE_RPC_CHANNEL, BRIDGE_ENDPOINTS } from '../lib/bridge-rpc.js';

const GITHUB_URL = 'https://github.com/wenbin-wb/dsh-bridge';
const ISSUES_URL = 'https://github.com/wenbin-wb/dsh-bridge/issues/new';

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
  card:     { background: 'var(--dsw-alias-bg-layer-1,#fff)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 },
  block:    { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 12, paddingTop: 12 },
  muted:    { color: 'var(--dsw-alias-label-tertiary,#8b93a1)', fontSize: 12, lineHeight: 1.5 },
  label:    { color: 'var(--dsw-alias-label-primary,inherit)', fontSize: 13, fontWeight: 500 },
  code:     { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary,inherit)' },
  btnPri:   { font: 'inherit', cursor: 'pointer', border: 'none', background: 'var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f6ef7))', color: '#fff', height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnGhost: { font: 'inherit', cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'var(--dsw-alias-label-primary,inherit)', height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnLink:  { font: 'inherit', cursor: 'pointer', border: 'none', background: 'none', color: 'var(--dsw-alias-brand-primary,#4f6ef7)', fontSize: 12, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' },
  qr:       { width: 200, height: 200, borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', margin: '8px 0', display: 'block' },
  tag:      { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 500 },
  input:    { width: '100%', font: 'inherit', fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'var(--dsw-alias-label-primary,inherit)', outline: 'none', boxSizing: 'border-box' },
  warn:     { background: 'var(--dsw-alias-state-warn-bg,#fffbeb)', border: '1px solid var(--dsw-alias-state-warn-border,#fde68a)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--dsw-alias-state-warn-primary,#92400e)', lineHeight: 1.6 },
  tip:      { background: 'var(--dsw-alias-bg-layer-2,#f9fafb)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.6 },
};

// ---- 子组件 ----

function StatusTag({ running }) {
  return React.createElement('span', {
    style: {
      ...s.tag,
      background: running ? 'var(--dsw-alias-state-success-bg,#ecfdf5)' : 'var(--dsw-alias-bg-layer-2,#f3f4f6)',
      color: running ? 'var(--dsw-alias-state-success-primary,#059669)' : 'var(--dsw-alias-label-secondary,#6b7280)',
    },
  }, running ? '运行中' : '未启动');
}

function QrBlock({ url, qr, onReset }) {
  const [copied, setCopied] = React.useState(false);
  const [showQr, setShowQr] = React.useState(true);

  const copy = React.useCallback(() => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
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
  const [open, setOpen] = React.useState(false);
  const toggle = React.useCallback(() => setOpen(v => !v), []);
  return React.createElement('div', { style: s.block },
    React.createElement('button', {
      style: { ...s.btnGhost, fontSize: 12, height: 28, marginBottom: open ? 10 : 0 },
      onClick: toggle,
    }, open ? '▲ 收起搭建教程' : '▶ 如何搭建自建隧道服务器？'),
    open && React.createElement('div', { style: s.tip },
      React.createElement('div', { style: { fontWeight: 500, marginBottom: 6, color: 'var(--dsw-alias-label-primary,inherit)' } }, '搭建步骤'),
      React.createElement('ol', { style: { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 } },
        React.createElement('li', null, '在公网服务器上安装 Node.js 18+'),
        React.createElement('li', null, '部署隧道服务端，推荐使用 frp 或兼容 WebSocket 的反向代理'),
        React.createElement('li', null, '记录服务器的公网域名（如 tunnel.example.com）和访问令牌'),
        React.createElement('li', null, '在下方填写 WebSocket 地址（wss://...）和令牌，保存后点开启'),
      ),
      React.createElement('div', { style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)' } },
        React.createElement('div', { style: { fontWeight: 500, marginBottom: 4, color: 'var(--dsw-alias-label-primary,inherit)' } }, '地址格式'),
        React.createElement('code', { style: { ...s.code, display: 'block', padding: '6px 8px', background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', borderRadius: 6 } },
          'wss://tunnel.example.com/connect'
        ),
      ),
    ),
  );
});

const CustomTunnelConfigForm = React.memo(function CustomTunnelConfigForm({ serverUrl: initUrl, accessToken: initToken, onSave }) {
  const [serverUrl, setServerUrl]     = React.useState(initUrl ?? '');
  const [accessToken, setAccessToken] = React.useState(initToken ?? '');
  const [saving, setSaving]           = React.useState(false);

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
    try { await onSave(serverUrl, accessToken); }
    finally { setSaving(false); }
  }, [onSave, serverUrl, accessToken]);
  const handleUrlChange   = React.useCallback((e) => setServerUrl(e.target.value), []);
  const handleTokenChange = React.useCallback((e) => setAccessToken(e.target.value), []);

  return React.createElement('div', { style: s.block },
    React.createElement('div', { style: { ...s.muted, marginBottom: 8 } }, '服务器配置'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      React.createElement('input', {
        style: s.input,
        placeholder: 'WebSocket 地址，例如 wss://tunnel.example.com/connect',
        value: serverUrl,
        onChange: handleUrlChange,
        disabled: saving,
      }),
      React.createElement('input', {
        style: s.input,
        type: 'password',
        placeholder: '访问令牌（Access Token）',
        value: accessToken,
        onChange: handleTokenChange,
        disabled: saving,
      }),
      React.createElement('button', {
        style: { ...s.btnPri, alignSelf: 'flex-start', opacity: (!dirty || saving) ? 0.5 : 1 },
        disabled: !dirty || saving,
        onClick: handleSave,
      }, saving ? '保存中…' : '保存配置'),
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

// 版本检查 + GitHub/反馈入口
function VersionBanner({ rpcCall }) {
  const [info, setInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

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

  // 只有 npm 上的版本严格大于当前版本才算有新版本
  const hasUpdate = info?.latest && info?.current && !info.error && semverGt(info.latest, info.current);

  // 链接按钮组：GitHub + 反馈 Bug
  const links = React.createElement('div', { style: { display: 'flex', gap: 12, alignItems: 'center' } },
    React.createElement('a', {
      href: GITHUB_URL, target: '_blank', rel: 'noreferrer', style: s.btnLink,
    }, '⭐ GitHub'),
    React.createElement('a', {
      href: ISSUES_URL, target: '_blank', rel: 'noreferrer', style: s.btnLink,
    }, '🐛 反馈 Bug'),
  );

  // 有新版本：彩色横幅
  if (hasUpdate) {
    return React.createElement('div', { style: { marginBottom: 16 } },
      React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, var(--dsw-alias-brand-primary,#4f6ef7) 0%, #6366f1 100%)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 8, color: '#fff',
        },
      },
        React.createElement('span', { style: { fontSize: 20 } }, '🎉'),
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: { fontSize: 13, fontWeight: 600 } },
            `发现新版本 v${info.latest}（当前 v${info.current}）`
          ),
          React.createElement('code', {
            style: { fontSize: 11, opacity: 0.85, fontFamily: 'ui-monospace,Menlo,monospace', wordBreak: 'break-all' },
          }, 'dsh plugin --profile web update @wenbin-wb/dsh-bridge --latest'),
        ),
        React.createElement('button', {
          style: {
            font: 'inherit', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.4)',
            background: 'rgba(255,255,255,0.15)', color: '#fff', height: 30, padding: '0 12px',
            borderRadius: 999, fontSize: 12, display: 'inline-flex', alignItems: 'center',
            opacity: loading ? 0.5 : 1, flexShrink: 0,
          },
          onClick: check, disabled: loading,
        }, loading ? '…' : '刷新'),
      ),
      links,
    );
  }

  // 正常状态：版本信息一行 + 链接
  return React.createElement('div', { style: { marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
    React.createElement('div', { style: { ...s.muted, display: 'flex', alignItems: 'center', gap: 8 } },
      loading && !info
        ? React.createElement('span', null, '检查更新中…')
        : info
          ? React.createElement('span', null, `v${info.current}${info.latest && !info.error ? ' · 已是最新' : info.error ? ' · 检查失败' : ''}`)
          : null,
      info && React.createElement('button', {
        style: { ...s.btnGhost, height: 22, padding: '0 8px', fontSize: 11, opacity: loading ? 0.5 : 1 },
        onClick: check, disabled: loading,
      }, loading ? '…' : '重新检查'),
    ),
    links,
  );
}

// ---- 主面板 ----

function BridgePanel({ rpcCall }) {
  const [status, setStatus] = React.useState(null);
  const [err, setErr]       = React.useState(null);

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

  return React.createElement('div', { style: { maxWidth: 560 } },
    err && React.createElement('div', {
      style: { ...s.card, background: 'var(--dsw-alias-state-error-bg,#fef2f2)', color: 'var(--dsw-alias-state-error-primary,#dc2626)', fontSize: 13, marginBottom: 16 },
    }, err),

    React.createElement(VersionBanner, { rpcCall }),

    React.createElement(TunnelCard, {
      title: '局域网访问',
      desc: '同一 Wi-Fi 下的设备可直接扫码访问',
      data: { running: status?.proxy?.running, url: status?.lan?.url, qr: status?.lan?.qr },
    }),

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
