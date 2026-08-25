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
  saveCloudflaredConfig: "saveCloudflaredConfig",
  setTunnelAutoStart: "setTunnelAutoStart",
  saveCustomTunnelConfig: "saveCustomTunnelConfig",
  checkVersion: "checkVersion",
  upgradePlugin: "upgradePlugin",
  // 访问安全认证（密码保护 / 扫码免密 Token）
  authGetStatus: "authGetStatus",
  authUpdateConfig: "authUpdateConfig",
  authRegenerateToken: "authRegenerateToken",
  authAdminUnlock: "authAdminUnlock",
  authAdminLock: "authAdminLock",
  // 平台管理器（多 IM 平台统一接口）
  listPlatforms: "listPlatforms",
  platformLogin: "platformLogin",
  platformSetAllowFrom: "platformSetAllowFrom",
  platformSetConfig: "platformSetConfig",
  platformStop: "platformStop",
  platformStart: "platformStart",
  platformUnbind: "platformUnbind",
  // 微信 Bot（v1.x 向后兼容别名，deprecated）
  wechatGetStatus: "wechatGetStatus",
  wechatLogin: "wechatLogin",
  wechatSetAllowFrom: "wechatSetAllowFrom",
  wechatSetConfig: "wechatSetConfig",
  wechatStop: "wechatStop",
  wechatStart: "wechatStart",
  wechatUnbind: "wechatUnbind"
};

// client/index.js
if (typeof window !== "undefined") {
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function() {
      if (typeof window.crypto.getRandomValues === "function") {
        return ("10000000-1000-4000-8000" + -1e11).replace(/[018]/g, function(c) {
          return (c ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
        });
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    };
  }
}
var GITHUB_URL = "https://github.com/wenbin-wb/dsh-bridge";
var RELEASES_URL = "https://github.com/wenbin-wb/dsh-bridge/releases";
var ISSUES_URL = "https://github.com/wenbin-wb/dsh-bridge/issues/new";
var TUNNEL_DOCS_URL = "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/custom-tunnel.md";
function upgradeCommands(latest) {
  const spec = `@wenbin_wb/dsh-bridge@${latest}`;
  return [
    { id: "dsh", cmd: `dsh plugin --profile web add ${spec}` },
    { id: "npx", cmd: `npx --yes @deepseek-ai/dsh plugin --profile web add ${spec}` }
  ];
}
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
  card: { background: "var(--dsw-alias-bg-layer-2,#f9fafb)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 12, padding: "16px 18px", marginBottom: 16, boxSizing: "border-box" },
  block: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 12, paddingTop: 12 },
  muted: { color: "var(--dsw-alias-label-tertiary,#8b93a1)", fontSize: 12, lineHeight: 1.5 },
  label: { color: "var(--dsw-alias-label-primary,currentColor)", fontSize: 13, fontWeight: 500 },
  code: { fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, wordBreak: "break-all", color: "var(--dsw-alias-label-primary,currentColor)" },
  btnPri: { font: "inherit", cursor: "pointer", border: "none", background: "var(--dsw-alias-brand-primary,#4f6ef7)", color: "var(--dsw-alias-label-primary-foreground,#fff)", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 },
  btnGhost: { font: "inherit", cursor: "pointer", border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-2,#f9fafb)", color: "var(--dsw-alias-label-primary,currentColor)", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" },
  btnLink: { font: "inherit", cursor: "pointer", border: "none", background: "none", color: "var(--dsw-alias-brand-primary,#4f6ef7)", fontSize: 12, padding: 0, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" },
  qr: { width: 200, height: 200, maxWidth: "100%", borderRadius: 10, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", margin: "8px 0", display: "block", background: "#ffffff", padding: 6, boxSizing: "border-box" },
  tag: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, minWidth: "max-content", lineHeight: 1.4 },
  input: { width: "100%", font: "inherit", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-2,#f9fafb)", color: "var(--dsw-alias-label-primary,currentColor)", outline: "none", boxSizing: "border-box" },
  warn: { background: "var(--dsw-alias-state-warn-bg,#fffbeb)", border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-state-warn-primary,#92400e)", lineHeight: 1.6 },
  tip: { background: "var(--dsw-alias-bg-layer-2,#f9fafb)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.6 }
};
var Icons = {
  wechat: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    React.createElement("path", { d: "M8.5 2C4.36 2 1 4.91 1 8.5c0 2.01 1.05 3.81 2.69 4.97l-.69 2.06 2.45-1.22c.94.43 1.98.69 3.05.69.21 0 .42-.01.62-.03-.23-.62-.37-1.28-.37-1.97 0-3.59 3.36-6.5 7.5-6.5.21 0 .41.01.62.03C15.87 4.54 12.44 2 8.5 2zM6 6.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm7.5 3.5c-3.59 0-6.5 2.46-6.5 5.5 0 1.66.86 3.14 2.21 4.1l-.56 1.69 2.01-1c.78.36 1.64.57 2.54.57 3.59 0 6.5-2.46 6.5-5.5s-2.91-5.5-6.5-5.5zm-2 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" })
  ),
  qq: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 2C7.58 2 4 5.37 4 9.53c0 1.95.78 3.73 2.07 5.07-.37 1.15-.99 2.19-1.8 3.08-.18.2-.04.52.23.52 2.22 0 3.99-1.07 4.9-1.86.8.25 1.66.39 2.6.39 4.42 0 8-3.37 8-7.53S16.42 2 12 2zm-3 8a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm6 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" })
  ),
  feishu: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 2.5L3.5 11.2l6.8 1.8 2.2 6.5 1.8-4.7 5.2-1.4L12 2.5zm-.8 11.1l-4.1-1.1 6.5-6.6-4.2 8.3 1.8-.6z" })
  ),
  telegram: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" })
  ),
  lan: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.29 19.3a1 1 0 0 0 1.41 1.41l1.7-1.7C9.02 19.64 10.46 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" })
  ),
  tunnel: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    React.createElement("path", { d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" })
  ),
  security: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" })
  ),
  bot: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    React.createElement("path", { d: "M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" })
  ),
  github: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 13, height: 13, fill: "currentColor", ...props },
    React.createElement("path", { d: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" })
  ),
  refresh: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", ...props },
    React.createElement("path", { d: "M23 4v6h-6M1 20v-6h6" }),
    React.createElement("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
  ),
  check: (props) => React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", ...props },
    React.createElement("polyline", { points: "20 6 9 17 4 12" })
  )
};
function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback((text) => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) done();
    }
  }, []);
  return [copied, copy];
}
function StatusTag({ running, status }) {
  let bg = "var(--dsw-alias-bg-layer-2,#f3f4f6)";
  let color = "var(--dsw-alias-label-secondary,#6b7280)";
  let text = running ? "\u8FD0\u884C\u4E2D" : "\u672A\u542F\u52A8";
  if (status === "connected") {
    bg = "var(--dsw-alias-state-success-bg,#ecfdf5)";
    color = "var(--dsw-alias-state-success-primary,#059669)";
    text = "\u5DF2\u8FDE\u63A5";
  } else if (status === "starting") {
    bg = "var(--dsw-alias-state-info-bg,#eff6ff)";
    color = "var(--dsw-alias-state-info-primary,#3b82f6)";
    text = "\u8FDE\u63A5\u4E2D\u2026";
  } else if (status === "reconnecting") {
    bg = "var(--dsw-alias-state-warn-bg,#fffbeb)";
    color = "var(--dsw-alias-state-warn-primary,#d97706)";
    text = "\u91CD\u8FDE\u4E2D\u2026";
  } else if (status === "paused") {
    bg = "var(--dsw-alias-state-warn-bg,#fffbeb)";
    color = "var(--dsw-alias-state-warn-primary,#d97706)";
    text = "\u6682\u505C\u4E2D";
  } else if (status === "error") {
    bg = "var(--dsw-alias-state-error-bg,#fef2f2)";
    color = "var(--dsw-alias-state-error-primary,#dc2626)";
    text = "\u5F02\u5E38";
  } else if (running) {
    bg = "var(--dsw-alias-state-success-bg,#ecfdf5)";
    color = "var(--dsw-alias-state-success-primary,#059669)";
    text = "\u8FD0\u884C\u4E2D";
  }
  return React.createElement("span", {
    style: { ...s.tag, background: bg, color }
  }, text);
}
function QrBlock({ url, qr, onReset, auth, onNavigateSecurity }) {
  const [copied, setCopied] = React.useState(false);
  const [showQr, setShowQr] = React.useState(true);
  const copy = React.useCallback(() => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      }).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      }
    }
  }, [url]);
  const toggleQr = React.useCallback(() => setShowQr((v) => !v), []);
  return React.createElement(
    "div",
    { style: { marginTop: 10 } },
    auth?.enabled ? React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "6px 10px",
          background: "var(--dsw-alias-state-success-bg,#ecfdf5)",
          border: "1px solid var(--dsw-alias-state-success-primary,#10b981)",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--dsw-alias-state-success-primary,#059669)",
          marginBottom: 8,
          fontWeight: 500,
          flexWrap: "wrap",
          cursor: onNavigateSecurity ? "pointer" : "default"
        },
        onClick: onNavigateSecurity,
        title: onNavigateSecurity ? "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u914D\u7F6E" : void 0
      },
      React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, "\u{1F6E1}\uFE0F \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u751F\u6548 \xB7 \u626B\u7801\u8BBE\u5907\u514D\u5BC6"),
      onNavigateSecurity && React.createElement("span", { style: { textDecoration: "underline", fontSize: 11, fontWeight: 600 } }, "\u8BBE\u7F6E \u2794")
    ) : React.createElement(
      "div",
      {
        style: { ...s.warn, cursor: onNavigateSecurity ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
        onClick: onNavigateSecurity,
        title: onNavigateSecurity ? "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u5F00\u542F\u8BBF\u95EE\u4FDD\u62A4" : void 0
      },
      React.createElement("span", null, "\u26A0\uFE0F \u5F53\u524D\u672A\u5F00\u542F\u8BBF\u95EE\u8BA4\u8BC1\uFF0C\u5EFA\u8BAE\u5728\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u5F00\u542F\u5BC6\u7801\u6216\u626B\u7801\u4FDD\u62A4\u3002"),
      onNavigateSecurity && React.createElement("span", { style: { fontWeight: 600, textDecoration: "underline", fontSize: 12, color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, "\u53BB\u5F00\u542F \u2794")
    ),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8 } },
      React.createElement(
        "div",
        { style: { padding: "6px 10px", background: "var(--dsw-alias-bg-layer-1,#ffffff)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 8 } },
        React.createElement("code", { style: { ...s.code, display: "block", wordBreak: "break-all", fontSize: 12, lineHeight: 1.5 } }, url)
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center" } },
        React.createElement("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12, flex: "1 1 auto", justifyContent: "center" },
          onClick: copy
        }, copied ? "\u2713 \u5DF2\u590D\u5236" : "\u590D\u5236\u94FE\u63A5"),
        React.createElement("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12, flex: "1 1 auto", justifyContent: "center" },
          onClick: toggleQr
        }, showQr ? "\u9690\u85CF\u4E8C\u7EF4\u7801" : "\u663E\u793A\u4E8C\u7EF4\u7801")
      )
    ),
    showQr && qr && React.createElement(
      "div",
      { style: { marginTop: 10 } },
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
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (!syncedRef.current && (initUrl || initToken)) {
      setServerUrl(initUrl ?? "");
      setAccessToken(initToken ?? "");
      syncedRef.current = true;
    }
  }, [initUrl, initToken]);
  const dirty = serverUrl !== (initUrl ?? "") || accessToken !== (initToken ?? "");
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
      setSaveErr(e.message || "\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25");
    } finally {
      setSaving(false);
    }
  }, [onSave, serverUrl, accessToken]);
  const handleUrlChange = React.useCallback((e) => {
    setServerUrl(e.target.value);
    setSaveSuccess(false);
    setSaveErr(null);
  }, []);
  const handleTokenChange = React.useCallback((e) => {
    setAccessToken(e.target.value);
    setSaveSuccess(false);
    setSaveErr(null);
  }, []);
  return React.createElement(
    "div",
    { style: s.block },
    React.createElement("div", { style: { ...s.muted, marginBottom: 8 } }, "\u96A7\u9053\u670D\u52A1\u5668\u914D\u7F6E"),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8 } },
      React.createElement("input", {
        style: s.input,
        placeholder: "WebSocket \u5730\u5740\uFF0C\u4F8B\u5982 wss://tunnel.example.com/connect",
        value: serverUrl,
        onChange: handleUrlChange,
        onKeyDown: (e) => {
          if (e.key === "Enter" && dirty && !saving) handleSave();
        },
        disabled: saving
      }),
      React.createElement("input", {
        style: s.input,
        type: "password",
        placeholder: "\u96A7\u9053\u670D\u52A1\u7AEF\u8FDE\u63A5\u4EE4\u724C\uFF08Tunnel Access Token\uFF09",
        value: accessToken,
        onChange: handleTokenChange,
        onKeyDown: (e) => {
          if (e.key === "Enter" && dirty && !saving) handleSave();
        },
        disabled: saving
      }),
      saveErr && React.createElement("div", { style: s.err }, `\u274C ${saveErr}`),
      React.createElement(
        "div",
        { style: { ...s.muted, fontSize: 11 } },
        "\u{1F4A1} \u7528\u4E8E\u4E0E\u60A8\u7684 VPS \u96A7\u9053\u670D\u52A1\u7AEF\u5EFA\u7ACB\u53CD\u5411\u901A\u9053\uFF08\u4E0E Web \u7F51\u9875\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u4E92\u76F8\u72EC\u7ACB\uFF09\u3002"
      ),
      React.createElement("button", {
        style: {
          ...s.btnPri,
          alignSelf: "flex-start",
          opacity: !dirty || saving ? saveSuccess ? 1 : 0.5 : 1,
          background: saveSuccess ? "var(--dsw-alias-state-success-primary,#059669)" : void 0
        },
        disabled: !dirty && !saveSuccess || saving,
        onClick: handleSave
      }, saving ? "\u4FDD\u5B58\u4E2D\u2026" : saveSuccess ? "\u2713 \u5DF2\u4FDD\u5B58" : "\u4FDD\u5B58\u914D\u7F6E")
    )
  );
});
var TunnelCard = React.memo(function TunnelCard2({
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
  const phase = state?.phase ?? "idle";
  return React.createElement(
    "div",
    { style: s.card },
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      React.createElement(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        React.createElement("div", { style: s.label }, title),
        React.createElement("div", { style: { ...s.muted, marginTop: 2 } }, desc)
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 } },
        React.createElement(StatusTag, { running }),
        onToggleAutoStart && React.createElement(
          "label",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--dsw-alias-label-secondary,#6b7280)",
              cursor: "pointer",
              userSelect: "none"
            },
            title: "DSH \u542F\u52A8\u65F6\u81EA\u52A8\u6062\u590D\u8BE5\u96A7\u9053\u7684\u8FD0\u884C\u72B6\u6001"
          },
          React.createElement("input", {
            type: "checkbox",
            checked: Boolean(autoStart),
            onChange: (e) => onToggleAutoStart(e.target.checked)
          }),
          "\u968F DSH \u542F\u52A8\u81EA\u52A8\u5F00\u542F"
        )
      )
    ),
    children,
    phase !== "idle" && phase !== "ready" && React.createElement("div", {
      style: {
        ...s.block,
        fontSize: 12,
        color: phase === "error" ? "var(--dsw-alias-state-error-primary,#dc2626)" : "var(--dsw-alias-label-secondary,#6b7280)"
      }
    }, state?.detail ?? phase),
    url && React.createElement(QrBlock, { url, qr, onReset, auth, onNavigateSecurity }),
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
var CloudflareConfigForm = React.memo(function CloudflareConfigForm2({ token, hostname, onSave }) {
  const [open, setOpen] = React.useState(Boolean(token || hostname));
  const [tokenVal, setTokenVal] = React.useState(token || "");
  const [hostnameVal, setHostnameVal] = React.useState(hostname || "");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    setTokenVal(token || "");
    setHostnameVal(hostname || "");
  }, [token, hostname]);
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await onSave({ token: tokenVal, hostname: hostnameVal });
      setMsg({ ok: true, text: "\u2713 \u56FA\u5B9A\u57DF\u540D\u914D\u7F6E\u5DF2\u4FDD\u5B58" });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "\u4FDD\u5B58\u5931\u8D25" });
    } finally {
      setSaving(false);
    }
  };
  return React.createElement(
    "div",
    {
      style: {
        ...s.block,
        borderTop: "1px solid var(--dsw-alias-border-secondary, #e5e7eb)",
        paddingTop: 10,
        marginTop: 10
      }
    },
    React.createElement(
      "div",
      {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" },
        onClick: () => setOpen((v) => !v)
      },
      React.createElement(
        "div",
        { style: { fontSize: 12, fontWeight: 500, color: "var(--dsw-alias-brand-primary, #3b82f6)" } },
        "\u2699\uFE0F \u9AD8\u7EA7\u914D\u7F6E\uFF1A\u56FA\u5B9A\u57DF\u540D (Cloudflare Token) ",
        (token || hostname) && React.createElement("span", { style: { fontSize: 11, color: "var(--dsw-alias-state-success-primary, #059669)", fontWeight: 400 } }, "\u25CF \u5DF2\u914D\u7F6E\u56FA\u5B9A\u57DF\u540D")
      ),
      React.createElement("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #9ca3af)" } }, open ? "\u25B4 \u6298\u53E0" : "\u25BE \u5C55\u5F00")
    ),
    open && React.createElement(
      "form",
      { onSubmit: handleSave, style: { marginTop: 10 } },
      React.createElement(
        "div",
        { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary, #6b7280)", marginBottom: 8, lineHeight: 1.5 } },
        "\u5728 Cloudflare Zero Trust \u63A7\u5236\u53F0\u521B\u5EFA Tunnel \u5373\u53EF\u83B7\u53D6\u4E13\u5C5E Token \u5E76\u7ED1\u5B9A\u81EA\u5DF1\u7684\u57DF\u540D\uFF08\u5982 dsh.yourname.com\uFF09\uFF0C\u6BCF\u6B21\u91CD\u542F URL \u6C38\u4E0D\u53D8\u66F4\u3002\u4E0D\u586B\u5219\u4F7F\u7528\u9ED8\u8BA4\u514D\u767B\u5F55\u4E34\u65F6\u968F\u673A\u57DF\u540D\u3002"
      ),
      React.createElement(
        "div",
        { style: { marginBottom: 8 } },
        React.createElement("input", {
          style: s.input,
          type: "text",
          placeholder: "\u81EA\u5B9A\u4E49\u56FA\u5B9A\u57DF\u540D (\u4F8B\u5982: dsh.yourdomain.com)",
          value: hostnameVal,
          onChange: (e) => setHostnameVal(e.target.value)
        })
      ),
      React.createElement(
        "div",
        { style: { marginBottom: 8 } },
        React.createElement("input", {
          style: s.input,
          type: "password",
          placeholder: "Tunnel Token (\u4F8B\u5982: eyJhIjoi...)",
          value: tokenVal,
          onChange: (e) => setTokenVal(e.target.value)
        })
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
        React.createElement("button", {
          type: "submit",
          style: { ...s.btnPri, height: 28, fontSize: 12, padding: "0 12px" },
          disabled: saving
        }, saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u56FA\u5B9A\u57DF\u540D\u914D\u7F6E"),
        (tokenVal || hostnameVal) && React.createElement("button", {
          type: "button",
          style: { ...s.btnGhost, height: 28, fontSize: 12, padding: "0 10px" },
          onClick: () => {
            setTokenVal("");
            setHostnameVal("");
            onSave({ token: "", hostname: "" });
          }
        }, "\u6E05\u9664"),
        msg && React.createElement("span", {
          style: { fontSize: 12, color: msg.ok ? "var(--dsw-alias-state-success-primary, #059669)" : "var(--dsw-alias-state-error-primary, #dc2626)" }
        }, msg.text)
      )
    )
  );
});
var AccessAuthCard = React.memo(function AccessAuthCard2({ auth, rpcCall, onUpdate }) {
  const [enabled, setEnabled] = React.useState(auth?.enabled ?? false);
  const [mode, setMode] = React.useState(auth?.mode ?? "token_and_password");
  const [scope, setScope] = React.useState(auth?.scope ?? "all");
  const [adminPolicy, setAdminPolicy] = React.useState(auth?.adminPolicy ?? "password_unlock");
  const [accessPassword, setAccessPassword] = React.useState("");
  const [showAccessPassword, setShowAccessPassword] = React.useState(false);
  const [savingAccess, setSavingAccess] = React.useState(false);
  const [saveAccessSuccess, setSaveAccessSuccess] = React.useState(false);
  const [msgAccess, setMsgAccess] = React.useState(null);
  const [adminPassword, setAdminPassword] = React.useState("");
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
  const [savingAdmin, setSavingAdmin] = React.useState(false);
  const [saveAdminSuccess, setSaveAdminSuccess] = React.useState(false);
  const [msgAdmin, setMsgAdmin] = React.useState(null);
  const [topMsg, setTopMsg] = React.useState(null);
  React.useEffect(() => {
    if (auth) {
      setEnabled(auth.enabled ?? false);
      setMode(auth.mode ?? "token_and_password");
      setScope(auth.scope ?? "all");
      setAdminPolicy(auth.adminPolicy ?? "password_unlock");
    }
  }, [auth]);
  const handleToggleEnabled = async () => {
    const prev = enabled;
    const next = !enabled;
    setEnabled(next);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { enabled: next });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: next ? "\u2713 \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u5F00\u542F\uFF08\u73B0\u6709\u767B\u5F55\u6001\u5DF2\u5237\u65B0\uFF09" : "\u2713 \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u5173\u95ED" });
      onUpdate?.();
    } catch (e) {
      setEnabled(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleChangeMode = async (m) => {
    const prev = mode;
    setMode(m);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { mode: m });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: "\u2713 \u5916\u90E8\u9A8C\u8BC1\u6A21\u5F0F\u5DF2\u5207\u6362\uFF0C\u5DF2\u5237\u65B0\u5168\u57DF\u767B\u5F55\u6001" });
      onUpdate?.();
    } catch (e) {
      setMode(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleChangeScope = async (sc) => {
    const prev = scope;
    setScope(sc);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { scope: sc });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: "\u2713 \u9632\u62A4\u751F\u6548\u8303\u56F4\u5DF2\u66F4\u65B0" });
      onUpdate?.();
    } catch (e) {
      setScope(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleChangeAdminPolicy = async (pol) => {
    const prev = adminPolicy;
    setAdminPolicy(pol);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminPolicy: pol });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: "\u2713 \u8FDC\u7A0B\u7BA1\u7406\u9632\u7BE1\u6539\u7B56\u7565\u5DF2\u66F4\u65B0" });
      onUpdate?.();
    } catch (e) {
      setAdminPolicy(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleSaveAccessPassword = async () => {
    setSavingAccess(true);
    setMsgAccess(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { password: accessPassword });
      if (res?.ok) {
        setSaveAccessSuccess(true);
        setMsgAccess({ ok: true, text: "\u2713 \u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u539F\u6709\u7684\u5386\u53F2\u8BBF\u5BA2\u4F1A\u8BDD\u5DF2\u5168\u90E8\u5B89\u5168\u5237\u65B0\u3002" });
        setAccessPassword("");
        setTimeout(() => setSaveAccessSuccess(false), 3500);
        onUpdate?.();
      } else {
        setMsgAccess({ ok: false, text: res?.error?.message || "\u4FDD\u5B58\u5931\u8D25" });
      }
    } catch (e) {
      setMsgAccess({ ok: false, text: e.message || "\u4FDD\u5B58\u5931\u8D25" });
    } finally {
      setSavingAccess(false);
    }
  };
  const handleSaveAdminPassword = async () => {
    setSavingAdmin(true);
    setMsgAdmin(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminPassword });
      if (res?.ok) {
        setSaveAdminSuccess(true);
        setMsgAdmin({ ok: true, text: "\u2713 \u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u8FDC\u7A0B\u7BA1\u7406\u89E3\u9501\u72B6\u6001\u5DF2\u91CD\u7F6E\u751F\u6548\u3002" });
        setAdminPassword("");
        setTimeout(() => setSaveAdminSuccess(false), 3500);
        onUpdate?.();
      } else {
        setMsgAdmin({ ok: false, text: res?.error?.message || "\u4FDD\u5B58\u5931\u8D25" });
      }
    } catch (e) {
      setMsgAdmin({ ok: false, text: e.message || "\u4FDD\u5B58\u5931\u8D25" });
    } finally {
      setSavingAdmin(false);
    }
  };
  const handleRegenerateToken = async () => {
    if (!confirm("\u91CD\u7F6E\u540E\uFF0C\u4E4B\u524D\u5305\u542B\u65E7 Token \u7684\u4E8C\u7EF4\u7801\u548C\u5206\u4EAB\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\u3002\u662F\u5426\u786E\u8BA4\u91CD\u7F6E\uFF1F")) return;
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authRegenerateToken, {});
      if (!res?.ok) throw new Error(res?.error?.message || "\u91CD\u7F6E\u5931\u8D25");
      setTopMsg({ ok: true, text: "\u2713 \u5B89\u5168 Token \u5DF2\u91CD\u7F6E\uFF0C\u4E8C\u7EF4\u7801\u4E0E\u4E13\u5C5E\u94FE\u63A5\u5DF2\u5237\u65B0" });
      onUpdate?.();
    } catch (e) {
      setTopMsg({ ok: false, text: e.message || "\u91CD\u7F6E\u5931\u8D25" });
    }
  };
  const scopeLabel = scope === "all" ? "\u5168\u90E8\u901A\u9053 (\u5C40\u57DF\u7F51+\u516C\u7F51)" : scope === "public_only" ? "\u4EC5\u516C\u7F51\u96A7\u9053" : "\u4EC5\u5C40\u57DF\u7F51";
  const modeLabel = mode === "token_and_password" ? "\u626B\u7801\u514D\u5BC6 + \u5BC6\u7801" : mode === "password_only" ? "\u4EC5\u5BC6\u7801\u767B\u5F55" : "\u4EC5\u5B89\u5168 Token";
  const adminLabel = adminPolicy === "password_unlock" ? "\u9700\u5BC6\u7801\u89E3\u9501" : adminPolicy === "local_only" ? "\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406" : "\u5BBD\u677E\u6A21\u5F0F";
  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 14 } },
    // ---- 顶部总控与状态概览卡片 ----
    React.createElement(
      "div",
      { style: s.card },
      React.createElement(
        "div",
        {
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }
        },
        React.createElement(
          "div",
          { style: { flex: "1 1 260px" } },
          React.createElement(
            "div",
            { style: { ...s.label, fontSize: 15, display: "flex", alignItems: "center", gap: 8 } },
            "\u{1F510} \u5168\u5C40\u8BBF\u95EE\u5B89\u5168\u9632\u62A4\u4F53\u7CFB"
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, marginTop: 4 } },
            "\u96C6\u6210\u5916\u90E8\u8BBF\u95EE\u95E8\u7981\u62E6\u622A\u4E0E\u7BA1\u7406\u540E\u53F0\u9632\u7BE1\u6539\u63A7\u5236\uFF0C\u53CC\u91CD\u5B88\u62A4\u8FDC\u7A0B\u4F1A\u8BDD\u4E0E\u7F51\u7EDC\u914D\u7F6E\u5B89\u5168"
          )
        ),
        React.createElement("button", {
          style: { ...enabled ? s.btnPri : s.btnGhost, whiteSpace: "nowrap", flexShrink: 0 },
          onClick: handleToggleEnabled
        }, enabled ? "\u2713 \u5DF2\u542F\u7528\u5B89\u5168\u9632\u62A4" : "\u672A\u5F00\u542F\u5B89\u5168\u9632\u62A4")
      ),
      enabled && React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)"
          }
        },
        React.createElement("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, "\u{1F310} \u4FDD\u62A4\u8303\u56F4: ", React.createElement("strong", { style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, scopeLabel)),
        React.createElement("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, "\u{1F511} \u5916\u90E8\u9A8C\u8BC1: ", React.createElement("strong", { style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, modeLabel)),
        React.createElement("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, "\u{1F512} \u540E\u53F0\u9632\u7BE1\u6539: ", React.createElement("strong", { style: { color: "var(--dsw-alias-state-success-primary,#059669)" } }, adminLabel))
      ),
      topMsg && React.createElement("div", {
        style: {
          marginTop: 12,
          padding: "8px 12px",
          borderRadius: 6,
          fontSize: 12,
          background: topMsg.ok ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-state-error-bg,#fef2f2)",
          color: topMsg.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)"
        }
      }, topMsg.text)
    ),
    enabled && React.createElement(
      React.Fragment,
      null,
      // =========================================================================
      // ---- 第一道防线：外部访问门禁（控制谁能进入 Web 界面使用 AI） ----
      // =========================================================================
      React.createElement(
        "div",
        { style: s.card },
        React.createElement(
          "div",
          { style: { marginBottom: 14 } },
          React.createElement(
            "div",
            { style: { ...s.label, fontSize: 14, display: "flex", alignItems: "center", gap: 6 } },
            "\u{1F6E1}\uFE0F \u7B2C\u4E00\u9053\u9632\u7EBF\uFF1A\u5916\u90E8\u8BBF\u95EE\u95E8\u7981\uFF08\u63A7\u5236\u8C01\u80FD\u4F7F\u7528 AI\uFF09"
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, marginTop: 3 } },
            "\u63A7\u5236\u5916\u90E8\u8BBE\u5907\u901A\u8FC7\u5C40\u57DF\u7F51 IP \u6216\u516C\u7F51\u96A7\u9053\uFF08Cloudflare/\u81EA\u5EFA\u96A7\u9053\uFF09\u8FDB\u5165 DSH \u804A\u5929\u754C\u9762\u65F6\u7684\u8EAB\u4EFD\u9A8C\u8BC1\u65B9\u5F0F"
          )
        ),
        // 验证模式选择
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, "\u9A8C\u8BC1\u6A21\u5F0F\u9009\u62E9"),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "token_and_password", title: "\u{1F7E2} \u626B\u7801\u514D\u5BC6 + \u5BC6\u7801\u8BA4\u8BC1 (\u63A8\u8350)", desc: "\u4E8C\u7EF4\u7801\u81EA\u5E26\u4E13\u5C5E Token \u626B\u7801\u79D2\u8FDB\uFF1B\u76F4\u63A5\u8F93 IP/\u516C\u7F51\u57DF\u540D\u9700\u8F93\u5BC6\u7801" },
              { id: "password_only", title: "\u{1F511} \u4EC5\u5BC6\u7801 / PIN \u7801\u767B\u5F55", desc: "\u6240\u6709\u5916\u90E8\u8BBF\u95EE\u5FC5\u987B\u624B\u52A8\u8F93\u5165\u8BBF\u95EE\u5BC6\u7801\u65B9\u53EF\u8FDB\u5165" },
              { id: "token_only", title: "\u{1F3AB} \u4EC5\u5B89\u5168 Token \u514D\u5BC6", desc: "\u4EC5\u6301\u6709\u5E26\u5B89\u5168 Token \u7684\u4E8C\u7EF4\u7801\u6216\u4E13\u5C5E\u5206\u4EAB\u94FE\u63A5\u65B9\u53EF\u8FDB\u5165" }
            ].map((opt) => {
              const isSel = mode === opt.id;
              return React.createElement(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeMode(opt.id),
                  style: {
                    flex: "1 1 200px",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg,#eff6ff)" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                React.createElement("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                React.createElement("div", { style: { ...s.muted, fontSize: 11, marginTop: 4 } }, opt.desc)
              );
            })
          )
        ),
        // 防护生效范围
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, "\u9632\u62A4\u751F\u6548\u901A\u9053"),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "all", title: "\u5168\u90E8\u901A\u9053\u9632\u62A4 (\u63A8\u8350)", desc: "\u5C40\u57DF\u7F51 IP \u76F4\u8FDE\u4E0E\u516C\u7F51\u96A7\u9053\u5168\u90E8\u53D7\u5B89\u5168\u4FDD\u62A4" },
              { id: "public_only", title: "\u4EC5\u516C\u7F51\u96A7\u9053\u5F00\u542F\u9632\u62A4", desc: "\u5C40\u57DF\u7F51\u5185\u8BBE\u5907\u76F4\u63A5\u514D\u5BC6\u76F4\u8FDE\uFF0C\u516C\u7F51\u96A7\u9053\u5F3A\u5236\u9A8C\u8BC1" },
              { id: "lan_only", title: "\u4EC5\u5C40\u57DF\u7F51\u5F00\u542F\u9632\u62A4", desc: "\u4EC5\u5C40\u57DF\u7F51\u76F4\u8FDE\u9700\u9A8C\u8BC1\uFF0C\u516C\u7F51\u96A7\u9053\u4E0D\u5F00\u542F" }
            ].map((opt) => {
              const isSel = scope === opt.id;
              return React.createElement(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeScope(opt.id),
                  style: {
                    flex: "1 1 180px",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg,#eff6ff)" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                React.createElement("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                React.createElement("div", { style: { ...s.muted, fontSize: 11, marginTop: 3 } }, opt.desc)
              );
            })
          )
        ),
        // 访客访问密码输入框 (当非 token_only 时展示)
        mode !== "token_only" && React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement(
            "label",
            { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } },
            `\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 ${auth?.hasPassword ? "(\u2713 \u5DF2\u8BBE\u7F6E\u8BBF\u5BA2\u5BC6\u7801)" : "(\u26A0\uFE0F \u5C1A\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u76F4\u63A5\u8F93\u5165 IP \u5C06\u514D\u5BC6)"}`
          ),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            React.createElement("input", {
              type: showAccessPassword ? "text" : "password",
              style: { ...s.input, flex: 1 },
              placeholder: auth?.hasPassword ? "\u8F93\u5165\u65B0\u5BC6\u7801\u4EE5\u4FEE\u6539\uFF08\u7559\u7A7A\u4FDD\u5B58\u53EF\u6E05\u9664\u8BBF\u5BA2\u5BC6\u7801\uFF09" : "\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 / PIN \u7801",
              value: accessPassword,
              onChange: (e) => setAccessPassword(e.target.value)
            }),
            React.createElement("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: () => setShowAccessPassword((v) => !v)
            }, showAccessPassword ? "\u9690\u85CF" : "\u663E\u793A"),
            React.createElement("button", {
              style: {
                ...s.btnPri,
                height: 32,
                fontSize: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: saveAccessSuccess ? "#059669" : "var(--dsw-alias-brand-primary, #4f6ef7)",
                color: "#ffffff",
                cursor: savingAccess ? "wait" : "pointer"
              },
              onClick: handleSaveAccessPassword,
              disabled: savingAccess
            }, savingAccess ? "\u4FDD\u5B58\u4E2D\u2026" : saveAccessSuccess ? "\u2713 \u5DF2\u6210\u529F\u4FDD\u5B58\uFF01" : "\u4FDD\u5B58\u8BBF\u95EE\u5BC6\u7801")
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
            "\u{1F4A1} \u5F53\u5916\u90E8\u670B\u53CB\u6216\u540C\u4E8B\u672A\u901A\u8FC7\u4E8C\u7EF4\u7801\u626B\u7801\uFF0C\u800C\u662F\u76F4\u63A5\u8F93\u5165 IP \u6216\u516C\u7F51\u57DF\u540D\u8BBF\u95EE\u65F6\uFF0C\u9700\u8F93\u5165\u6B64\u5BC6\u7801\u767B\u5F55\u3002"
          ),
          msgAccess && React.createElement("div", {
            style: {
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              background: msgAccess.ok ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-state-error-bg,#fef2f2)",
              color: msgAccess.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)"
            }
          }, msgAccess.text)
        ),
        // 免密 Token 管理
        mode !== "password_only" && React.createElement(
          "div",
          { style: s.block },
          React.createElement("label", { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } }, "\u514D\u5BC6\u626B\u7801 Token (\u4E13\u5C5E\u8BBF\u95EE\u51ED\u636E)"),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            React.createElement(
              "code",
              { style: { ...s.code, flex: 1, padding: "6px 10px", background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)" } },
              auth?.secretToken ? `${auth.secretToken.slice(0, 10)}****************` : "\u672A\u751F\u6210"
            ),
            React.createElement("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: handleRegenerateToken,
              title: "\u91CD\u65B0\u751F\u6210 Token\uFF0C\u4F7F\u4E4B\u524D\u5206\u4EAB\u7684\u65E7\u4E8C\u7EF4\u7801\u548C\u94FE\u63A5\u7ACB\u5373\u5931\u6548"
            }, "\u{1F504} \u91CD\u7F6E\u5B89\u5168 Token")
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
            "\u{1F4A1} \u63A7\u5236\u53F0\u751F\u6210\u7684\u5C40\u57DF\u7F51\u4E0E\u516C\u7F51\u4E8C\u7EF4\u7801\u5DF2\u81EA\u52A8\u5D4C\u5165\u6B64 Token\uFF0C\u624B\u673A\u626B\u7801\u5373\u53EF\u514D\u5BC6\u8FDB\u5165\u804A\u5929\u754C\u9762\uFF08\u4F46\u4E0D\u8D4B\u4E88\u540E\u53F0\u7BA1\u7406\u8BBE\u7F6E\u6743\u9650\uFF09\u3002"
          )
        )
      ),
      // =========================================================================
      // ---- 第二道防线：后台管理防篡改（控制谁能修改本插件所有设置） ----
      // =========================================================================
      React.createElement(
        "div",
        { style: s.card },
        React.createElement(
          "div",
          { style: { marginBottom: 14 } },
          React.createElement(
            "div",
            { style: { ...s.label, fontSize: 14, display: "flex", alignItems: "center", gap: 6 } },
            "\u{1F512} \u7B2C\u4E8C\u9053\u9632\u7EBF\uFF1A\u7BA1\u7406\u540E\u53F0\u9632\u7BE1\u6539\uFF08\u63A7\u5236\u8C01\u80FD\u4FEE\u6539\u672C\u63D2\u4EF6\u6240\u6709\u8BBE\u7F6E\uFF09"
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, marginTop: 3 } },
            "\u9501\u5B9A\u6574\u4E2A\u63D2\u4EF6\u8BBE\u7F6E\u540E\u53F0\uFF08\u5305\u542B\u5C40\u57DF\u7F51\u3001\u516C\u7F51\u96A7\u9053\u3001IM \u673A\u5668\u4EBA\u5BC6\u94A5\u4E0E\u5B89\u5168\u8BBE\u7F6E\uFF09\uFF0C\u9632\u6B62\u4ED6\u4EBA\u968F\u610F\u7BE1\u6539\u914D\u7F6E"
          )
        ),
        // 管理员密码设置
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement(
            "label",
            { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } },
            `\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5458\u5BC6\u7801 ${auth?.hasAdminPassword ? "(\u2713 \u5DF2\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801)" : "(\u672A\u5355\u72EC\u8BBE\u7F6E\uFF0C\u9ED8\u8BA4\u4F7F\u7528\u4E0A\u8FF0\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801)"}`
          ),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            React.createElement("input", {
              type: showAdminPassword ? "text" : "password",
              style: { ...s.input, flex: 1 },
              placeholder: auth?.hasAdminPassword ? "\u8F93\u5165\u65B0\u5BC6\u7801\u4EE5\u4FEE\u6539\uFF08\u7559\u7A7A\u4FDD\u5B58\u53EF\u6E05\u9664\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801\uFF09" : "\u8BBE\u7F6E\u540E\u53F0\u7BA1\u7406\u89E3\u9501\u5BC6\u7801\uFF08\u5EFA\u8BAE\u4E0E\u8BBF\u5BA2\u5BC6\u7801\u4E0D\u540C\uFF09",
              value: adminPassword,
              onChange: (e) => setAdminPassword(e.target.value)
            }),
            React.createElement("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: () => setShowAdminPassword((v) => !v)
            }, showAdminPassword ? "\u9690\u85CF" : "\u663E\u793A"),
            React.createElement("button", {
              style: {
                ...s.btnPri,
                height: 32,
                fontSize: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: saveAdminSuccess ? "#059669" : "var(--dsw-alias-brand-primary, #4f6ef7)",
                color: "#ffffff",
                cursor: savingAdmin ? "wait" : "pointer"
              },
              onClick: handleSaveAdminPassword,
              disabled: savingAdmin
            }, savingAdmin ? "\u4FDD\u5B58\u4E2D\u2026" : saveAdminSuccess ? "\u2713 \u5DF2\u6210\u529F\u4FDD\u5B58\uFF01" : "\u4FDD\u5B58\u7BA1\u7406\u5BC6\u7801")
          ),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4, color: "var(--dsw-alias-brand-primary,#4f6ef7)" } },
            "\u{1F511} \u6838\u5FC3\u4F5C\u7528\uFF1A\u7528\u4E8E\u8FDC\u7A0B\u8BBE\u5907\u8FDB\u5165\u8BBE\u7F6E\u540E\u53F0\u65F6\u7684\u89E3\u9501\u9A8C\u8BC1\u3002\u8BBE\u7F6E\u540E\uFF0C\u5373\u4FBF\u628A\u8BBF\u95EE\u5BC6\u7801\u544A\u77E5\u4ED6\u4EBA\uFF0C\u4ED6\u4EBA\u4E5F\u65E0\u6CD5\u8FDB\u5165\u8BBE\u7F6E\u540E\u53F0\u6539\u914D\u7F6E\u3002"
          ),
          msgAdmin && React.createElement("div", {
            style: {
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              background: msgAdmin.ok ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-state-error-bg,#fef2f2)",
              color: msgAdmin.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-state-error-primary,#dc2626)"
            }
          }, msgAdmin.text)
        ),
        // 远程管理权限控制策略
        React.createElement(
          "div",
          { style: s.block },
          React.createElement("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, "\u8FDC\u7A0B\u8BBE\u5907\u7BA1\u7406\u6743\u9650\u7B56\u7565"),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "password_unlock", title: "\u{1F512} \u9700\u5BC6\u7801\u89E3\u9501 (\u63A8\u8350)", desc: "\u8FDC\u7A0B\u624B\u673A/\u5916\u7F51\u6253\u5F00\u672C\u63D2\u4EF6\u8BBE\u7F6E\u65F6\u9ED8\u8BA4\u5168\u5C40\u9501\u5B9A\uFF0C\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\u540E\u65B9\u53EF\u4F7F\u7528" },
              { id: "local_only", title: "\u{1F6AB} \u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406 (\u6700\u4E25\u683C)", desc: "\u8FDC\u7A0B\u8BBE\u5907\u5F7B\u5E95\u9501\u5B9A\u6574\u4E2A\u8BBE\u7F6E\u540E\u53F0\uFF0C\u4EC5\u5141\u8BB8\u5728 127.0.0.1 \u7535\u8111\u672C\u673A\u4E0A\u64CD\u4F5C" },
              { id: "open", title: "\u{1F513} \u5BBD\u677E\u6A21\u5F0F", desc: "\u4EFB\u4F55\u5DF2\u901A\u8FC7\u7B2C\u4E00\u9053\u9632\u7EBF\u767B\u5F55\u7684\u8BBE\u5907\u5747\u53EF\u76F4\u63A5\u4FEE\u6539\u6240\u6709\u914D\u7F6E" }
            ].map((opt) => {
              const isSel = adminPolicy === opt.id;
              return React.createElement(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeAdminPolicy(opt.id),
                  style: {
                    flex: "1 1 180px",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg,#eff6ff)" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                React.createElement("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                React.createElement("div", { style: { ...s.muted, fontSize: 11, marginTop: 4 } }, opt.desc)
              );
            })
          )
        )
      )
    )
  );
});
function PlatformCard({ platformId, platformName, platformDesc, rpcCall, onStatusChange }) {
  const [platform, setPlatform] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [cfgDraft, setCfgDraft] = React.useState(null);
  React.useEffect(() => {
    if (platform?.config && !cfgDraft) {
      setCfgDraft({
        digestIntervalSec: String(platform.config.digestIntervalSec ?? 300),
        approvalTimeoutSec: String(platform.config.approvalTimeoutSec ?? 600),
        maxMessageChars: String(platform.config.maxMessageChars ?? (platformId === "telegram" ? 4096 : 2e3)),
        sendChunkDelayMs: String(platform.config.sendChunkDelayMs ?? 1500),
        appId: platform.config.appId ?? "",
        // Secret 不由后端回传；空值表示沿用已保存密钥
        clientSecret: "",
        appSecret: "",
        domain: platform.config.domain ?? "feishu",
        botToken: "",
        proxy: platform.config.proxy ?? ""
      });
    }
  }, [platform?.config, platformId]);
  React.useEffect(() => {
    const connected2 = platform?.status === "connected" || platform?.status === "starting" || platform?.status === "reconnecting";
    onStatusChange?.(connected2);
  }, [platform?.status, onStatusChange]);
  const loadInFlightRef = React.useRef(false);
  const seqRef = React.useRef(0);
  const load = React.useCallback(async (quiet = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const currentSeq = ++seqRef.current;
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
      if (currentSeq !== seqRef.current) return;
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      const allPlatforms = r.value ?? {};
      setPlatform(allPlatforms[platformId] ?? null);
      if (!quiet) setErr(null);
    } catch (e) {
      if (currentSeq === seqRef.current && !quiet) setErr(e.message);
    } finally {
      loadInFlightRef.current = false;
    }
  }, [rpcCall, platformId]);
  React.useEffect(() => {
    load();
    const activeLogin = platform?.login && (platform.login.phase === "qr" || platform.login.phase === "scaned");
    const interval = activeLogin ? 1500 : 3e3;
    const t = setInterval(() => load(true), interval);
    return () => clearInterval(t);
  }, [load, platform?.login?.phase]);
  const act = React.useCallback(async (endpoint, payload) => {
    setBusy(true);
    try {
      const r = await rpcCall(endpoint, { platformId, ...payload });
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
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
  const onStop = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformStop, {}), [act]);
  const [newId, setNewId] = React.useState("");
  const addAllow = React.useCallback(async () => {
    const id = newId.trim();
    if (!id) return;
    const list = [...platform?.allowFrom ?? [], id];
    setBusy(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.platformSetAllowFrom, { platformId, allowFrom: list });
      if (!r?.ok) throw new Error(r?.error?.message ?? "\u6DFB\u52A0\u767D\u540D\u5355\u5931\u8D25");
      setPlatform(r.value);
      setNewId("");
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
  const [showSecret, setShowSecret] = React.useState(false);
  const resetDefaults = React.useCallback(() => {
    setCfgDraft((d) => ({
      ...d,
      digestIntervalSec: "300",
      approvalTimeoutSec: "600",
      maxMessageChars: platformId === "telegram" ? "4096" : "2000",
      sendChunkDelayMs: "1500"
    }));
  }, [platformId]);
  const saveConfig = React.useCallback(async () => {
    if (!cfgDraft) return;
    const payload = {
      digestIntervalSec: Number(cfgDraft.digestIntervalSec),
      approvalTimeoutSec: Number(cfgDraft.approvalTimeoutSec),
      maxMessageChars: Number(cfgDraft.maxMessageChars),
      sendChunkDelayMs: Number(cfgDraft.sendChunkDelayMs)
    };
    if (platformId === "qq") {
      payload.appId = cfgDraft.appId.trim();
      payload.clientSecret = cfgDraft.clientSecret.trim();
    } else if (platformId === "feishu") {
      payload.appId = cfgDraft.appId.trim();
      payload.appSecret = cfgDraft.appSecret.trim();
      payload.domain = cfgDraft.domain || "feishu";
    } else if (platformId === "telegram") {
      payload.botToken = cfgDraft.botToken.trim();
      payload.proxy = cfgDraft.proxy.trim();
    }
    await act(BRIDGE_ENDPOINTS.platformSetConfig, payload);
  }, [act, cfgDraft, platformId]);
  const cfgDirty = cfgDraft && platform?.config && (Number(cfgDraft.digestIntervalSec) !== platform.config.digestIntervalSec || Number(cfgDraft.approvalTimeoutSec) !== platform.config.approvalTimeoutSec || Number(cfgDraft.maxMessageChars) !== platform.config.maxMessageChars || Number(cfgDraft.sendChunkDelayMs) !== platform.config.sendChunkDelayMs || platformId === "qq" && (cfgDraft.appId !== (platform.config.appId ?? "") || cfgDraft.clientSecret !== (platform.config.clientSecret ?? "")) || platformId === "feishu" && (cfgDraft.appId !== (platform.config.appId ?? "") || cfgDraft.appSecret !== (platform.config.appSecret ?? "")) || platformId === "telegram" && (cfgDraft.botToken !== "" || cfgDraft.proxy !== (platform.config.proxy ?? "")));
  if (!platform && !err) {
    return React.createElement(
      "div",
      { style: s.card },
      React.createElement("div", { style: s.label }, platformName),
      React.createElement("div", { style: { ...s.muted, marginTop: 6 } }, "\u52A0\u8F7D\u4E2D\u2026")
    );
  }
  const connected = platform?.status === "connected" || platform?.status === "starting" || platform?.status === "reconnecting";
  const login = platform?.login ?? {};
  const showQr = login.phase === "qr" || login.phase === "scaned";
  const statusLabel = platform?.status === "connected" ? "\u5DF2\u8FDE\u63A5" : platform?.status === "starting" ? "\u8FDE\u63A5\u4E2D\u2026" : platform?.status === "reconnecting" ? "\u91CD\u8FDE\u4E2D\u2026" : platform?.status === "paused" ? "\u6682\u505C\uFF08\u4F1A\u8BDD\u8FC7\u671F\uFF09" : platform?.status === "error" ? "\u9519\u8BEF" : "\u672A\u8FDE\u63A5";
  return React.createElement(
    "div",
    { style: s.card },
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      React.createElement(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        React.createElement(
          "div",
          { style: { ...s.label, display: "flex", alignItems: "center", gap: 7 } },
          platformId === "wechat" && React.createElement(Icons.wechat, { style: { color: "#07C160", width: 20, height: 20 } }),
          platformId === "qq" && React.createElement(Icons.qq, { style: { color: "#12B7F5", width: 20, height: 20 } }),
          platformId === "feishu" && React.createElement(Icons.feishu, { style: { color: "#00D6B9", width: 20, height: 20 } }),
          platformId === "telegram" && React.createElement(Icons.telegram, { style: { color: "#24A1DE", width: 20, height: 20 } }),
          platformName
        ),
        React.createElement("div", { style: { ...s.muted, marginTop: 2 } }, platformDesc)
      ),
      React.createElement(StatusTag, { status: platform?.status, running: connected })
    ),
    // 快捷入口：使用说明 / 开放平台 / 命令速查
    React.createElement(
      "div",
      { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" } },
      platformId === "wechat" && React.createElement("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/wechat-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} \u5FAE\u4FE1\u4F7F\u7528\u8BF4\u660E"),
      platformId === "qq" && React.createElement("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/qq-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} QQ \u4F7F\u7528\u8BF4\u660E"),
      platformId === "qq" && React.createElement("a", {
        href: "https://bot.q.qq.com/wiki/develop/api-v2/",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F310} QQ \u5F00\u653E\u5E73\u53F0"),
      platformId === "feishu" && React.createElement("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/feishu-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} \u98DE\u4E66\u4F7F\u7528\u8BF4\u660E"),
      platformId === "feishu" && React.createElement("a", {
        href: "https://open.feishu.cn/app",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F310} \u98DE\u4E66\u5F00\u653E\u5E73\u53F0"),
      platformId === "telegram" && React.createElement("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/telegram-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} Telegram \u4F7F\u7528\u8BF4\u660E"),
      platformId === "telegram" && React.createElement("a", {
        href: "https://t.me/BotFather",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F310} @BotFather \u7533\u8BF7 Bot"),
      React.createElement("button", {
        style: s.btnGhost,
        onClick: () => setShowHelp((v) => !v)
      }, showHelp ? "\u6536\u8D77\u547D\u4EE4" : "\u547D\u4EE4\u5217\u8868")
    ),
    // 命令速查
    showHelp && React.createElement(
      "div",
      { style: { ...s.block, fontSize: 12, lineHeight: 1.8, fontFamily: "monospace" } },
      React.createElement("div", null, "/new <\u63D0\u793A\u8BCD> \u2014 \u65B0\u5EFA\u4F1A\u8BDD\u5E76\u5F00\u59CB\uFF08\u5F53\u524D\u5DE5\u4F5C\u533A\uFF09"),
      React.createElement("div", null, "/new <\u63D0\u793A\u8BCD> @N \u2014 \u5728\u6307\u5B9A\u5DE5\u4F5C\u533A\u65B0\u5EFA\u4F1A\u8BDD"),
      React.createElement("div", null, "/sessions\uFF08\u6216 /list\uFF09\u2014 \u5217\u51FA\u4F1A\u8BDD\uFF08\u6309\u5DE5\u4F5C\u533A\u5206\u7EC4\uFF0C\u5E26\u6807\u9898\uFF09"),
      React.createElement("div", null, "/use N\uFF08\u6216 /resume N\uFF09\u2014 \u5207\u6362\u5230\u4F1A\u8BDD N"),
      React.createElement("div", null, "/workspaces \u2014 \u5217\u51FA\u6240\u6709\u53EF\u7528\u5DE5\u4F5C\u533A"),
      React.createElement("div", null, "/end \u2014 \u7ED3\u675F\u5F53\u524D\u4F1A\u8BDD\uFF08\u56DE\u5230\u65E0\u6D3B\u52A8\u4F1A\u8BDD\u72B6\u6001\uFF09"),
      React.createElement("div", null, "/stop \u2014 \u505C\u6B62\u5F53\u524D\u4EFB\u52A1"),
      React.createElement("div", null, "/status \u2014 \u67E5\u770B Agent \u72B6\u6001\u4E0E\u4F1A\u8BDD\u6458\u8981"),
      React.createElement("div", null, "/yes \u6216 /no\uFF08\u6216 1/2\uFF09\u2014 \u56DE\u5E94\u6743\u9650\u5BA1\u6279\u8BF7\u6C42"),
      React.createElement("div", null, "/help \u2014 \u663E\u793A\u5B8C\u6574\u547D\u4EE4\u5E2E\u52A9")
    ),
    err && React.createElement("div", { style: { ...s.warn, marginTop: 10 } }, err),
    // 已配置：结构化状态看板 + 白名单
    platform?.configured && React.createElement(
      "div",
      { style: s.block },
      // 结构化状态卡片看板
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
            marginBottom: 12
          }
        },
        React.createElement(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          React.createElement("div", { style: { ...s.muted, fontSize: 11 } }, "\u8FDE\u63A5\u72B6\u6001"),
          React.createElement(
            "div",
            { style: { ...s.label, fontSize: 13, marginTop: 2, display: "flex", alignItems: "center", gap: 6 } },
            React.createElement("span", {
              style: {
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "var(--dsw-alias-state-success-primary,#10b981)" : "var(--dsw-alias-label-tertiary,#9ca3af)"
              }
            }),
            statusLabel
          )
        ),
        platform.accountId && React.createElement(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          React.createElement("div", { style: { ...s.muted, fontSize: 11 } }, "\u767B\u5F55\u8D26\u53F7"),
          React.createElement("div", { style: { ...s.code, fontSize: 12, marginTop: 2, fontWeight: 500 } }, platform.accountId)
        ),
        platform.sessionId && React.createElement(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          React.createElement("div", { style: { ...s.muted, fontSize: 11 } }, "\u6D3B\u52A8\u4F1A\u8BDD"),
          React.createElement("div", { style: { ...s.code, fontSize: 12, marginTop: 2 } }, platform.sessionId)
        )
      ),
      React.createElement(
        "div",
        { style: { ...s.muted, fontSize: 12, marginTop: 8, lineHeight: 1.6 } },
        `\u767D\u540D\u5355 (\u5DF2\u6388\u6743 ${platform.allowFrom?.length || 0} \u4E2A\u8D26\u53F7/\u7FA4):`
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 } },
        platform.allowFrom?.length ? platform.allowFrom.map(
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
        ) : React.createElement(
          "div",
          { style: { ...s.muted, fontSize: 12 } },
          platformId === "wechat" ? "(\u7A7A \u2014 \u626B\u7801\u540E\u9996\u4E2A\u53D1\u6D88\u606F\u7684\u5FAE\u4FE1\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)" : "(\u7A7A \u2014 \u9996\u4E2A\u53D1\u6D88\u606F\u7684\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)"
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 8, alignItems: "center" } },
        React.createElement("input", {
          style: { ...s.input, flex: 1 },
          placeholder: platformId === "wechat" ? "\u6DFB\u52A0\u5141\u8BB8\u7684\u5FAE\u4FE1 ID\uFF08\u5982 xxx@im.wechat\uFF09\uFF0C\u6309 Enter \u6DFB\u52A0" : "\u6DFB\u52A0\u5141\u8BB8\u7684\u7528\u6237/\u7FA4 ID\uFF0C\u6309 Enter \u6DFB\u52A0",
          value: newId,
          onChange: handleNewId,
          onKeyDown: (e) => {
            if (e.key === "Enter" && newId.trim() && !busy) addAllow();
          }
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
        platform.status !== "connected" && platform.status !== "starting" && React.createElement("button", { style: s.btnPri, onClick: onLogin, disabled: busy }, "\u91CD\u65B0\u8FDE\u63A5"),
        (platform.status === "connected" || platform.status === "starting") && React.createElement("button", { style: s.btnGhost, onClick: onStop, disabled: busy }, "\u65AD\u5F00"),
        React.createElement("button", {
          style: { ...s.btnGhost, color: "var(--dsw-alias-state-error-primary,#dc2626)", borderColor: "var(--dsw-alias-state-error-primary,#dc2626)", opacity: busy ? 0.5 : 1 },
          disabled: busy,
          onClick: () => {
            if (window.confirm("\u786E\u8BA4\u89E3\u7ED1\uFF1F\u8FD9\u5C06\u6E05\u9664\u4FDD\u5B58\u7684\u51ED\u8BC1\u3002")) act(BRIDGE_ENDPOINTS.platformUnbind, {});
          },
          title: "\u6E05\u9664\u767B\u5F55\u51ED\u8BC1\uFF0C\u4E0B\u6B21\u9700\u91CD\u65B0\u914D\u7F6E"
        }, "\u89E3\u7ED1\u8D26\u53F7")
      ),
      // 飞书 / Telegram 扫码直达对话引导卡片
      (platformId === "feishu" || platformId === "telegram") && platform.botQr && React.createElement(
        "div",
        {
          style: {
            marginTop: 12,
            padding: 12,
            background: "var(--dsw-alias-bg-layer-1,#ffffff)",
            border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
            borderRadius: 8,
            display: "flex",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap"
          }
        },
        React.createElement("img", { src: platform.botQr, alt: `${platformName} Bot QR`, style: { width: 110, height: 110, borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", padding: 4, background: "#fff" } }),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 160 } },
          React.createElement("div", { style: { ...s.label, fontSize: 13, fontWeight: 600 } }, `\u{1F4F1} \u624B\u673A ${platformName} \u626B\u7801\u76F4\u8FBE\u5BF9\u8BDD`),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 12, marginTop: 4, lineHeight: 1.5 } },
            `\u7528 ${platformName} \u626B\u63CF\u5DE6\u4FA7\u4E8C\u7EF4\u7801\uFF0C\u7ACB\u5373\u6253\u5F00\u4E0E Bot \u5BF9\u8BDD\uFF1B\u53D1\u9001\u9996\u6761\u6D88\u606F\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002`
          ),
          platform.botLink && React.createElement(
            "div",
            { style: { display: "flex", gap: 8, marginTop: 8 } },
            React.createElement("a", {
              href: platform.botLink,
              target: "_blank",
              rel: "noopener noreferrer",
              style: { ...s.btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 12 }
            }, `\u5728 ${platformName} \u5BA2\u6237\u7AEF\u6253\u5F00 \u2197`)
          )
        )
      )
    ),
    // 未配置 / 登录中：表单（QQ / 飞书 / Telegram）或二维码（微信）
    (!platform?.configured || showQr) && React.createElement(
      "div",
      { style: s.block },
      showQr && login.qr ? React.createElement(
        "div",
        null,
        React.createElement("img", { src: login.qr, alt: "login QR", style: s.qr }),
        React.createElement(
          "div",
          { style: { ...s.muted, marginTop: 4 } },
          login.phase === "scaned" ? "\u5DF2\u626B\u7801\uFF0C\u8BF7\u5728\u624B\u673A\u4E0A\u786E\u8BA4\u2026" : platformId === "wechat" ? "\u8BF7\u4F7F\u7528\u5FAE\u4FE1\u626B\u7801\u767B\u5F55\uFF08ClawBot\uFF09" : "\u8BF7\u626B\u7801\u767B\u5F55"
        ),
        login.error && React.createElement("div", { style: { ...s.muted, marginTop: 4, color: "var(--dsw-alias-state-warn-primary,#92400e)" } }, login.error)
      ) : platformId === "qq" || platformId === "feishu" || platformId === "telegram" ? React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 4 } },
        platformId === "feishu" && React.createElement(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#ffffff)",
              border: "1px dashed var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 12,
              lineHeight: 1.5
            }
          },
          React.createElement("span", { style: s.label }, "\u{1F4A1} \u626B\u7801\u81EA\u52A8\u521B\u5EFA\u5F15\u5BFC\uFF1A"),
          React.createElement("span", { style: s.muted }, " \u53EF\u5728\u7EC8\u7AEF\u8FD0\u884C "),
          React.createElement("code", { style: { ...s.code, fontSize: 11, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", padding: "2px 4px", borderRadius: 4 } }, "npx feishu-bot-bootstrap"),
          React.createElement("span", { style: s.muted }, " \u624B\u673A\u626B\u7801\u4E00\u952E\u81EA\u52A8\u521B\u5EFA\u5E94\u7528\u5E76\u8F93\u51FA\u51ED\u8BC1\uFF1B\u6216\u5728\u4E0B\u65B9\u624B\u52A8\u586B\u5165\u51ED\u8BC1\u3002")
        ),
        platformId === "telegram" ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            null,
            React.createElement("div", { style: { ...s.muted, marginBottom: 4 } }, "Bot Token \u2014 Telegram @BotFather \u4E0B\u53D1\u7684\u673A\u5668\u4EBA Token"),
            React.createElement(
              "div",
              { style: { display: "flex", gap: 6, alignItems: "center" } },
              React.createElement("input", {
                style: { ...s.input, flex: 1 },
                type: showSecret ? "text" : "password",
                placeholder: "\u8BF7\u8F93\u5165 Telegram Bot Token (\u5982 123456789:ABCdef...)",
                value: cfgDraft?.botToken ?? "",
                onChange: (e) => setCfgDraft((d) => ({ ...d, botToken: e.target.value }))
              }),
              React.createElement("button", {
                style: { ...s.btnGhost, height: 32, padding: "0 10px", fontSize: 13, flexShrink: 0 },
                onClick: () => setShowSecret((v) => !v),
                type: "button",
                title: showSecret ? "\u9690\u85CF\u5BC6\u94A5" : "\u663E\u793A\u660E\u6587"
              }, showSecret ? "\u{1F648} \u9690\u85CF" : "\u{1F441}\uFE0F \u663E\u793A")
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("div", { style: { ...s.muted, marginBottom: 4 } }, "\u7F51\u7EDC\u4EE3\u7406 (\u53EF\u9009) \u2014 \u652F\u6301\u56FD\u5185 HTTP / HTTPS \u4EE3\u7406"),
            React.createElement("input", {
              style: { ...s.input, width: "100%" },
              placeholder: "\u53EF\u9009\uFF0C\u4F8B\u5982 http://127.0.0.1:7890\uFF08\u4E3A\u7A7A\u5219\u76F4\u8FDE\u6216\u8BFB\u53D6\u73AF\u5883\u53D8\u91CF\uFF09",
              value: cfgDraft?.proxy ?? "",
              onChange: (e) => setCfgDraft((d) => ({ ...d, proxy: e.target.value }))
            })
          )
        ) : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { ...s.muted, marginBottom: 4 } },
              platformId === "qq" ? "AppID \u2014 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u5E94\u7528 ID" : "App ID \u2014 \u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u81EA\u5EFA\u5E94\u7528 ID (cli_xxx)"
            ),
            React.createElement("input", {
              style: { ...s.input, width: "100%" },
              placeholder: platformId === "qq" ? "\u8BF7\u8F93\u5165 AppID" : "\u8BF7\u8F93\u5165 App ID (\u5982 cli_a1b2c3d4...)",
              value: cfgDraft?.appId ?? "",
              onChange: (e) => setCfgDraft((d) => ({ ...d, appId: e.target.value }))
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { ...s.muted, marginBottom: 4 } },
              platformId === "qq" ? "ClientSecret \u2014 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u5BC6\u94A5" : "App Secret \u2014 \u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u5E94\u7528\u5BC6\u94A5"
            ),
            React.createElement(
              "div",
              { style: { display: "flex", gap: 6, alignItems: "center" } },
              React.createElement("input", {
                style: { ...s.input, flex: 1 },
                type: showSecret ? "text" : "password",
                placeholder: platformId === "qq" ? "\u8BF7\u8F93\u5165 ClientSecret" : "\u8BF7\u8F93\u5165 App Secret",
                value: platformId === "qq" ? cfgDraft?.clientSecret ?? "" : cfgDraft?.appSecret ?? "",
                onChange: (e) => setCfgDraft((d) => platformId === "qq" ? { ...d, clientSecret: e.target.value } : { ...d, appSecret: e.target.value })
              }),
              React.createElement("button", {
                style: { ...s.btnGhost, height: 32, padding: "0 10px", fontSize: 13, flexShrink: 0 },
                onClick: () => setShowSecret((v) => !v),
                type: "button",
                title: showSecret ? "\u9690\u85CF\u5BC6\u94A5" : "\u663E\u793A\u660E\u6587"
              }, showSecret ? "\u{1F648} \u9690\u85CF" : "\u{1F441}\uFE0F \u663E\u793A")
            )
          )
        ),
        React.createElement(
          "div",
          null,
          React.createElement("a", {
            href: platformId === "qq" ? "https://bot.q.qq.com/wiki/develop/api-v2/" : platformId === "feishu" ? "https://open.feishu.cn/app" : "https://t.me/BotFather",
            target: "_blank",
            rel: "noopener noreferrer",
            style: s.btnLink
          }, platformId === "qq" ? "\u{1F4D6} \u524D\u5F80 QQ \u5F00\u653E\u5E73\u53F0\u7533\u8BF7\u673A\u5668\u4EBA" : "\u{1F4D6} \u524D\u5F80\u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u521B\u5EFA\u4F01\u4E1A\u81EA\u5EFA\u5E94\u7528")
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
          React.createElement("button", {
            style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
            onClick: saveConfig,
            disabled: busy || (platformId === "telegram" ? !cfgDraft?.botToken?.trim() : !cfgDraft?.appId?.trim() || (platformId === "qq" ? !cfgDraft?.clientSecret?.trim() : !cfgDraft?.appSecret?.trim()))
          }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u5E76\u8FDE\u63A5"),
          login.phase === "error" && React.createElement("div", { style: { ...s.muted, fontSize: 12 } }, login.error ?? "\u8FDE\u63A5\u5931\u8D25")
        )
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
    React.createElement(
      "div",
      { style: s.block },
      React.createElement(
        "div",
        { style: { ...s.tip, fontSize: 12 } },
        platformId === "wechat" ? "\u8BF4\u660E: \u626B\u7801\u6210\u529F\u540E\uFF0C\u5411\u8BE5\u5FAE\u4FE1 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u5FAE\u4FE1\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002\u4F7F\u7528\u4E13\u7528\u5FAE\u4FE1\u53F7\uFF0C\u907F\u514D\u5F71\u54CD\u4E3B\u53F7\u3002" : platformId === "qq" ? "\u8BF4\u660E: \u586B\u5165 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u7684 AppID \u4E0E ClientSecret \u540E\u4FDD\u5B58\u5373\u81EA\u52A8\u8FDE\u63A5\u3002\u7528\u6237\u5411 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684 QQ \u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002" : "\u8BF4\u660E: \u767B\u5F55\u6210\u529F\u540E\uFF0C\u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002"
      )
    )
  );
}
function UpgradeCommandRow({ cmd }) {
  const [copied, copy] = useCopy();
  return React.createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 8 } },
    React.createElement("code", {
      style: {
        ...s.code,
        fontSize: 11,
        color: "var(--dsw-alias-label-secondary,#6b7280)",
        flex: 1,
        minWidth: 0,
        wordBreak: "break-all",
        background: "var(--dsw-alias-bg-layer-1,#ffffff)",
        padding: "4px 8px",
        borderRadius: 6,
        border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)"
      }
    }, cmd),
    React.createElement("button", {
      style: { ...s.btnGhost, height: 26, padding: "0 10px", fontSize: 12, flexShrink: 0 },
      onClick: () => copy(cmd),
      title: "\u590D\u5236\u5347\u7EA7\u547D\u4EE4"
    }, copied ? "\u2713 \u5DF2\u590D\u5236" : "\u590D\u5236")
  );
}
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
  React.useEffect(() => {
    check();
  }, [check]);
  const hasUpdate = info?.latest && info?.current && !info.error && semverGt(info.latest, info.current);
  const isLatest = info?.latest && info?.current && !info.error && !semverGt(info.latest, info.current);
  const handleUpgrade = React.useCallback(async () => {
    if (!info?.latest || upgrading) return;
    setUpgrading(true);
    setUpgradeResult(null);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.upgradePlugin, { version: info.latest });
      if (r?.ok && r.value?.ok) {
        setUpgradeResult({ ok: true, message: `\u5DF2\u6210\u529F\u5347\u7EA7\u5230 v${info.latest}\uFF01\u8BF7\u91CD\u542F DSH \u670D\u52A1\u4F7F\u65B0\u7248\u672C\u751F\u6548\u3002` });
        setTimeout(() => check(), 3e3);
      } else {
        setUpgradeResult({ ok: false, message: r?.value?.error || r?.error?.message || "\u5347\u7EA7\u5931\u8D25" });
        setShowManual(true);
      }
    } catch (e) {
      setUpgradeResult({ ok: false, message: e.message || "\u5347\u7EA7\u8BF7\u6C42\u5931\u8D25" });
      setShowManual(true);
    } finally {
      setUpgrading(false);
    }
  }, [info?.latest, upgrading, rpcCall, check]);
  const links = React.createElement(
    "div",
    { style: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" } },
    React.createElement("a", {
      href: GITHUB_URL,
      target: "_blank",
      rel: "noreferrer",
      style: s.btnLink
    }, React.createElement(Icons.github), "GitHub"),
    React.createElement("a", {
      href: RELEASES_URL,
      target: "_blank",
      rel: "noreferrer",
      style: s.btnLink
    }, "\u66F4\u65B0\u65E5\u5FD7"),
    React.createElement("a", {
      href: ISSUES_URL,
      target: "_blank",
      rel: "noreferrer",
      style: s.btnLink
    }, "\u53CD\u9988 Issue")
  );
  return React.createElement(
    "div",
    { style: { marginBottom: 16 } },
    // 顶部状态行：版本徽标 + 刷新按钮 + 链接组
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8
        }
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        // 版本状态徽标
        React.createElement(
          "span",
          {
            style: {
              ...s.tag,
              background: hasUpdate ? "var(--dsw-alias-state-info-bg,#eff6ff)" : isLatest ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              color: hasUpdate ? "var(--dsw-alias-state-info-primary,#2563eb)" : isLatest ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-label-secondary,#6b7280)",
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }
          },
          loading ? React.createElement("span", {
            style: { display: "inline-flex", alignItems: "center" }
          }, React.createElement(Icons.refresh)) : isLatest ? React.createElement(Icons.check) : null,
          info ? `v${info.current}` : "\u7248\u672C\u68C0\u67E5\u4E2D\u2026",
          isLatest && React.createElement("span", { style: { opacity: 0.85, fontSize: 11, fontWeight: 400 } }, "\xB7 \u5DF2\u662F\u6700\u65B0"),
          hasUpdate && React.createElement("span", { style: { fontWeight: 600, fontSize: 11 } }, `\u2794 v${info.latest}`),
          info?.error && React.createElement("span", { style: { color: "var(--dsw-alias-state-warn-primary,#d97706)", fontSize: 11 } }, "(\u7F51\u7EDC\u8D85\u65F6)")
        ),
        // 刷新检查按钮
        React.createElement(
          "button",
          {
            style: {
              ...s.btnGhost,
              height: 24,
              padding: "0 8px",
              fontSize: 11,
              opacity: loading ? 0.5 : 1,
              gap: 4
            },
            onClick: check,
            disabled: loading || upgrading,
            title: "\u91CD\u65B0\u68C0\u67E5 npm \u7EBF\u4E0A\u7248\u672C"
          },
          React.createElement(Icons.refresh),
          loading ? "\u68C0\u67E5\u4E2D\u2026" : "\u68C0\u67E5\u66F4\u65B0"
        )
      ),
      links
    ),
    // 发现新版本高亮卡片（支持一键直接升级）
    hasUpdate && React.createElement(
      "div",
      {
        style: {
          ...s.card,
          background: "var(--dsw-alias-state-info-bg,#eff6ff)",
          border: "1px solid var(--dsw-alias-state-info-border,#bfdbfe)",
          padding: "14px 16px",
          marginTop: 10,
          marginBottom: 0
        }
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "flex-start", gap: 12 } },
        React.createElement("span", { style: { fontSize: 22 } }, "\u{1F680}"),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 } },
            React.createElement("div", {
              style: {
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dsw-alias-state-info-primary,#1e40af)"
              }
            }, `\u53D1\u73B0\u65B0\u7248\u672C v${info.latest}\uFF08\u5F53\u524D v${info.current}\uFF09`),
            React.createElement(
              "button",
              {
                style: {
                  ...s.btnPri,
                  height: 28,
                  fontSize: 12,
                  padding: "0 14px",
                  background: upgradeResult?.ok ? "var(--dsw-alias-state-success-primary,#059669)" : "var(--dsw-alias-brand-primary,#4f6ef7)",
                  opacity: upgrading ? 0.6 : 1
                },
                onClick: handleUpgrade,
                disabled: upgrading || upgradeResult?.ok
              },
              upgrading ? React.createElement(
                "span",
                { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
                React.createElement("span", { style: { animation: "spin 1s linear infinite", display: "inline-flex" } }, React.createElement(Icons.refresh)),
                "\u6B63\u5728\u81EA\u52A8\u5347\u7EA7\u2026"
              ) : upgradeResult?.ok ? "\u2713 \u5DF2\u5B8C\u6210\u5347\u7EA7" : `\u4E00\u952E\u5347\u7EA7\u5230 v${info.latest}`
            )
          ),
          // 简短更新内容 / Release Notes 亮点展示
          info?.releaseNotes && React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                color: "var(--dsw-alias-label-primary, #374151)",
                background: "var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.85))",
                border: "1px solid var(--dsw-alias-state-info-border, rgba(191, 219, 254, 0.8))",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 10,
                lineHeight: 1.6,
                whiteSpace: "pre-line"
              }
            },
            React.createElement("div", { style: { fontWeight: 600, color: "var(--dsw-alias-state-info-primary, #2563eb)", marginBottom: 2 } }, "\u2728 \u66F4\u65B0\u4EAE\u70B9\uFF1A"),
            info.releaseNotes
          ),
          upgradeResult && React.createElement("div", {
            style: {
              background: upgradeResult.ok ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-state-error-bg,#fef2f2)",
              border: `1px solid ${upgradeResult.ok ? "var(--dsw-alias-state-success-border,#a7f3d0)" : "var(--dsw-alias-state-error-border,#fecaca)"}`,
              color: upgradeResult.ok ? "var(--dsw-alias-state-success-primary,#065f46)" : "var(--dsw-alias-state-error-primary,#991b1b)",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 12,
              marginBottom: 8,
              lineHeight: 1.5
            }
          }, upgradeResult.message),
          React.createElement(
            "div",
            { style: { marginTop: 4 } },
            React.createElement("button", {
              style: { ...s.btnLink, fontSize: 11, color: "var(--dsw-alias-label-secondary,#6b7280)" },
              onClick: () => setShowManual((v) => !v)
            }, showManual ? "\u25B4 \u6298\u53E0\u624B\u52A8\u547D\u4EE4\u884C" : "\u25BE \u67E5\u770B\u624B\u52A8\u5347\u7EA7\u547D\u4EE4 (\u5982\u9700)")
          ),
          showManual && React.createElement(
            "div",
            {
              style: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }
            },
            upgradeCommands(info.latest).map(
              ({ id, cmd }) => React.createElement(UpgradeCommandRow, { key: id, cmd })
            )
          )
        )
      )
    )
  );
}
var TABS = [
  { id: "lan", label: "\u5C40\u57DF\u7F51", icon: Icons.lan },
  { id: "tunnel", label: "\u516C\u7F51\u96A7\u9053", icon: Icons.tunnel },
  { id: "im", label: "IM \u673A\u5668\u4EBA", icon: Icons.bot },
  { id: "security", label: "\u5B89\u5168\u8BA4\u8BC1", icon: Icons.security }
];
function TabBar({ active, onChange, dots }) {
  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        gap: 4,
        marginBottom: 20,
        borderBottom: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        maxWidth: "100%",
        flexWrap: "nowrap"
      }
    },
    TABS.map(({ id, label, icon: TabIcon }) => {
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
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-secondary,#6b7280)",
            borderBottom: isActive ? "2px solid var(--dsw-alias-brand-primary,#4f6ef7)" : "2px solid transparent",
            marginBottom: -1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "color .15s, border-color .15s",
            whiteSpace: "nowrap",
            flexShrink: 0
          }
        },
        TabIcon && React.createElement(TabIcon, {
          style: {
            color: isActive ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-tertiary,#9ca3af)",
            width: 16,
            height: 16,
            flexShrink: 0
          }
        }),
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
  const [platforms, setPlatforms] = React.useState(null);
  const [selectedPlatform, setSelectedPlatform] = React.useState("wechat");
  const isLocalhost = typeof window === "undefined" || (!window.location.hostname || window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" || window.location.hostname === "::1" || window.location.hostname === "" || window.location.protocol === "file:" || window.location.protocol === "vscode-webview:" || window.location.protocol === "app:" || window.location.hostname.endsWith(".local"));
  const [adminToken, setAdminToken] = React.useState("");
  const [adminUnlocked, setAdminUnlocked] = React.useState(false);
  const [unlockPassword, setUnlockPassword] = React.useState("");
  const [unlockErr, setUnlockErr] = React.useState(null);
  const [unlocking, setUnlocking] = React.useState(false);
  const [showForgotGuide, setShowForgotGuide] = React.useState(false);
  const [showUnlockModal, setShowUnlockModal] = React.useState(false);
  const fetchLoopbackToken = React.useCallback(async () => {
    if (!isLocalhost) return null;
    const currentPort = typeof window !== "undefined" ? window.location.port || (window.location.protocol === "https:" ? "443" : "80") : "3082";
    const proxyPort = status?.proxy?.port || 3082;
    const candidateUrls = [
      "/__dsh_bridge__/loopback-token",
      `http://127.0.0.1:${proxyPort}/__dsh_bridge__/loopback-token`,
      `http://localhost:${proxyPort}/__dsh_bridge__/loopback-token`,
      "http://127.0.0.1:3082/__dsh_bridge__/loopback-token"
    ];
    const uniqueUrls = [...new Set(candidateUrls)];
    for (const url of uniqueUrls) {
      try {
        const res = await fetch(url, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.adminToken) {
            setAdminToken(data.adminToken);
            setAdminUnlocked(true);
            return data.adminToken;
          }
        }
      } catch {
      }
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
      ...token ? { adminToken: token } : {},
      ...isLocalhost ? { isLocalhost: true } : {}
    };
    const res = await rpcCall(endpoint, enriched, signal);
    if (res?.ok === false) {
      const msg = res?.error?.message || "";
      if (msg.includes("\u7BA1\u7406\u5458\u6743\u9650") || msg.includes("\u7BA1\u7406\u5BC6\u7801\u89E3\u9501")) {
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
        setAdminToken(res.value?.adminToken || "");
        setAdminUnlocked(true);
        setUnlockPassword("");
        setShowUnlockModal(false);
        setErr(null);
      } else {
        setUnlockErr(res?.error?.message || "\u7BA1\u7406\u5458\u5BC6\u7801\u9519\u8BEF");
      }
    } catch (err2) {
      setUnlockErr(err2.message || "\u89E3\u9501\u8BF7\u6C42\u5931\u8D25");
    } finally {
      setUnlocking(false);
    }
  }, [rpcCall, unlockPassword]);
  const handleLockAdmin = React.useCallback(async () => {
    try {
      if (adminToken) {
        await rpcCall(BRIDGE_ENDPOINTS.authAdminLock, { adminToken });
      }
    } catch {
    }
    setAdminToken("");
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
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setStatus(r.value);
      if (!quiet) setErr(null);
    } catch (e) {
      if (currentSeq === loadSeqRef.current) setErr(e.message);
    } finally {
      loadInFlightRef.current = false;
    }
  }, [authRpcCall]);
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
      } catch {
      } finally {
        inFlight = false;
      }
    };
    poll();
    const t = setInterval(poll, 4e3);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [authRpcCall]);
  React.useEffect(() => {
    load();
    const t = setInterval(() => load(true), 3e3);
    return () => clearInterval(t);
  }, [load]);
  const act = React.useCallback(async (endpoint, payload) => {
    try {
      const r = await authRpcCall(endpoint, payload ?? {});
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setStatus(r.value);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [authRpcCall]);
  const onStartCloudflared = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCloudflared), [act]);
  const onStopCloudflared = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCloudflared), [act]);
  const onResetCloudflared = React.useCallback(
    () => act(BRIDGE_ENDPOINTS.stopCloudflared).then(() => act(BRIDGE_ENDPOINTS.startCloudflared)),
    [act]
  );
  const onToggleCloudflaredAutoStart = React.useCallback(
    (autoStart) => act(BRIDGE_ENDPOINTS.setTunnelAutoStart, { tunnel: "cloudflared", autoStart }),
    [act]
  );
  const saveCloudflaredConfig = React.useCallback(
    ({ token, hostname }) => act(BRIDGE_ENDPOINTS.saveCloudflaredConfig, { token, hostname }),
    [act]
  );
  const onStartCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.startCustomTunnel), [act]);
  const onStopCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCustomTunnel), [act]);
  const onToggleCustomAutoStart = React.useCallback(
    (autoStart) => act(BRIDGE_ENDPOINTS.setTunnelAutoStart, { tunnel: "customTunnel", autoStart }),
    [act]
  );
  const saveConfig = React.useCallback(
    (serverUrl, accessToken) => act(BRIDGE_ENDPOINTS.saveCustomTunnelConfig, { serverUrl, accessToken }),
    [act]
  );
  const navSecurity = React.useCallback(() => setActiveTab("security"), []);
  if (!status && !err) {
    return React.createElement("div", {
      style: { padding: 32, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontSize: 13 }
    }, "\u52A0\u8F7D\u4E2D\u2026");
  }
  const ct = status?.customTunnel;
  const imConnected = platforms && Object.values(platforms).some(
    (p) => p.status === "connected" || p.status === "starting" || p.status === "reconnecting"
  );
  const dots = {
    lan: !!status?.proxy?.running,
    tunnel: !!(status?.cloudflared?.running || ct?.running),
    im: !!imConnected,
    security: !!status?.auth?.enabled
  };
  let tabContent;
  if (activeTab === "lan") {
    tabContent = React.createElement(TunnelCard, {
      title: "\u5C40\u57DF\u7F51\u8BBF\u95EE",
      desc: "\u540C\u4E00 Wi-Fi \u4E0B\u7684\u8BBE\u5907\u53EF\u76F4\u63A5\u626B\u7801\u8BBF\u95EE",
      data: { running: status?.proxy?.running, url: status?.lan?.url, qr: status?.lan?.qr },
      auth: status?.auth,
      onNavigateSecurity: navSecurity
    });
  } else if (activeTab === "tunnel") {
    tabContent = React.createElement(
      React.Fragment,
      null,
      React.createElement(
        TunnelCard,
        {
          title: "Cloudflare \u96A7\u9053",
          desc: status?.cloudflared?.tokenConfigured ? "\u56FA\u5B9A\u57DF\u540D\u6A21\u5F0F\uFF08Token \u8FD0\u884C \xB7 \u91CD\u542F URL \u4FDD\u6301\u4E0D\u53D8\uFF09" : "\u4E00\u952E\u83B7\u53D6\u516C\u7F51\u5730\u5740\uFF08\u514D\u767B\u5F55\u4E34\u65F6\u968F\u673A\u57DF\u540D\uFF09",
          data: {
            running: status?.cloudflared?.running,
            url: status?.cloudflared?.url,
            qr: status?.cloudflared?.qr,
            state: status?.cloudflared?.state
          },
          autoStart: status?.cloudflared?.autoStart,
          onToggleAutoStart: onToggleCloudflaredAutoStart,
          auth: status?.auth,
          onNavigateSecurity: navSecurity,
          onStart: onStartCloudflared,
          onStop: onStopCloudflared,
          onReset: status?.cloudflared?.running ? onResetCloudflared : null
        },
        React.createElement(CloudflareConfigForm, {
          token: status?.cloudflared?.token ?? "",
          hostname: status?.cloudflared?.hostname ?? "",
          onSave: saveCloudflaredConfig
        })
      ),
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
          autoStart: ct?.autoStart,
          onToggleAutoStart: onToggleCustomAutoStart,
          auth: status?.auth,
          onNavigateSecurity: navSecurity,
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
  } else if (activeTab === "security") {
    tabContent = React.createElement(AccessAuthCard, {
      auth: status?.auth,
      rpcCall: authRpcCall,
      onUpdate: () => load(true)
    });
  } else if (activeTab === "im") {
    const IM_PLATFORMS = [
      { id: "wechat", label: "\u5FAE\u4FE1", icon: Icons.wechat, brandColor: "#07C160", desc: "ClawBot \u626B\u7801\u76F4\u8FDE \xB7 \u65E0\u9700\u516C\u7F51" },
      { id: "qq", label: "QQ", icon: Icons.qq, brandColor: "#12B7F5", desc: "\u5B98\u65B9\u673A\u5668\u4EBA \xB7 \u79C1\u804A/\u7FA4\u804A/\u6309\u94AE" },
      { id: "feishu", label: "\u98DE\u4E66", icon: Icons.feishu, brandColor: "#00D6B9", desc: "\u5B98\u65B9 WebSocket \u957F\u8FDE\u63A5 \xB7 \u514D\u516C\u7F51" },
      { id: "telegram", label: "Telegram", icon: Icons.telegram, brandColor: "#24A1DE", desc: "\u5B98\u65B9 Bot API" }
    ];
    tabContent = React.createElement(
      "div",
      null,
      // 平台选择器（可点击切换）
      React.createElement(
        "div",
        {
          style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }
        },
        IM_PLATFORMS.map(({ id, label, icon: IconComponent, brandColor, desc }) => {
          const platformData = platforms?.[id];
          const available = !!platformData;
          const active = platformData?.status === "connected" || platformData?.status === "starting" || platformData?.status === "reconnecting";
          return React.createElement(
            "div",
            {
              key: id,
              style: {
                flex: "1 1 135px",
                border: `1px solid ${selectedPlatform === id ? "var(--dsw-alias-brand-primary,#4f6ef7)" : active ? "var(--dsw-alias-state-success-primary,#10b981)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                borderRadius: 10,
                padding: "12px 14px",
                opacity: available ? 1 : 0.5,
                cursor: available ? "pointer" : "not-allowed",
                background: selectedPlatform === id ? "var(--dsw-alias-state-info-bg,#eff6ff)" : active ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                boxShadow: selectedPlatform === id ? "0 0 0 1px var(--dsw-alias-brand-primary,#4f6ef7)" : "none",
                transition: "all 0.15s ease"
              },
              onClick: available ? () => setSelectedPlatform(id) : void 0
            },
            React.createElement(
              "div",
              { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" } },
              React.createElement(
                "span",
                { style: { display: "flex", alignItems: "center", gap: 7 } },
                IconComponent && React.createElement(IconComponent, { style: { color: brandColor, width: 18, height: 18, flexShrink: 0 } }),
                label
              ),
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
            React.createElement("div", { style: { ...s.muted, marginTop: 4, fontSize: 11 } }, desc)
          );
        })
      ),
      // 显示选中的平台卡片（带有 key 保证切换时重置表单状态）
      selectedPlatform && platforms?.[selectedPlatform] && React.createElement(PlatformCard, {
        key: selectedPlatform,
        platformId: selectedPlatform,
        platformName: IM_PLATFORMS.find((p) => p.id === selectedPlatform)?.label ?? selectedPlatform,
        platformDesc: IM_PLATFORMS.find((p) => p.id === selectedPlatform)?.desc ?? "",
        rpcCall: authRpcCall,
        onStatusChange: () => {
        }
        // 状态变化已由 listPlatforms 轮询处理，不需要回调
      })
    );
  }
  const auth = status?.auth;
  const policy = auth?.adminPolicy ?? "password_unlock";
  const isLocked = !isLocalhost && auth?.enabled && policy !== "open" && !adminUnlocked;
  if (isLocked) {
    return React.createElement(
      "div",
      { style: { maxWidth: 620 } },
      policy === "local_only" ? React.createElement(
        "div",
        {
          style: { ...s.card, textAlign: "center", padding: "36px 20px", marginTop: 10 }
        },
        React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\u{1F6E1}\uFE0F"),
        React.createElement("div", { style: { ...s.label, fontSize: 16, fontWeight: 600, marginBottom: 8 } }, "\u7BA1\u7406\u63A7\u5236\u53F0\u5DF2\u9501\u5B9A\uFF08\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\uFF09"),
        React.createElement(
          "div",
          { style: { ...s.muted, maxWidth: 420, margin: "0 auto", lineHeight: 1.6, fontSize: 13 } },
          "\u5F53\u524D\u8BBE\u5907\u901A\u8FC7\u8FDC\u7A0B\u5C40\u57DF\u7F51\u6216\u516C\u7F51\u63A5\u5165\u3002\u5DF2\u5F00\u542F\u300C\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\u300D\u6700\u9AD8\u5B89\u5168\u7B56\u7565\uFF0C\u8FDC\u7A0B\u8BBE\u5907\u7981\u6B62\u67E5\u770B\u4E0E\u4FEE\u6539\u4EFB\u4F55\u7F51\u7EDC\u4E0E\u673A\u5668\u4EBA\u914D\u7F6E\u3002\u5982\u9700\u7BA1\u7406\u8BF7\u5728\u7535\u8111\u672C\u673A\uFF08127.0.0.1\uFF09\u4E0A\u64CD\u4F5C\u3002"
        ),
        React.createElement(
          "div",
          { style: { marginTop: 20 } },
          React.createElement("button", {
            type: "button",
            style: { ...s.btnLink, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" },
            onClick: () => setShowForgotGuide((v) => !v)
          }, "\u2753 \u8FDC\u7A0B\u5982\u4F55\u6551\u6025\u89E3\u9664\u9501\u5B9A\uFF1F")
        ),
        showForgotGuide && React.createElement(
          "div",
          {
            style: {
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.6,
              background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              color: "var(--dsw-alias-label-secondary,#4b5563)",
              textAlign: "left",
              maxWidth: 420,
              margin: "14px auto 0"
            }
          },
          React.createElement("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", marginBottom: 4 } }, "\u{1F6DF} \u6551\u6025\u89E3\u9664\u9501\u5B9A\u6307\u5F15\uFF1A"),
          React.createElement("div", null, "1. ", React.createElement("strong", null, "\u7535\u8111\u672C\u673A\u76F4\u8FDE\u4FEE\u6539"), "\uFF1A\u76F4\u63A5\u5728\u8FD0\u884C\u672C\u7A0B\u5E8F\u7684\u7535\u8111\u672C\u673A\u6253\u5F00\u672C\u63A7\u5236\u53F0\uFF08127.0.0.1 \u4EAB\u6709\u7269\u7406\u514D\u9501\u7279\u6743\uFF09\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u7B56\u7565\u6216\u6E05\u9664\u5BC6\u7801\u3002"),
          React.createElement("div", { style: { marginTop: 4 } }, "2. ", React.createElement("strong", null, "\u670D\u52A1\u5668\u6551\u6025\u6307\u4EE4"), "\uFF1A\u5728\u5BBF\u4E3B\u7535\u8111/\u670D\u52A1\u5668\u7EC8\u7AEF\u6267\u884C ", React.createElement("code", { style: s.code }, "touch ~/.dsh/dsh-bridge/reset-auth"), " \u5373\u53EF\u77AC\u95F4\u6E05\u7A7A\u5BC6\u7801\u6062\u590D\u521D\u59CB\u72B6\u6001\u3002")
        )
      ) : React.createElement(
        "div",
        {
          style: { ...s.card, maxWidth: 440, margin: "20px auto", padding: "32px 24px" }
        },
        React.createElement(
          "div",
          { style: { textAlign: "center", marginBottom: 20 } },
          React.createElement("div", { style: { fontSize: 40, marginBottom: 10 } }, "\u{1F512}"),
          React.createElement("div", { style: { ...s.label, fontSize: 16, fontWeight: 600 } }, "\u7BA1\u7406\u63A7\u5236\u53F0\u5DF2\u9501\u5B9A"),
          React.createElement(
            "div",
            { style: { ...s.muted, fontSize: 12, marginTop: 6, lineHeight: 1.5 } },
            "\u5F53\u524D\u8BBE\u5907\u4E3A\u8FDC\u7A0B\u8BBF\u95EE\u3002\u4E3A\u4FDD\u62A4\u60A8\u7684\u7F51\u7EDC\u4E0E\u5E73\u53F0\u914D\u7F6E\u5B89\u5168\uFF0C\u8BF7\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u7801\u89E3\u9501\u7BA1\u7406\u6743\u9650\u3002"
          )
        ),
        React.createElement(
          "form",
          {
            onSubmit: handleUnlockAdmin,
            style: { display: "flex", flexDirection: "column", gap: 12 }
          },
          React.createElement("input", {
            type: "password",
            style: s.input,
            placeholder: "\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801",
            value: unlockPassword,
            onChange: (e) => setUnlockPassword(e.target.value),
            autoFocus: true
          }),
          unlockErr && React.createElement("div", {
            style: { fontSize: 12, color: "var(--dsw-alias-state-error-primary,#dc2626)" }
          }, unlockErr),
          React.createElement("button", {
            type: "submit",
            style: { ...s.btnPri, width: "100%", justifyContent: "center", height: 36, background: "#4f6ef7", color: "#ffffff" },
            disabled: unlocking
          }, unlocking ? "\u9A8C\u8BC1\u4E2D\u2026" : "\u89E3\u9501\u7BA1\u7406\u6743\u9650")
        ),
        React.createElement(
          "div",
          { style: { marginTop: 16, textAlign: "center" } },
          React.createElement("button", {
            type: "button",
            style: { ...s.btnLink, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" },
            onClick: () => setShowForgotGuide((v) => !v)
          }, "\u2753 \u5FD8\u8BB0\u540E\u53F0\u7BA1\u7406\u5BC6\u7801\uFF1F")
        ),
        showForgotGuide && React.createElement(
          "div",
          {
            style: {
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.6,
              background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              color: "var(--dsw-alias-label-secondary,#4b5563)",
              textAlign: "left"
            }
          },
          React.createElement("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", marginBottom: 4 } }, "\u{1F6DF} \u627E\u56DE\u4E0E\u91CD\u7F6E\u5BC6\u7801\u6307\u5F15\uFF1A"),
          React.createElement("div", null, "1. ", React.createElement("strong", null, "\u7535\u8111\u672C\u673A\u76F4\u8FDE\u4FEE\u6539"), "\uFF1A\u76F4\u63A5\u5728\u8FD0\u884C\u672C\u7A0B\u5E8F\u7684\u7535\u8111\u672C\u673A\u6253\u5F00\u672C\u63A7\u5236\u53F0\uFF08127.0.0.1 \u4EAB\u6709\u7269\u7406\u514D\u9501\u7279\u6743\uFF09\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u7BA1\u7406\u5BC6\u7801\u3002"),
          React.createElement("div", { style: { marginTop: 4 } }, "2. ", React.createElement("strong", null, "\u670D\u52A1\u5668\u6551\u6025\u6307\u4EE4"), "\uFF1A\u5728\u5BBF\u4E3B\u7535\u8111\u7EC8\u7AEF\u6267\u884C ", React.createElement("code", { style: s.code }, "touch ~/.dsh/dsh-bridge/reset-auth"), " \u5373\u53EF\u77AC\u95F4\u6E05\u7A7A\u5BC6\u7801\u6062\u590D\u521D\u59CB\u72B6\u6001\u3002")
        )
      )
    );
  }
  const isInterceptionErr = err && (err.includes("\u7BA1\u7406\u5458\u6743\u9650") || err.includes("\u7BA1\u7406\u5BC6\u7801\u89E3\u9501"));
  return React.createElement(
    "div",
    { style: { maxWidth: 620, position: "relative" } },
    // 错误横幅（如果是权限拦截，直接提供醒目的输入密码解锁按钮）
    err && React.createElement(
      "div",
      {
        style: {
          ...s.card,
          background: "var(--dsw-alias-state-error-bg,#fef2f2)",
          color: "var(--dsw-alias-state-error-primary,#dc2626)",
          fontSize: 13,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10
        }
      },
      React.createElement("span", { style: { flex: "1 1 auto" } }, err),
      isInterceptionErr && React.createElement("button", {
        type: "button",
        style: { ...s.btnPri, background: "#dc2626", color: "#ffffff", height: 26, fontSize: 12, padding: "0 10px", flexShrink: 0 },
        onClick: () => {
          setUnlockErr(err);
          setShowUnlockModal(true);
        }
      }, "\u{1F511} \u7ACB\u5373\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501")
    ),
    // 管理员解锁状态提示条
    !isLocalhost && adminUnlocked && React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "var(--dsw-alias-state-info-bg,#eff6ff)",
          border: "1px solid var(--dsw-alias-brand-primary,#4f6ef7)",
          borderRadius: 8,
          marginBottom: 14,
          fontSize: 12,
          color: "var(--dsw-alias-brand-primary,#4f6ef7)"
        }
      },
      React.createElement("span", null, "\u{1F513} \u7BA1\u7406\u5458\u6743\u9650\u5DF2\u89E3\u9501\uFF08\u5F53\u524D\u4E34\u65F6\u4F1A\u8BDD\u6709\u6548\uFF09"),
      React.createElement("button", {
        style: { ...s.btnGhost, height: 24, fontSize: 11, padding: "0 8px" },
        onClick: handleLockAdmin
      }, "\u{1F512} \u91CD\u65B0\u9501\u5B9A\u540E\u53F0")
    ),
    // 未解锁时的顶部引导条
    !isLocalhost && !adminUnlocked && auth?.enabled && policy !== "open" && React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "var(--dsw-alias-state-warn-bg,#fffbeb)",
          border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)",
          borderRadius: 8,
          marginBottom: 14,
          fontSize: 12,
          color: "var(--dsw-alias-state-warn-primary,#92400e)"
        }
      },
      React.createElement("span", null, "\u{1F512} \u540E\u53F0\u7BA1\u7406\u6743\u9650\u672A\u89E3\u9501\uFF08\u4FEE\u6539\u654F\u611F\u914D\u7F6E\u9700\u5148\u89E3\u9501\uFF09"),
      React.createElement("button", {
        type: "button",
        style: { ...s.btnPri, height: 24, fontSize: 11, padding: "0 10px", background: "#d97706" },
        onClick: () => setShowUnlockModal(true)
      }, "\u{1F511} \u89E3\u9501\u7BA1\u7406\u6743\u9650")
    ),
    React.createElement(VersionBanner, { rpcCall: authRpcCall }),
    React.createElement(TabBar, { active: activeTab, onChange: setActiveTab, dots }),
    tabContent,
    // 全局交互式解锁弹窗 Modal
    showUnlockModal && React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16
        },
        onClick: (e) => {
          if (e.target === e.currentTarget) setShowUnlockModal(false);
        }
      },
      React.createElement(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-1,#ffffff)",
            borderRadius: 14,
            padding: "24px 24px",
            maxWidth: 420,
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)"
          }
        },
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } },
          React.createElement(
            "div",
            { style: { fontSize: 16, fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", display: "flex", alignItems: "center", gap: 8 } },
            "\u{1F512} \u89E3\u9501\u540E\u53F0\u7BA1\u7406\u6743\u9650"
          ),
          React.createElement("button", {
            type: "button",
            style: { border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "var(--dsw-alias-label-tertiary,#9ca3af)", padding: 0 },
            onClick: () => setShowUnlockModal(false)
          }, "\u2715")
        ),
        React.createElement(
          "div",
          { style: { fontSize: 13, color: "var(--dsw-alias-label-secondary,#4b5563)", marginBottom: 16, lineHeight: 1.5 } },
          "\u5F53\u524D\u64CD\u4F5C\u9700\u8981\u540E\u53F0\u7BA1\u7406\u5458\u6743\u9650\u3002\u4E3A\u4FDD\u62A4\u60A8\u7684\u7F51\u7EDC\u914D\u7F6E\u4E0E\u673A\u5668\u4EBA\u5E73\u53F0\u5B89\u5168\uFF0C\u8BF7\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\uFF1A"
        ),
        React.createElement(
          "form",
          {
            onSubmit: handleUnlockAdmin,
            style: { display: "flex", flexDirection: "column", gap: 12 }
          },
          React.createElement("input", {
            type: "password",
            style: s.input,
            placeholder: "\u8BF7\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801",
            value: unlockPassword,
            onChange: (e) => setUnlockPassword(e.target.value),
            autoFocus: true
          }),
          unlockErr && React.createElement("div", {
            style: { fontSize: 12, color: "var(--dsw-alias-state-error-primary,#dc2626)" }
          }, unlockErr),
          React.createElement(
            "div",
            { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 } },
            React.createElement("button", {
              type: "button",
              style: s.btnGhost,
              onClick: () => setShowUnlockModal(false)
            }, "\u53D6\u6D88"),
            React.createElement("button", {
              type: "submit",
              style: { ...s.btnPri, background: "#4f6ef7", color: "#fff" },
              disabled: unlocking || !unlockPassword
            }, unlocking ? "\u9A8C\u8BC1\u4E2D\u2026" : "\u7ACB\u5373\u89E3\u9501")
          )
        ),
        React.createElement(
          "div",
          { style: { marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--dsw-alias-border-l2,#f3f4f6)", fontSize: 11, color: "var(--dsw-alias-label-tertiary,#9ca3af)", textAlign: "center", lineHeight: 1.5 } },
          "\u{1F4A1} \u63D0\u793A\uFF1A\u82E5\u672A\u5355\u72EC\u914D\u7F6E\u7BA1\u7406\u5BC6\u7801\uFF0C\u8BF7\u8F93\u5165\u521D\u6B21\u8BBE\u7F6E\u7684\u8BBF\u95EE\u5BC6\u7801\uFF1B\u7535\u8111\u672C\u673A\uFF08127.0.0.1\uFF09\u8BBF\u95EE\u4EAB\u6709\u514D\u5BC6\u7BA1\u7406\u7279\u6743\u3002"
        )
      )
    )
  );
}
function injectMobileStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("dsh-bridge-mobile-styles")) return;
  const style = document.createElement("style");
  style.id = "dsh-bridge-mobile-styles";
  style.textContent = `
    /* DSH Bridge \u79FB\u52A8\u7AEF\u81EA\u9002\u5E94\u4E0E\u89E6\u63A7\u4EA4\u4E92\u589E\u5F3A\u6837\u5F0F */
    :root {
      --dsh-mobile-header-h: 52px;
      --dsh-mobile-safe-top: env(safe-area-inset-top, 0px);
      --dsh-mobile-safe-bottom: env(safe-area-inset-bottom, 0px);
    }

    @media (max-width: 768px) {
      /* 1. \u4E3B\u6846\u67B6\u4E3A Header \u817E\u51FA\u9876\u90E8\u7A7A\u95F4 */
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

      /* 2. \u9876\u90E8\u539F\u751F\u5BFC\u822A\u6761\uFF1A100% \u8FD8\u539F DeepSeek App (\u5DE6\u4FA7\u53CC\u6A2A\u7EBF\uFF0C\u53F3\u4FA7(+)\uFF0C\u4E2D\u95F4\u7559\u767D\uFF0C\u65E0\u591A\u4F59\u8BBE\u7F6E\u6309\u94AE) */
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
      }

      /* \u5DE6\u4FA7\u53CC\u6A2A\u7EBF\u6309\u94AE (DeepSeek App \u539F\u751F\u56FE\u6807) */
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
      }
      .dsh-header-menu-btn:active {
        opacity: 0.6;
      }

      /* \u53F3\u4FA7 (+) \u65B0\u5EFA\u4F1A\u8BDD\u6309\u94AE (DeepSeek App \u539F\u751F\u56FE\u6807) */
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
      }
      .dsh-header-new-btn:active {
        opacity: 0.6;
      }

      /* 3. \u4E2D\u95F4\u4E3B\u5185\u5BB9\u533A\u4E0E\u8F93\u5165\u6846 */
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

      /* \u8F93\u5165\u6846\u5E95\u5EA7\uFF1ADeepSeek App \u5C45\u4E2D\u53CA\u5E95\u90E8\u56FA\u5B9A */
      div[class*="wSkVaW_scrollBody"] {
        padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
      }

      /* \u8F93\u5165\u5361\u7247\uFF1ADeepSeek App \u5706\u89D2\u5927\u80F6\u56CA\u9020\u578B */
      div[class*="uV2eYG_card"] {
        border-radius: 26px !important;
        padding: 14px 16px 12px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgba(0, 0, 0, 0.07) !important;
        background: var(--dsw-alias-bg-layer-2, #f4f4f7) !important;
      }

      /* 4. \u539F\u751F\u4FA7\u8FB9\u680F\u62BD\u5C49\u5316 (Drawer) */
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
      }
      body.dsh-drawer-open div[class*="_sidebarCol"] {
        transform: translateX(0) !important;
        box-shadow: 4px 0 28px rgba(0, 0, 0, 0.25) !important;
      }

      /* \u62BD\u5C49\u5185\u90E8\uFF1A\u5F3A\u5236 100% \u5BBD\u5EA6\uFF0C\u9690\u85CF\u5197\u4F59\u6298\u53E0\u6309\u94AE */
      body.dsh-drawer-open div[class*="hHd-Xa_root"] {
        width: 100% !important;
        max-width: 100% !important;
      }
      div[class*="hHd-Xa_logoRow"] button[class*="hHd-Xa_toggle"] {
        display: none !important;
      }

      /* \u8BBE\u7F6E\u5F39\u7A97\u6253\u5F00\u65F6\u89E3\u9664\u62BD\u5C49\u9690\u85CF\u9650\u5236 */
      div[class*="_sidebarCol"]:has(div[class*="VOzbGW_overlay"]) {
        transform: none !important;
        width: 100vw !important;
        max-width: 100vw !important;
        background: transparent !important;
        box-shadow: none !important;
        pointer-events: none !important;
      }

      /* 5. \u534A\u900F\u660E\u80CC\u666F\u906E\u7F69 */
      .dsh-mobile-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 9999;
        display: none !important;
      }
      body.dsh-drawer-open .dsh-mobile-backdrop {
        display: block !important;
        pointer-events: auto !important;
      }

      /* 6. \u8BBE\u7F6E\u4E2D\u5FC3\u5168\u81EA\u9002\u5E94\u9002\u914D */
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

      /* \u8BBE\u7F6E\u4E2D\u5FC3\u9009\u9879\u884C\u624B\u673A\u81EA\u9002\u5E94\uFF08\u5782\u76F4\u6D41\u5F0F\uFF0C\u9632\u6587\u5B57\u5355\u5B57\u6298\u884C\uFF09 */
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

      /* 7. \u4EE3\u7801\u5757\u3001\u8868\u683C\u4E0E\u5FBD\u6807\u81EA\u9002\u5E94 */
      pre, code, pre > code, table {
        max-width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        font-size: 12.5px !important;
      }

      /* \u72B6\u6001\u5FBD\u6807\u4E0E\u836F\u4E38\u6309\u94AE\u6C38\u4E0D\u6298\u5B57 */
      span[style*="border-radius: 999"],
      span[style*="border-radius:999"] {
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        min-width: max-content !important;
      }

      /* \u4E8C\u7EF4\u7801\u4E0E\u56FE\u7247\u79FB\u52A8\u7AEF\u5F39\u6027\u7F29\u653E */
      img[alt="QR"], img[src^="data:image"] {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 8. \u786E\u4FDD\u6240\u6709 Popover \u5F39\u51FA\u83DC\u5355\u3001\u64CD\u4F5C\u6C14\u6CE1\u3001\u4E0B\u62C9\u6846\u4F4D\u4E8E\u62BD\u5C49\u4E4B\u4E0A\u4E14\u652F\u6301\u89E6\u63A7\u4EA4\u4E92 */
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

      /* 9. \u79FB\u52A8\u7AEF\u4FA7\u8FB9\u680F\uFF1A\u4F1A\u8BDD\u4E0E\u5DE5\u4F5C\u533A\u4E09\u70B9\u64CD\u4F5C\u6309\u94AE\u59CB\u7EC8\u6E05\u6670\u53EF\u89C1\u4E14\u6613\u4E8E\u70B9\u51FB */
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

      /* \u5168\u5C40 overlayLayer \u7EDD\u4E0D\u88AB\u67D3\u9ED1 */
      div[class*="overlayLayer"],
      div[class*="uV2eYG_overlayAnchor"] {
        background: transparent !important;
        pointer-events: none !important;
      }
      div[class*="overlayLayer"] > * {
        pointer-events: auto !important;
      }
    }

    @media (min-width: 769px) {
      .dsh-mobile-app-header,
      .dsh-mobile-backdrop {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}
function setupMobileExperience() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  injectMobileStyles();
  let header = document.querySelector(".dsh-mobile-app-header");
  if (!header) {
    header = document.createElement("header");
    header.className = "dsh-mobile-app-header";
    const leftBtn = document.createElement("button");
    leftBtn.className = "dsh-header-menu-btn";
    leftBtn.title = "\u6253\u5F00\u83DC\u5355";
    leftBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="3" y1="8" x2="21" y2="8"></line>
        <line x1="3" y1="15" x2="14" y2="15"></line>
      </svg>
    `;
    leftBtn.onclick = () => {
      const isOpen = document.body.classList.toggle("dsh-drawer-open");
      if (isOpen) {
        const collapsedToggle = document.querySelector('div[class*="hHd-Xa_collapsed"] button[class*="hHd-Xa_toggle"]');
        if (collapsedToggle) collapsedToggle.click();
      }
    };
    const rightBtn = document.createElement("button");
    rightBtn.className = "dsh-header-new-btn";
    rightBtn.title = "\u65B0\u5EFA\u4F1A\u8BDD";
    rightBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9.5"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    `;
    rightBtn.onclick = () => {
      const dshNewBtn = document.querySelector('button[aria-label="\u65B0\u5EFA\u4F1A\u8BDD"]');
      if (dshNewBtn) dshNewBtn.click();
    };
    header.appendChild(leftBtn);
    header.appendChild(rightBtn);
    document.body.appendChild(header);
  }
  let backdrop = document.querySelector(".dsh-mobile-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "dsh-mobile-backdrop";
    backdrop.addEventListener("click", () => {
      document.body.classList.remove("dsh-drawer-open");
    });
    document.body.appendChild(backdrop);
  }
  let lastLongPressTime = 0;
  document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("dsh-drawer-open")) return;
    if (Date.now() - lastLongPressTime < 600) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (e.target.closest('div[class*="portal"], div[class*="_portal"], div[role="menu"], div[role="dialog"], div[class*="popup"], div[class*="dropdown"], div[class*="overlay"]')) {
      return;
    }
    const sidebar = document.querySelector('div[class*="_sidebarCol"]');
    if (sidebar && sidebar.contains(e.target)) {
      if (e.target.closest('input, select, textarea, div[class*="searchInput"]')) {
        return;
      }
      const btn = e.target.closest('button, [role="button"]');
      if (btn) {
        const label = btn.getAttribute("aria-label") || btn.innerText || "";
        if (label.includes("\u64CD\u4F5C") || label.includes("\u89C6\u56FE") || label.includes("\u6DFB\u52A0") || label.includes("\u641C\u7D22") || label.includes("\u8BBE\u7F6E") || btn.matches('button[class*="toggle"], button[class*="trigger"], button[class*="iconButton"], button[class*="searchButton"]')) {
          return;
        }
        if (label.includes("\u65B0\u4F1A\u8BDD") || btn.matches('button[class*="newSession"]')) {
          document.body.classList.remove("dsh-drawer-open");
          return;
        }
      }
      const sessionRow = e.target.closest('div[class*="sessionRow"], div[role="treeitem"]');
      if (sessionRow) {
        document.body.classList.remove("dsh-drawer-open");
      }
    }
  }, true);
  let longPressTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;
  window.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
    if (!document.body.classList.contains("dsh-drawer-open")) return;
    const sidebar = document.querySelector('div[class*="_sidebarCol"]');
    if (!sidebar || !sidebar.contains(e.target)) return;
    const sessionRow = e.target.closest('div[class*="sessionRow"], div[role="treeitem"]');
    if (!sessionRow) return;
    longPressTimer = setTimeout(() => {
      lastLongPressTime = Date.now();
      try {
        if (navigator.vibrate) navigator.vibrate(40);
      } catch (_) {
      }
      const actionBtn = sessionRow.querySelector('button[aria-label*="\u64CD\u4F5C"], button[class*="iconButton"], button');
      if (actionBtn) {
        actionBtn.click();
      }
    }, 380);
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (longPressTimer && e.touches && e.touches.length > 0) {
      const moveX = Math.abs(e.touches[0].clientX - touchStartX);
      const moveY = Math.abs(e.touches[0].clientY - touchStartY);
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0 && touchStartX <= 35) {
        document.body.classList.add("dsh-drawer-open");
        const collapsedToggle = document.querySelector('div[class*="hHd-Xa_collapsed"] button[class*="hHd-Xa_toggle"]');
        if (collapsedToggle) collapsedToggle.click();
      } else if (deltaX < 0 && document.body.classList.contains("dsh-drawer-open")) {
        document.body.classList.remove("dsh-drawer-open");
      }
    }
  }, { passive: true });
}
function apply(ctx) {
  setupMobileExperience();
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
