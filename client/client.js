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

// lib/bridge-rpc.js
var BRIDGE_RPC_CHANNEL = "/dsh-bridge";
var BRIDGE_ENDPOINTS = {
  getStatus: "getStatus",
  startCustomTunnel: "startCustomTunnel",
  stopCustomTunnel: "stopCustomTunnel",
  startCloudflared: "startCloudflared",
  stopCloudflared: "stopCloudflared",
  resetCloudflared: "resetCloudflared",
  saveCustomTunnelConfig: "saveCustomTunnelConfig",
  checkVersion: "checkVersion"
};

// client/index.js
var GITHUB_URL = "https://github.com/wenbin-wb/dsh-bridge";
var ISSUES_URL = "https://github.com/wenbin-wb/dsh-bridge/issues/new";
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
  card: { background: "var(--dsw-alias-bg-layer-1,#fff)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 },
  block: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 12, paddingTop: 12 },
  muted: { color: "var(--dsw-alias-label-tertiary,#8b93a1)", fontSize: 12, lineHeight: 1.5 },
  label: { color: "var(--dsw-alias-label-primary,inherit)", fontSize: 13, fontWeight: 500 },
  code: { fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, wordBreak: "break-all", color: "var(--dsw-alias-label-primary,inherit)" },
  btnPri: { font: "inherit", cursor: "pointer", border: "none", background: "var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f6ef7))", color: "#fff", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 },
  btnGhost: { font: "inherit", cursor: "pointer", border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-1,#fff)", color: "var(--dsw-alias-label-primary,inherit)", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 },
  btnLink: { font: "inherit", cursor: "pointer", border: "none", background: "none", color: "var(--dsw-alias-brand-primary,#4f6ef7)", fontSize: 12, padding: 0, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" },
  qr: { width: 200, height: 200, borderRadius: 10, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", margin: "8px 0", display: "block" },
  tag: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 500 },
  input: { width: "100%", font: "inherit", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-1,#fff)", color: "var(--dsw-alias-label-primary,inherit)", outline: "none", boxSizing: "border-box" },
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
  const [open, setOpen] = React.useState(false);
  const toggle = React.useCallback(() => setOpen((v) => !v), []);
  return React.createElement(
    "div",
    { style: s.block },
    React.createElement("button", {
      style: { ...s.btnGhost, fontSize: 12, height: 28, marginBottom: open ? 10 : 0 },
      onClick: toggle
    }, open ? "\u25B2 \u6536\u8D77\u642D\u5EFA\u6559\u7A0B" : "\u25B6 \u5982\u4F55\u642D\u5EFA\u81EA\u5EFA\u96A7\u9053\u670D\u52A1\u5668\uFF1F"),
    open && React.createElement(
      "div",
      { style: s.tip },
      React.createElement("div", { style: { fontWeight: 500, marginBottom: 6, color: "var(--dsw-alias-label-primary,inherit)" } }, "\u642D\u5EFA\u6B65\u9AA4"),
      React.createElement(
        "ol",
        { style: { margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 } },
        React.createElement("li", null, "\u5728\u516C\u7F51\u670D\u52A1\u5668\u4E0A\u5B89\u88C5 Node.js 18+"),
        React.createElement("li", null, "\u90E8\u7F72\u96A7\u9053\u670D\u52A1\u7AEF\uFF0C\u63A8\u8350\u4F7F\u7528 frp \u6216\u517C\u5BB9 WebSocket \u7684\u53CD\u5411\u4EE3\u7406"),
        React.createElement("li", null, "\u8BB0\u5F55\u670D\u52A1\u5668\u7684\u516C\u7F51\u57DF\u540D\uFF08\u5982 tunnel.example.com\uFF09\u548C\u8BBF\u95EE\u4EE4\u724C"),
        React.createElement("li", null, "\u5728\u4E0B\u65B9\u586B\u5199 WebSocket \u5730\u5740\uFF08wss://...\uFF09\u548C\u4EE4\u724C\uFF0C\u4FDD\u5B58\u540E\u70B9\u5F00\u542F")
      ),
      React.createElement(
        "div",
        { style: { marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)" } },
        React.createElement("div", { style: { fontWeight: 500, marginBottom: 4, color: "var(--dsw-alias-label-primary,inherit)" } }, "\u5730\u5740\u683C\u5F0F"),
        React.createElement(
          "code",
          { style: { ...s.code, display: "block", padding: "6px 8px", background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", borderRadius: 6 } },
          "wss://tunnel.example.com/connect"
        )
      )
    )
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
function BridgePanel({ rpcCall }) {
  const [status, setStatus] = React.useState(null);
  const [err, setErr] = React.useState(null);
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
  return React.createElement(
    "div",
    { style: { maxWidth: 560 } },
    err && React.createElement("div", {
      style: { ...s.card, background: "var(--dsw-alias-state-error-bg,#fef2f2)", color: "var(--dsw-alias-state-error-primary,#dc2626)", fontSize: 13, marginBottom: 16 }
    }, err),
    React.createElement(VersionBanner, { rpcCall }),
    React.createElement(TunnelCard, {
      title: "\u5C40\u57DF\u7F51\u8BBF\u95EE",
      desc: "\u540C\u4E00 Wi-Fi \u4E0B\u7684\u8BBE\u5907\u53EF\u76F4\u63A5\u626B\u7801\u8BBF\u95EE",
      data: { running: status?.proxy?.running, url: status?.lan?.url, qr: status?.lan?.qr }
    }),
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
