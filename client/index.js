// dsh-bridge 客户端插件：设置页「远程访问」面板

import { BRIDGE_RPC_CHANNEL, BRIDGE_ENDPOINTS } from '../lib/bridge-rpc-constants.js';

const GITHUB_URL = 'https://github.com/wenbin-wb/dsh-bridge';
const RELEASES_URL = 'https://github.com/wenbin-wb/dsh-bridge/releases';
const ISSUES_URL = 'https://github.com/wenbin-wb/dsh-bridge/issues/new';
const TUNNEL_DOCS_URL = 'https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/custom-tunnel.md';

// 升级命令：用 add @latest 强制安装最新版（update --latest 受已安装依赖版本约束可能无法升级到最新版）
const UPGRADE_COMMAND = 'dsh plugin --profile web add @wenbin_wb/dsh-bridge@latest';

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
  card:     { background: 'var(--dsw-alias-bg-layer-1,transparent)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 },
  block:    { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 12, paddingTop: 12 },
  muted:    { color: 'var(--dsw-alias-label-tertiary,#8b93a1)', fontSize: 12, lineHeight: 1.5 },
  label:    { color: 'var(--dsw-alias-label-primary,currentColor)', fontSize: 13, fontWeight: 500 },
  code:     { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary,currentColor)' },
  btnPri:   { font: 'inherit', cursor: 'pointer', border: 'none', background: 'var(--dsw-alias-brand-primary,#4f6ef7)', color: 'var(--dsw-alias-label-primary-foreground,#fff)', height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnGhost: { font: 'inherit', cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-1,transparent)', color: 'var(--dsw-alias-label-primary,currentColor)', height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' },
  btnLink:  { font: 'inherit', cursor: 'pointer', border: 'none', background: 'none', color: 'var(--dsw-alias-brand-primary,#4f6ef7)', fontSize: 12, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' },
  qr:       { width: 200, height: 200, borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', margin: '8px 0', display: 'block' },
  tag:      { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 500 },
  input:    { width: '100%', font: 'inherit', fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-1,transparent)', color: 'var(--dsw-alias-label-primary,currentColor)', outline: 'none', boxSizing: 'border-box' },
  warn:     { background: 'var(--dsw-alias-state-warn-bg,#fffbeb)', border: '1px solid var(--dsw-alias-state-warn-border,#fde68a)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--dsw-alias-state-warn-primary,#92400e)', lineHeight: 1.6 },
  tip:      { background: 'var(--dsw-alias-bg-layer-2,#f9fafb)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.6 },
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

  // 高级设置保存
  const saveConfig = React.useCallback(async () => {
    if (!cfgDraft) return;
    await act(BRIDGE_ENDPOINTS.platformSetConfig, {
      digestIntervalSec:  Number(cfgDraft.digestIntervalSec),
      approvalTimeoutSec: Number(cfgDraft.approvalTimeoutSec),
      maxMessageChars:    Number(cfgDraft.maxMessageChars),
      sendChunkDelayMs:   Number(cfgDraft.sendChunkDelayMs),
    });
  }, [act, cfgDraft]);
  const cfgDirty = cfgDraft && platform?.config && (
    Number(cfgDraft.digestIntervalSec)  !== platform.config.digestIntervalSec  ||
    Number(cfgDraft.approvalTimeoutSec) !== platform.config.approvalTimeoutSec ||
    Number(cfgDraft.maxMessageChars)    !== platform.config.maxMessageChars    ||
    Number(cfgDraft.sendChunkDelayMs)   !== platform.config.sendChunkDelayMs
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
        React.createElement('div', { style: s.label }, platformName),
        React.createElement('div', { style: { ...s.muted, marginTop: 2 } }, platformDesc),
      ),
      React.createElement(StatusTag, { running: connected }),
    ),

    // 快捷入口：使用说明 / 命令
    React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' } },
      platformId === 'wechat' && React.createElement('a', {
        href: 'https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/wechat-usage.md',
        target: '_blank', rel: 'noopener noreferrer',
        style: s.btnGhost,
      }, '📖 使用说明'),
      React.createElement('button', {
        style: s.btnGhost,
        onClick: () => setShowHelp(v => !v),
      }, showHelp ? '收起命令' : '命令列表'),
    ),

    // 命令速查
    showHelp && React.createElement('div', { style: { ...s.block, fontSize: 12, lineHeight: 1.8, fontFamily: 'monospace' } },
      React.createElement('div', null, '/new <提示词> — 新建会话（当前工作区）'),
      React.createElement('div', null, '/new <提示词> @N — 在指定工作区新建'),
      React.createElement('div', null, '/sessions — 按工作区分组列会话'),
      React.createElement('div', null, '/use N — 切换到会话 N'),
      React.createElement('div', null, '/workspaces — 列出工作区'),
      React.createElement('div', null, '/stop — 停止任务'),
      React.createElement('div', null, '/status — 查看状态'),
      React.createElement('div', null, '/yes 或 /no — 回应审批'),
      React.createElement('div', null, '/help — 全部命令'),
    ),

    err && React.createElement('div', { style: { ...s.warn, marginTop: 10 } }, err),

    // 已配置：状态详情 + 白名单
    platform?.configured && React.createElement('div', { style: s.block },
      React.createElement('div', { style: { fontSize: 12, lineHeight: 1.7 } },
        React.createElement('div', null, `状态: ${statusLabel}`),
        platform.accountId && React.createElement('div', null, `账号: ${platform.accountId}`),
        platform.sessionId && React.createElement('div', null, `当前会话: ${platform.sessionId}`),
      ),
      React.createElement('div', { style: { ...s.muted, fontSize: 12, marginTop: 8, lineHeight: 1.6 } },
        '白名单（仅这些用户可驱动 agent）:'
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
          placeholder: platformId === 'wechat' ? '添加允许的微信 ID（如 xxx@im.wechat）' : '添加允许的用户 ID',
          value: newId,
          onChange: handleNewId,
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

    // 未配置 / 登录中：二维码
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
        : React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' } },
            React.createElement('button', {
              style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
              onClick: onLogin, disabled: busy,
            }, busy ? '处理中…' : '扫码登录'),
            login.phase === 'error' && React.createElement('div', { style: { ...s.muted, fontSize: 12 } }, login.error ?? '登录失败'),
          ),
    ),

    // 高级设置（可折叠）
    cfgDraft && React.createElement('div', { style: s.block },
      React.createElement('button', {
        style: { ...s.btnLink, fontSize: 12, marginBottom: showAdvanced ? 10 : 0 },
        onClick: () => setShowAdvanced(v => !v),
      }, showAdvanced ? '▾ 高级设置' : '▸ 高级设置'),
      showAdvanced && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        // 心跳间隔
        React.createElement('div', null,
          React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '心跳间隔（秒）— 长任务处理中每隔多久发一次进度提示'),
          React.createElement('input', {
            style: { ...s.input, width: 120 },
            type: 'number', min: 30, max: 3600,
            value: cfgDraft.digestIntervalSec,
            onChange: (e) => setCfgDraft(d => ({ ...d, digestIntervalSec: e.target.value })),
          }),
        ),
        // 审批超时
        React.createElement('div', null,
          React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '审批超时（秒）— 工具调用审批无响应后自动拒绝'),
          React.createElement('input', {
            style: { ...s.input, width: 120 },
            type: 'number', min: 30, max: 86400,
            value: cfgDraft.approvalTimeoutSec,
            onChange: (e) => setCfgDraft(d => ({ ...d, approvalTimeoutSec: e.target.value })),
          }),
        ),
        // 每气泡字数
        React.createElement('div', null,
          React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '每条消息最大字数 — 超出时自动分多条发送'),
          React.createElement('input', {
            style: { ...s.input, width: 120 },
            type: 'number', min: 100, max: 10000,
            value: cfgDraft.maxMessageChars,
            onChange: (e) => setCfgDraft(d => ({ ...d, maxMessageChars: e.target.value })),
          }),
        ),
        // 分块延迟
        React.createElement('div', null,
          React.createElement('div', { style: { ...s.muted, marginBottom: 4 } }, '分块发送延迟（毫秒）— 多条消息之间的间隔'),
          React.createElement('input', {
            style: { ...s.input, width: 120 },
            type: 'number', min: 0, max: 10000,
            value: cfgDraft.sendChunkDelayMs,
            onChange: (e) => setCfgDraft(d => ({ ...d, sendChunkDelayMs: e.target.value })),
          }),
        ),
        React.createElement('button', {
          style: { ...s.btnPri, alignSelf: 'flex-start', opacity: (cfgDirty && !busy) ? 1 : 0.5 },
          disabled: !cfgDirty || busy,
          onClick: saveConfig,
        }, busy ? '保存中…' : '保存设置'),
      ),
    ),

    React.createElement('div', { style: s.block },
      React.createElement('div', { style: { ...s.tip, fontSize: 12 } },
        platformId === 'wechat'
          ? '说明: 扫码成功后，向该微信 Bot 发送第一条消息即自动完成白名单授权。仅白名单内的微信用户能驱动 agent，其他人消息会被忽略。使用专用微信号，避免影响主号。'
          : '说明: 登录成功后，发送第一条消息即自动完成白名单授权。仅白名单内的用户能驱动 agent，其他人消息会被忽略。'
      ),
    ),
  );
}

// 版本检查 + GitHub/反馈入口
function VersionBanner({ rpcCall }) {
  const [info, setInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [copied, copy] = useCopy();

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

  // 链接按钮组：GitHub + 更新日志 + 反馈 Bug
  const links = React.createElement('div', { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
    React.createElement('a', {
      href: GITHUB_URL, target: '_blank', rel: 'noreferrer', style: s.btnLink,
    }, '⭐ GitHub'),
    React.createElement('a', {
      href: RELEASES_URL, target: '_blank', rel: 'noreferrer', style: s.btnLink,
    }, '📋 更新日志'),
    React.createElement('a', {
      href: ISSUES_URL, target: '_blank', rel: 'noreferrer', style: s.btnLink,
    }, '🐛 反馈 Bug'),
  );

  // 有新版本：信息卡片
  if (hasUpdate) {
    return React.createElement('div', { style: { marginBottom: 16 } },
      React.createElement('div', {
        style: {
          ...s.card,
          background: 'var(--dsw-alias-state-info-bg,#eff6ff)',
          border: '1px solid var(--dsw-alias-state-info-border,#bfdbfe)',
          padding: '12px 16px',
          marginBottom: 8,
        },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          React.createElement('span', { style: { fontSize: 20 } }, '🎉'),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', {
              style: {
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--dsw-alias-state-info-primary,#1e40af)',
                marginBottom: 6,
              },
            }, `发现新版本 v${info.latest}（当前 v${info.current}）`),
            React.createElement('div', {
              style: { display: 'flex', alignItems: 'center', gap: 8 },
            },
              React.createElement('code', {
                style: {
                  ...s.code,
                  fontSize: 11,
                  color: 'var(--dsw-alias-label-secondary,#6b7280)',
                  flex: 1,
                  minWidth: 0,
                  wordBreak: 'break-all',
                },
              }, UPGRADE_COMMAND),
              React.createElement('button', {
                style: { ...s.btnGhost, height: 26, padding: '0 10px', fontSize: 12, flexShrink: 0 },
                onClick: () => copy(UPGRADE_COMMAND),
                title: '复制升级命令',
              }, copied ? '✓ 已复制' : '复制'),
            ),
          ),
          React.createElement('button', {
            style: {
              ...s.btnGhost,
              height: 30,
              padding: '0 12px',
              fontSize: 12,
              opacity: loading ? 0.5 : 1,
              flexShrink: 0,
            },
            onClick: check,
            disabled: loading,
          }, loading ? '…' : '刷新'),
        ),
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

// ---- Tab Bar ----

const TABS = [
  { id: 'lan',    label: '局域网' },
  { id: 'tunnel', label: '公网隧道' },
  { id: 'im',     label: 'IM 机器人' },
];

function TabBar({ active, onChange, dots }) {
  return React.createElement('div', {
    style: {
      display: 'flex', gap: 0, marginBottom: 20,
      borderBottom: '1px solid var(--dsw-alias-border-l2,#e5e7eb)',
    },
  },
    TABS.map(({ id, label }) => {
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
          display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'color .15s, border-color .15s',
          whiteSpace: 'nowrap',
        },
      },
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
      { id: 'wechat', label: '微信', desc: 'iLink Bot API（ClawBot）' },
      { id: 'qq',     label: 'QQ',   desc: 'NapCat / Mirai' },
      { id: 'feishu', label: '飞书', desc: '官方事件回调 API' },
    ];
    
    tabContent = React.createElement('div', null,
      // 平台选择器（可点击切换）
      React.createElement('div', {
        style: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
      },
        IM_PLATFORMS.map(({ id, label, desc }) => {
          const platformData = platforms?.[id];
          const available = !!platformData;
          const active = platformData?.status === 'connected' || platformData?.status === 'starting' || platformData?.status === 'reconnecting';
          
          return React.createElement('div', {
            key: id,
            style: {
              flex: '1 1 140px',
              border: `1px solid ${selectedPlatform === id ? 'var(--dsw-alias-state-info-primary,#3b82f6)' : active ? 'var(--dsw-alias-state-success-primary,#10b981)' : 'var(--dsw-alias-border-l2,#e5e7eb)'}`,
              borderRadius: 10,
              padding: '12px 14px',
              opacity: available ? 1 : 0.45,
              cursor: available ? 'pointer' : 'not-allowed',
              background: selectedPlatform === id ? 'var(--dsw-alias-state-info-bg,#eff6ff)' : active ? 'var(--dsw-alias-state-success-bg,#ecfdf5)' : available ? 'var(--dsw-alias-bg-layer-1,transparent)' : 'var(--dsw-alias-bg-layer-2,#f9fafb)',
              transition: 'all 0.15s ease',
            },
            onClick: available ? () => setSelectedPlatform(id) : undefined,
          },
            React.createElement('div', { style: { ...s.label, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } },
              label,
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
            React.createElement('div', { style: { ...s.muted, marginTop: 3, fontSize: 11 } }, desc),
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

  return React.createElement('div', { style: { maxWidth: 560 } },
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
