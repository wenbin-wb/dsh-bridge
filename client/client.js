window.__ModuleLoader__.load({
  id: "@wenbin_wb/dsh-bridge",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// lib/bridge-rpc-constants.js
var BRIDGE_RPC_CHANNEL = "/dsh-bridge";
var BRIDGE_ENDPOINTS = {
  getStatus: "getStatus",
  startCustomTunnel: "startCustomTunnel",
  stopCustomTunnel: "stopCustomTunnel",
  startCloudflared: "startCloudflared",
  stopCloudflared: "stopCloudflared",
  resetCloudflared: "resetCloudflared",
  saveCustomTunnelConfig: "saveCustomTunnelConfig",
  checkVersion: "checkVersion",
  wechatGetStatus: "wechatGetStatus",
  wechatLogin: "wechatLogin",
  wechatSetAllowFrom: "wechatSetAllowFrom",
  wechatSetConfig: "wechatSetConfig",
  wechatStop: "wechatStop",
  wechatStart: "wechatStart",
  wechatUnbind: "wechatUnbind"
};

// client/index.js
var GITHUB_URL = "https://github.com/wenbin-wb/dsh-bridge";
var ISSUES_URL = "https://github.com/wenbin-wb/dsh-bridge/issues/new";
var TUNNEL_DOCS_URL = "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/custom-tunnel.md";
var name = "dsh-bridge";
var inject = ["slots", "connection"];
function semverGt(a, b) {
  const parse = (v) => {
    const [main = "", pre = ""] = String(v).split("-");
    const [maj = 0, min = 0, pat = 0] = main.split(".").map(Number);
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
var s = {
  card: { background: "var(--dsw-alias-bg-layer-1,transparent)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 },
  block: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 12, paddingTop: 12 },
  muted: { color: "var(--dsw-alias-label-tertiary,#8b93a1)", fontSize: 12, lineHeight: 1.5 },
  label: { color: "var(--dsw-alias-label-primary,currentColor)", fontSize: 13, fontWeight: 500 },
  code: { fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, wordBreak: "break-all", color: "var(--dsw-alias-label-primary,currentColor)" },
  btnPri: { font: "inherit", cursor: "pointer", border: "none", background: "var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f6ef7))", color: "#fff", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 },
  btnGhost: { font: "inherit", cursor: "pointer", border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-1,transparent)", color: "var(--dsw-alias-label-primary,currentColor)", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" },
  btnLink: { font: "inherit", cursor: "pointer", border: "none", background: "none", color: "var(--dsw-alias-brand-primary,#4f6ef7)", fontSize: 12, padding: 0, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" },
  qr: { width: 200, height: 200, borderRadius: 10, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", margin: "8px 0", display: "block" },
  tag: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 500 },
  input: { width: "100%", font: "inherit", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-1,transparent)", color: "var(--dsw-alias-label-primary,currentColor)", outline: "none", boxSizing: "border-box" },
  warn: { background: "var(--dsw-alias-state-warn-bg,#fffbeb)", border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-state-warn-primary,#92400e)", lineHeight: 1.6 },
  tip: { background: "var(--dsw-alias-bg-layer-2,#f9fafb)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.6 }
};
function StatusTag({ running }) {
  return React.createElement("span", {
    style: {
      ...s.tag,
      background: running ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-bg-layer-2,#f3f4f6)",
      color: running ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-label-secondary,#6b7280)"
    }
  }, running ? "\u8FD0\u884C\u4E2D" : "\u672A\u542F\u52A8");
}
function QrBlock({ url, qr, onReset }) {
  const [copied, setCopied] = React.useState(false);
  const [showQr, setShowQr] = React.useState(true);
  const copy = React.useCallback(() => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    }).catch(() => {
    });
  }, [url]);
  const toggleQr = React.useCallback(() => setShowQr((v) => !v), []);
  return React.createElement(
    "div",
    { style: { marginTop: 10 } },
    React.createElement(
      "div",
      { style: s.warn },
      "\u26A0\uFE0F \u8BF7\u52FF\u5C06\u6B64\u94FE\u63A5\u6216\u4E8C\u7EF4\u7801\u5206\u4EAB\u7ED9\u4ED6\u4EBA\uFF0C\u4EFB\u4F55\u4EBA\u626B\u7801\u540E\u90FD\u53EF\u76F4\u63A5\u8BBF\u95EE\u60A8\u7684 DSH\u3002"
    ),
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 10 } },
      React.createElement("code", { style: { ...s.code, flex: 1 } }, url),
      React.createElement("button", {
        style: { ...s.btnGhost, height: 26, padding: "0 10px", fontSize: 12, flexShrink: 0 },
        onClick: copy
      }, copied ? "\u2713 \u5DF2\u590D\u5236" : "\u590D\u5236"),
      React.createElement("button", {
        style: { ...s.btnGhost, height: 26, padding: "0 10px", fontSize: 12, flexShrink: 0 },
        onClick: toggleQr
      }, showQr ? "\u9690\u85CF\u4E8C\u7EF4\u7801" : "\u663E\u793A\u4E8C\u7EF4\u7801")
    ),
    showQr && qr && React.createElement(
      "div",
      { style: { marginTop: 8 } },
      React.createElement("img", { src: qr, alt: "QR", style: s.qr }),
      React.createElement("div", { style: { ...s.muted, marginTop: 4 } }, "\u8BF7\u5728\u79C1\u5BC6\u73AF\u5883\u4E0B\u4F7F\u7528")
    ),
    onReset && React.createElement(
      "div",
      { style: { marginTop: 8 } },
      React.createElement("button", {
        style: { ...s.btnGhost, fontSize: 12, height: 28 },
        onClick: onReset,
        title: "\u5173\u95ED\u96A7\u9053\u5E76\u91CD\u65B0\u5F00\u542F\uFF0C\u53EF\u83B7\u5F97\u65B0\u7684 URL"
      }, "\u{1F504} \u91CD\u7F6E\u94FE\u63A5")
    )
  );
}
var CustomTunnelGuide = React.memo(function CustomTunnelGuide2() {
  return React.createElement(
    "div",
    { style: s.block },
    React.createElement("a", {
      href: TUNNEL_DOCS_URL,
      target: "_blank",
      rel: "noreferrer",
      style: { ...s.btnGhost, fontSize: 12, height: 28, display: "inline-flex" }
    }, "\u67E5\u770B\u81EA\u5EFA\u96A7\u9053\u670D\u52A1\u5668\u642D\u5EFA\u6559\u7A0B")
  );
});
var CustomTunnelConfigForm = React.memo(function CustomTunnelConfigForm2({ serverUrl: initUrl, accessToken: initToken, onSave }) {
  const [serverUrl, setServerUrl] = React.useState(initUrl ?? "");
  const [accessToken, setAccessToken] = React.useState(initToken ?? "");
  const [saving, setSaving] = React.useState(false);
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (!syncedRef.current && (initUrl || initToken)) {
      setServerUrl(initUrl ?? "");
      setAccessToken(initToken ?? "");
      syncedRef.current = true;
    }
  }, [initUrl, initToken]);
  const dirty = serverUrl !== (initUrl ?? "") || accessToken !== (initToken ?? "");
  const handleSave = React.useCallback(async () => {
    setSaving(true);
    try {
      await onSave(serverUrl, accessToken);
    } finally {
      setSaving(false);
    }
  }, [onSave, serverUrl, accessToken]);
  const handleUrlChange = React.useCallback((e) => setServerUrl(e.target.value), []);
  const handleTokenChange = React.useCallback((e) => setAccessToken(e.target.value), []);
  return React.createElement(
    "div",
    { style: s.block },
    React.createElement("div", { style: { ...s.muted, marginBottom: 8 } }, "\u670D\u52A1\u5668\u914D\u7F6E"),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8 } },
      React.createElement("input", {
        style: s.input,
        placeholder: "WebSocket \u5730\u5740\uFF0C\u4F8B\u5982 wss://tunnel.example.com/connect",
        value: serverUrl,
        onChange: handleUrlChange,
        disabled: saving
      }),
      React.createElement("input", {
        style: s.input,
        type: "password",
        placeholder: "\u8BBF\u95EE\u4EE4\u724C\uFF08Access Token\uFF09",
        value: accessToken,
        onChange: handleTokenChange,
        disabled: saving
      }),
      React.createElement("button", {
        style: { ...s.btnPri, alignSelf: "flex-start", opacity: !dirty || saving ? 0.5 : 1 },
        disabled: !dirty || saving,
        onClick: handleSave
      }, saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u914D\u7F6E")
    )
  );
});
var TunnelCard = React.memo(function TunnelCard2({ title, desc, data, onStart, onStop, onReset, children }) {
  const { running, configured, url, qr, state } = data ?? {};
  const phase = state?.phase ?? "idle";
  return React.createElement(
    "div",
    { style: s.card },
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: s.label }, title),
        React.createElement("div", { style: { ...s.muted, marginTop: 2 } }, desc)
      ),
      React.createElement(StatusTag, { running })
    ),
    children,
    phase !== "idle" && phase !== "ready" && React.createElement("div", {
      style: {
        ...s.block,
        fontSize: 12,
        color: phase === "error" ? "var(--dsw-alias-state-error-primary,#dc2626)" : "var(--dsw-alias-label-secondary,#6b7280)"
      }
    }, state?.detail ?? phase),
    url && React.createElement(QrBlock, { url, qr, onReset }),
    (onStart || onStop) && React.createElement(
      "div",
      {
        style: { ...s.block, display: "flex", gap: 8, flexWrap: "wrap" }
      },
      !running && onStart && React.createElement("button", {
        style: { ...s.btnPri, opacity: configured === false ? 0.4 : 1 },
        onClick: onStart,
        disabled: configured === false || phase === "connecting" || phase === "downloading",
        title: configured === false ? "\u8BF7\u5148\u4FDD\u5B58\u670D\u52A1\u5668\u914D\u7F6E" : ""
      }, phase === "connecting" ? "\u8FDE\u63A5\u4E2D\u2026" : phase === "downloading" ? "\u4E0B\u8F7D\u4E2D\u2026" : "\u5F00\u542F"),
      running && onStop && React.createElement("button", { style: s.btnGhost, onClick: onStop }, "\u5173\u95ED")
    )
  );
});
function WechatCard({ rpcCall, onStatusChange }) {
  const [wx, setWx] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [cfgDraft, setCfgDraft] = React.useState(null);
  React.useEffect(() => {
    if (wx?.config && !cfgDraft) {
      setCfgDraft({
        digestIntervalSec: String(wx.config.digestIntervalSec ?? 300),
        approvalTimeoutSec: String(wx.config.approvalTimeoutSec ?? 600),
        maxMessageChars: String(wx.config.maxMessageChars ?? 2e3),
        sendChunkDelayMs: String(wx.config.sendChunkDelayMs ?? 1500)
      });
    }
  }, [wx?.config]);
  React.useEffect(() => {
    const connected2 = wx?.status === "connected" || wx?.status === "starting" || wx?.status === "reconnecting";
    onStatusChange?.(connected2);
  }, [wx?.status, onStatusChange]);
  const load = React.useCallback(async (quiet = false) => {
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.wechatGetStatus, {});
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setWx(r.value);
      if (!quiet) setErr(null);
    } catch (e) {
      if (!quiet) setErr(e.message);
    }
  }, [rpcCall]);
  React.useEffect(() => {
    load();
    const activeLogin = wx?.login && (wx.login.phase === "qr" || wx.login.phase === "scaned");
    const interval = activeLogin ? 1500 : 3e3;
    const t = setInterval(() => load(true), interval);
    return () => clearInterval(t);
  }, [load, wx?.login?.phase]);
  const act = React.useCallback(async (endpoint, payload) => {
    setBusy(true);
    try {
      const r = await rpcCall(endpoint, payload ?? {});
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setWx(r.value);
      setErr(null);
      await load(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [rpcCall, load]);
  const onLogin = React.useCallback(() => act(BRIDGE_ENDPOINTS.wechatLogin, {}), [act]);
  const onStop = React.useCallback(() => act(BRIDGE_ENDPOINTS.wechatStop, {}), [act]);
  const [newId, setNewId] = React.useState("");
  const addAllow = React.useCallback(async () => {
    const id = newId.trim();
    if (!id) return;
    const list = [...wx?.allowFrom ?? [], id];
    await act(BRIDGE_ENDPOINTS.wechatSetAllowFrom, { allowFrom: list });
    setNewId("");
  }, [act, newId, wx?.allowFrom]);
  const removeAllow = React.useCallback(async (id) => {
    const list = (wx?.allowFrom ?? []).filter((x) => x !== id);
    await act(BRIDGE_ENDPOINTS.wechatSetAllowFrom, { allowFrom: list });
  }, [act, wx?.allowFrom]);
  const handleNewId = React.useCallback((e) => setNewId(e.target.value), []);
  const saveConfig = React.useCallback(async () => {
    if (!cfgDraft) return;
    await act(BRIDGE_ENDPOINTS.wechatSetConfig, {
      digestIntervalSec: Number(cfgDraft.digestIntervalSec),
      approvalTimeoutSec: Number(cfgDraft.approvalTimeoutSec),
      maxMessageChars: Number(cfgDraft.maxMessageChars),
      sendChunkDelayMs: Number(cfgDraft.sendChunkDelayMs)
    });
  }, [act, cfgDraft]);
  const cfgDirty = cfgDraft && wx?.config && (Number(cfgDraft.digestIntervalSec) !== wx.config.digestIntervalSec || Number(cfgDraft.approvalTimeoutSec) !== wx.config.approvalTimeoutSec || Number(cfgDraft.maxMessageChars) !== wx.config.maxMessageChars || Number(cfgDraft.sendChunkDelayMs) !== wx.config.sendChunkDelayMs);
  if (!wx && !err) {
    return React.createElement(
      "div",
      { style: s.card },
      React.createElement("div", { style: s.label }, "\u5FAE\u4FE1 Bot"),
      React.createElement("div", { style: { ...s.muted, marginTop: 6 } }, "\u52A0\u8F7D\u4E2D\u2026")
    );
  }
  const connected = wx?.status === "connected" || wx?.status === "starting";
  const login = wx?.login ?? {};
  const showQr = login.phase === "qr" || login.phase === "scaned";
  const statusLabel = wx?.status === "connected" ? "\u5DF2\u8FDE\u63A5" : wx?.status === "starting" ? "\u8FDE\u63A5\u4E2D\u2026" : wx?.status === "reconnecting" ? "\u91CD\u8FDE\u4E2D\u2026" : wx?.status === "paused" ? "\u6682\u505C\uFF08\u4F1A\u8BDD\u8FC7\u671F\uFF09" : wx?.status === "error" ? "\u9519\u8BEF" : "\u672A\u8FDE\u63A5";
  return React.createElement(
    "div",
    { style: s.card },
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: s.label }, "\u5FAE\u4FE1 Bot"),
        React.createElement(
          "div",
          { style: { ...s.muted, marginTop: 2 } },
          "\u901A\u8FC7\u5FAE\u4FE1\u626B ClawBot \u4E8C\u7EF4\u7801\uFF0C\u5728\u5FAE\u4FE1\u91CC\u8FDC\u7A0B\u5BF9\u8BDD\u548C\u63A7\u5236 DSH agent"
        )
      ),
      React.createElement(StatusTag, { running: connected })
    ),
    // 快捷入口：使用说明 / 命令
    React.createElement(
      "div",
      { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" } },
      React.createElement("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/wechat-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} \u4F7F\u7528\u8BF4\u660E"),
      React.createElement("button", {
        style: s.btnGhost,
        onClick: () => setShowHelp((v) => !v)
      }, showHelp ? "\u6536\u8D77\u547D\u4EE4" : "\u5FAE\u4FE1\u547D\u4EE4")
    ),
    // 命令速查
    showHelp && React.createElement(
      "div",
      { style: { ...s.block, fontSize: 12, lineHeight: 1.8, fontFamily: "monospace" } },
      React.createElement("div", null, "/new <\u63D0\u793A\u8BCD> \u2014 \u65B0\u5EFA\u4F1A\u8BDD\uFF08\u5F53\u524D\u5DE5\u4F5C\u533A\uFF09"),
      React.createElement("div", null, "/new <\u63D0\u793A\u8BCD> @N \u2014 \u5728\u6307\u5B9A\u5DE5\u4F5C\u533A\u65B0\u5EFA"),
      React.createElement("div", null, "/sessions \u2014 \u6309\u5DE5\u4F5C\u533A\u5206\u7EC4\u5217\u4F1A\u8BDD"),
      React.createElement("div", null, "/use N \u2014 \u5207\u6362\u5230\u4F1A\u8BDD N"),
      React.createElement("div", null, "/workspaces \u2014 \u5217\u51FA\u5DE5\u4F5C\u533A"),
      React.createElement("div", null, "/stop \u2014 \u505C\u6B62\u4EFB\u52A1"),
      React.createElement("div", null, "/status \u2014 \u67E5\u770B\u72B6\u6001"),
      React.createElement("div", null, "/yes \u6216 /no \u2014 \u56DE\u5E94\u5BA1\u6279"),
      React.createElement("div", null, "/help \u2014 \u5168\u90E8\u547D\u4EE4")
    ),
    err && React.createElement("div", { style: { ...s.warn, marginTop: 10 } }, err),
    // 已配置：状态详情 + 白名单
    wx?.configured && React.createElement(
      "div",
      { style: s.block },
      React.createElement(
        "div",
        { style: { fontSize: 12, lineHeight: 1.7 } },
        React.createElement("div", null, `\u72B6\u6001: ${statusLabel}`),
        wx.accountId && React.createElement("div", null, `\u8D26\u53F7: ${wx.accountId}`),
        wx.sessionId && React.createElement("div", null, `\u5F53\u524D\u4F1A\u8BDD: ${wx.sessionId}`)
      ),
      React.createElement(
        "div",
        { style: { ...s.muted, fontSize: 12, marginTop: 8, lineHeight: 1.6 } },
        "\u767D\u540D\u5355\uFF08\u4EC5\u8FD9\u4E9B\u5FAE\u4FE1\u7528\u6237\u53EF\u9A71\u52A8 agent\uFF09:"
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 } },
        wx.allowFrom?.length ? wx.allowFrom.map(
          (id) => React.createElement(
            "span",
            { key: id, style: { ...s.tag, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", color: "var(--dsw-alias-label-primary,currentColor)", gap: 6 } },
            React.createElement("span", { style: { fontSize: 12, wordBreak: "break-all" } }, id),
            React.createElement("button", {
              style: { cursor: "pointer", border: "none", background: "none", color: "var(--dsw-alias-state-error-primary,#dc2626)", fontSize: 12, padding: 0 },
              onClick: () => removeAllow(id),
              title: "\u79FB\u51FA\u767D\u540D\u5355"
            }, "\xD7")
          )
        ) : React.createElement("div", { style: { ...s.muted, fontSize: 12 } }, "(\u7A7A \u2014 \u626B\u7801\u540E\u9996\u4E2A\u53D1\u6D88\u606F\u7684\u5FAE\u4FE1\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)")
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 8, alignItems: "center" } },
        React.createElement("input", {
          style: { ...s.input, flex: 1 },
          placeholder: "\u6DFB\u52A0\u5141\u8BB8\u7684\u5FAE\u4FE1 ID\uFF08\u5982 xxx@im.wechat\uFF09",
          value: newId,
          onChange: handleNewId
        }),
        React.createElement("button", {
          style: { ...s.btnGhost, whiteSpace: "nowrap", opacity: newId.trim() && !busy ? 1 : 0.5 },
          onClick: addAllow,
          disabled: busy || !newId.trim()
        }, "\u6DFB\u52A0")
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" } },
        wx.status !== "connected" && wx.status !== "starting" && React.createElement("button", { style: s.btnPri, onClick: onLogin, disabled: busy }, "\u91CD\u65B0\u626B\u7801"),
        (wx.status === "connected" || wx.status === "starting") && React.createElement("button", { style: s.btnGhost, onClick: onStop, disabled: busy }, "\u65AD\u5F00"),
        React.createElement("button", {
          style: { ...s.btnGhost, color: "var(--dsw-alias-state-error-primary,#dc2626)", borderColor: "var(--dsw-alias-state-error-primary,#dc2626)", opacity: busy ? 0.5 : 1 },
          disabled: busy,
          onClick: () => {
            if (window.confirm("\u786E\u8BA4\u89E3\u7ED1\uFF1F\u8FD9\u5C06\u6E05\u9664\u767B\u5F55\u51ED\u8BC1\uFF0C\u4E0B\u6B21\u9700\u91CD\u65B0\u626B\u7801\u767B\u5F55\u3002")) act(BRIDGE_ENDPOINTS.wechatUnbind, {});
          },
          title: "\u6E05\u9664\u767B\u5F55\u51ED\u8BC1\uFF0C\u4E0B\u6B21\u9700\u91CD\u65B0\u626B\u7801"
        }, "\u89E3\u7ED1\u8D26\u53F7")
      )
    ),
    // 未配置 / 登录中：二维码
    (!wx?.configured || showQr) && React.createElement(
      "div",
      { style: s.block },
      showQr && login.qr ? React.createElement(
        "div",
        null,
        React.createElement("img", { src: login.qr, alt: "wechat QR", style: s.qr }),
        React.createElement(
          "div",
          { style: { ...s.muted, marginTop: 4 } },
          login.phase === "scaned" ? "\u5DF2\u626B\u7801\uFF0C\u8BF7\u5728\u624B\u673A\u4E0A\u786E\u8BA4\u2026" : "\u8BF7\u4F7F\u7528\u5FAE\u4FE1\u626B\u7801\u767B\u5F55\uFF08ClawBot\uFF09"
        ),
        login.error && React.createElement("div", { style: { ...s.muted, marginTop: 4, color: "var(--dsw-alias-state-warn-primary,#92400e)" } }, login.error)
      ) : React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" } },
        React.createElement("button", {
          style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
          onClick: onLogin,
          disabled: busy
        }, busy ? "\u5904\u7406\u4E2D\u2026" : "\u626B\u7801\u767B\u5F55"),
        login.phase === "error" && React.createElement("div", { style: { ...s.muted, fontSize: 12 } }, login.error ?? "\u767B\u5F55\u5931\u8D25")
      )
    ),
    // 高级设置（可折叠）
    cfgDraft && React.createElement(
      "div",
      { style: s.block },
      React.createElement("button", {
        style: { ...s.btnLink, fontSize: 12, marginBottom: showAdvanced ? 10 : 0 },
        onClick: () => setShowAdvanced((v) => !v)
      }, showAdvanced ? "\u25BE \u9AD8\u7EA7\u8BBE\u7F6E" : "\u25B8 \u9AD8\u7EA7\u8BBE\u7F6E"),
      showAdvanced && React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 10 } },
        // 心跳间隔
        React.createElement(
          "div",
          null,
          React.createElement("div", { style: { ...s.muted, marginBottom: 4 } }, "\u5FC3\u8DF3\u95F4\u9694\uFF08\u79D2\uFF09\u2014 \u957F\u4EFB\u52A1\u5904\u7406\u4E2D\u6BCF\u9694\u591A\u4E45\u53D1\u4E00\u6B21\u8FDB\u5EA6\u63D0\u793A"),
          React.createElement("input", {
            style: { ...s.input, width: 120 },
            type: "number",
            min: 30,
            max: 3600,
            value: cfgDraft.digestIntervalSec,
            onChange: (e) => setCfgDraft((d) => ({ ...d, digestIntervalSec: e.target.value }))
          })
        ),
        // 审批超时
        React.createElement(
          "div",
          null,
          React.createElement("div", { style: { ...s.muted, marginBottom: 4 } }, "\u5BA1\u6279\u8D85\u65F6\uFF08\u79D2\uFF09\u2014 \u5DE5\u5177\u8C03\u7528\u5BA1\u6279\u65E0\u54CD\u5E94\u540E\u81EA\u52A8\u62D2\u7EDD"),
          React.createElement("input", {
            style: { ...s.input, width: 120 },
            type: "number",
            min: 30,
            max: 86400,
            value: cfgDraft.approvalTimeoutSec,
            onChange: (e) => setCfgDraft((d) => ({ ...d, approvalTimeoutSec: e.target.value }))
          })
        ),
        // 每气泡字数
        React.createElement(
          "div",
          null,
          React.createElement("div", { style: { ...s.muted, marginBottom: 4 } }, "\u6BCF\u6761\u6D88\u606F\u6700\u5927\u5B57\u6570 \u2014 \u8D85\u51FA\u65F6\u81EA\u52A8\u5206\u591A\u6761\u53D1\u9001"),
          React.createElement("input", {
            style: { ...s.input, width: 120 },
            type: "number",
            min: 100,
            max: 1e4,
            value: cfgDraft.maxMessageChars,
            onChange: (e) => setCfgDraft((d) => ({ ...d, maxMessageChars: e.target.value }))
          })
        ),
        // 分块延迟
        React.createElement(
          "div",
          null,
          React.createElement("div", { style: { ...s.muted, marginBottom: 4 } }, "\u5206\u5757\u53D1\u9001\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09\u2014 \u591A\u6761\u6D88\u606F\u4E4B\u95F4\u7684\u95F4\u9694"),
          React.createElement("input", {
            style: { ...s.input, width: 120 },
            type: "number",
            min: 0,
            max: 1e4,
            value: cfgDraft.sendChunkDelayMs,
            onChange: (e) => setCfgDraft((d) => ({ ...d, sendChunkDelayMs: e.target.value }))
          })
        ),
        React.createElement("button", {
          style: { ...s.btnPri, alignSelf: "flex-start", opacity: cfgDirty && !busy ? 1 : 0.5 },
          disabled: !cfgDirty || busy,
          onClick: saveConfig
        }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u8BBE\u7F6E")
      )
    ),
    React.createElement(
      "div",
      { style: s.block },
      React.createElement(
        "div",
        { style: { ...s.tip, fontSize: 12 } },
        "\u8BF4\u660E: \u626B\u7801\u6210\u529F\u540E\uFF0C\u5411\u8BE5\u5FAE\u4FE1 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u5FAE\u4FE1\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002\u4F7F\u7528\u4E13\u7528\u5FAE\u4FE1\u53F7\uFF0C\u907F\u514D\u5F71\u54CD\u4E3B\u53F7\u3002"
      )
    )
  );
}
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
  React.useEffect(() => {
    check();
  }, [check]);
  const hasUpdate = info?.latest && info?.current && !info.error && semverGt(info.latest, info.current);
  const links = React.createElement(
    "div",
    { style: { display: "flex", gap: 12, alignItems: "center" } },
    React.createElement("a", {
      href: GITHUB_URL,
      target: "_blank",
      rel: "noreferrer",
      style: s.btnLink
    }, "\u2B50 GitHub"),
    React.createElement("a", {
      href: ISSUES_URL,
      target: "_blank",
      rel: "noreferrer",
      style: s.btnLink
    }, "\u{1F41B} \u53CD\u9988 Bug")
  );
  if (hasUpdate) {
    return React.createElement(
      "div",
      { style: { marginBottom: 16 } },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "linear-gradient(135deg, var(--dsw-alias-brand-primary,#4f6ef7) 0%, #6366f1 100%)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 8,
            color: "#fff"
          }
        },
        React.createElement("span", { style: { fontSize: 20 } }, "\u{1F389}"),
        React.createElement(
          "div",
          { style: { flex: 1 } },
          React.createElement(
            "div",
            { style: { fontSize: 13, fontWeight: 600 } },
            `\u53D1\u73B0\u65B0\u7248\u672C v${info.latest}\uFF08\u5F53\u524D v${info.current}\uFF09`
          ),
          React.createElement("code", {
            style: { fontSize: 11, opacity: 0.85, fontFamily: "ui-monospace,Menlo,monospace", wordBreak: "break-all" }
          }, "dsh plugin --profile web update @wenbin_wb/dsh-bridge --latest")
        ),
        React.createElement("button", {
          style: {
            font: "inherit",
            cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.4)",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            height: 30,
            padding: "0 12px",
            borderRadius: 999,
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            opacity: loading ? 0.5 : 1,
            flexShrink: 0
          },
          onClick: check,
          disabled: loading
        }, loading ? "\u2026" : "\u5237\u65B0")
      ),
      links
    );
  }
  return React.createElement(
    "div",
    { style: { marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 } },
    React.createElement(
      "div",
      { style: { ...s.muted, display: "flex", alignItems: "center", gap: 8 } },
      loading && !info ? React.createElement("span", null, "\u68C0\u67E5\u66F4\u65B0\u4E2D\u2026") : info ? React.createElement("span", null, `v${info.current}${info.latest && !info.error ? " \xB7 \u5DF2\u662F\u6700\u65B0" : info.error ? " \xB7 \u68C0\u67E5\u5931\u8D25" : ""}`) : null,
      info && React.createElement("button", {
        style: { ...s.btnGhost, height: 22, padding: "0 8px", fontSize: 11, opacity: loading ? 0.5 : 1 },
        onClick: check,
        disabled: loading
      }, loading ? "\u2026" : "\u91CD\u65B0\u68C0\u67E5")
    ),
    links
  );
}
var TABS = [
  { id: "lan", label: "\u5C40\u57DF\u7F51" },
  { id: "tunnel", label: "\u516C\u7F51\u96A7\u9053" },
  { id: "im", label: "IM \u673A\u5668\u4EBA" }
];
function TabBar({ active, onChange, dots }) {
  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        gap: 0,
        marginBottom: 20,
        borderBottom: "1px solid var(--dsw-alias-border-l2,#e5e7eb)"
      }
    },
    TABS.map(({ id, label }) => {
      const isActive = active === id;
      const hasDot = dots?.[id];
      return React.createElement(
        "button",
        {
          key: id,
          onClick: () => onChange(id),
          style: {
            font: "inherit",
            cursor: "pointer",
            border: "none",
            background: "none",
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-secondary,#6b7280)",
            borderBottom: isActive ? "2px solid var(--dsw-alias-brand-primary,#4f6ef7)" : "2px solid transparent",
            marginBottom: -1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "color .15s, border-color .15s",
            whiteSpace: "nowrap"
          }
        },
        label,
        hasDot && React.createElement("span", {
          style: {
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--dsw-alias-state-success-primary,#10b981)",
            flexShrink: 0
          }
        })
      );
    })
  );
}
function BridgePanel({ rpcCall }) {
  const [status, setStatus] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("lan");
  const [wechatConnected, setWechatConnected] = React.useState(false);
  const load = React.useCallback(async (quiet = false) => {
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.getStatus, {});
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setStatus(r.value);
      if (!quiet) setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [rpcCall]);
  React.useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await rpcCall(BRIDGE_ENDPOINTS.wechatGetStatus, {});
        if (alive && r?.ok) {
          const s2 = r.value?.status;
          setWechatConnected(s2 === "connected" || s2 === "starting" || s2 === "reconnecting");
        }
      } catch {
      }
    };
    poll();
    const t = setInterval(poll, 4e3);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [rpcCall]);
  React.useEffect(() => {
    load();
    const t = setInterval(() => load(true), 3e3);
    return () => clearInterval(t);
  }, [load]);
  const act = React.useCallback(async (endpoint, payload) => {
    try {
      const r = await rpcCall(endpoint, payload ?? {});
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setStatus(r.value);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [rpcCall]);
  const onStartCloudflared = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCloudflared), [act]);
  const onStopCloudflared = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCloudflared), [act]);
  const onResetCloudflared = React.useCallback(
    () => act(BRIDGE_ENDPOINTS.stopCloudflared).then(() => act(BRIDGE_ENDPOINTS.startCloudflared)),
    [act]
  );
  const onStartCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCustomTunnel), [act]);
  const onStopCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCustomTunnel), [act]);
  const saveConfig = React.useCallback(
    (serverUrl, accessToken) => act(BRIDGE_ENDPOINTS.saveCustomTunnelConfig, { serverUrl, accessToken }),
    [act]
  );
  if (!status && !err) {
    return React.createElement("div", {
      style: { padding: 32, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontSize: 13 }
    }, "\u52A0\u8F7D\u4E2D\u2026");
  }
  const ct = status?.customTunnel;
  const dots = {
    lan: !!status?.proxy?.running,
    tunnel: !!(status?.cloudflared?.running || ct?.running),
    im: wechatConnected
  };
  let tabContent;
  if (activeTab === "lan") {
    tabContent = React.createElement(TunnelCard, {
      title: "\u5C40\u57DF\u7F51\u8BBF\u95EE",
      desc: "\u540C\u4E00 Wi-Fi \u4E0B\u7684\u8BBE\u5907\u53EF\u76F4\u63A5\u626B\u7801\u8BBF\u95EE",
      data: { running: status?.proxy?.running, url: status?.lan?.url, qr: status?.lan?.qr }
    });
  } else if (activeTab === "tunnel") {
    tabContent = React.createElement(
      React.Fragment,
      null,
      React.createElement(TunnelCard, {
        title: "Cloudflare \u96A7\u9053",
        desc: "\u4E00\u952E\u83B7\u53D6\u516C\u7F51\u5730\u5740\uFF08\u91CD\u542F\u540E URL \u4F1A\u53D8\u5316\uFF09",
        data: {
          running: status?.cloudflared?.running,
          url: status?.cloudflared?.url,
          qr: status?.cloudflared?.qr,
          state: status?.cloudflared?.state
        },
        onStart: onStartCloudflared,
        onStop: onStopCloudflared,
        onReset: status?.cloudflared?.running ? onResetCloudflared : null
      }),
      React.createElement(
        TunnelCard,
        {
          title: "\u81EA\u5EFA\u96A7\u9053",
          desc: "\u8FDE\u63A5\u81EA\u5DF1\u90E8\u7F72\u7684\u96A7\u9053\u670D\u52A1\u5668\uFF0C\u83B7\u5F97\u56FA\u5B9A\u57DF\u540D",
          data: {
            configured: ct?.configured,
            running: ct?.running,
            url: ct?.url,
            qr: ct?.qr,
            state: ct?.state
          },
          onStart: onStartCustom,
          onStop: onStopCustom
        },
        React.createElement(CustomTunnelGuide),
        React.createElement(CustomTunnelConfigForm, {
          serverUrl: ct?.serverUrl ?? "",
          accessToken: ct?.accessToken ?? "",
          onSave: saveConfig
        })
      )
    );
  } else if (activeTab === "im") {
    const IM_PLATFORMS = [
      { id: "wechat", label: "\u5FAE\u4FE1", desc: "iLink Bot API\uFF08ClawBot\uFF09", available: true, active: wechatConnected },
      { id: "qq", label: "QQ", desc: "NapCat / Mirai", available: false, active: false },
      { id: "feishu", label: "\u98DE\u4E66", desc: "\u5B98\u65B9\u4E8B\u4EF6\u56DE\u8C03 API", available: false, active: false }
    ];
    tabContent = React.createElement(
      "div",
      null,
      // 平台选择器
      React.createElement(
        "div",
        {
          style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }
        },
        IM_PLATFORMS.map(
          ({ id, label, desc, available, active }) => React.createElement(
            "div",
            {
              key: id,
              style: {
                flex: "1 1 140px",
                border: `1px solid ${active ? "var(--dsw-alias-state-success-primary,#10b981)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                borderRadius: 10,
                padding: "12px 14px",
                opacity: available ? 1 : 0.45,
                cursor: available ? "default" : "not-allowed",
                background: active ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : available ? "var(--dsw-alias-bg-layer-1,transparent)" : "var(--dsw-alias-bg-layer-2,#f9fafb)"
              }
            },
            React.createElement(
              "div",
              { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
              label,
              active && React.createElement("span", {
                style: { width: 6, height: 6, borderRadius: "50%", background: "var(--dsw-alias-state-success-primary,#10b981)", flexShrink: 0 }
              }),
              !active && available && React.createElement("span", {
                style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#6b7280)", fontWeight: 400 }
              }, "\u672A\u8FDE\u63A5"),
              !available && React.createElement("span", {
                style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontWeight: 400 }
              }, "\u5373\u5C06\u652F\u6301")
            ),
            React.createElement("div", { style: { ...s.muted, marginTop: 3, fontSize: 11 } }, desc)
          )
        )
      ),
      // 微信卡片（onStatusChange 向上报连接状态）
      React.createElement(WechatCard, { rpcCall, onStatusChange: setWechatConnected })
    );
  }
  return React.createElement(
    "div",
    { style: { maxWidth: 560 } },
    err && React.createElement("div", {
      style: { ...s.card, background: "var(--dsw-alias-state-error-bg,#fef2f2)", color: "var(--dsw-alias-state-error-primary,#dc2626)", fontSize: 13, marginBottom: 16 }
    }, err),
    React.createElement(VersionBanner, { rpcCall }),
    React.createElement(TabBar, { active: activeTab, onChange: setActiveTab, dots }),
    tabContent
  );
}
function apply(ctx) {
  const rpcCall = (endpoint, payload, signal) => ctx.connection.rpc.call(BRIDGE_RPC_CHANNEL, endpoint, payload, signal);
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: "dsh-bridge",
        order: 10,
        label: () => "\u8FDC\u7A0B\u8BBF\u95EE",
        inject: () => ({ rpcCall })
      },
      BridgePanel
    )
  );
}

    return module.exports;
  }
});
