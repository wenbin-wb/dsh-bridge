#!/bin/bash
# dsh-bridge 隧道服务端一键部署脚本
#
# 用法（零配置，全自动）：
#   bash <(curl -fsSL https://raw.githubusercontent.com/wenbin-wb/dsh-bridge/main/scripts/install-tunnel-server.sh)
#
# 自定义参数（可选，通过环境变量覆盖）：
#   PORT=8080 bash <(curl -fsSL ...)
#   TOKEN=my-token bash <(curl -fsSL ...)
#   DOMAIN=tunnel.example.com bash <(curl -fsSL ...)

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC}  $*"; }
info() { echo -e "  ${BLUE}·${NC}  $*"; }
warn() { echo -e "  ${YELLOW}!${NC}  $*"; }
die()  { echo -e "\n  ${RED}✗  错误：$*${NC}\n"; exit 1; }
step() { echo -e "\n${BOLD}$*${NC}"; }

INSTALL_DIR="/opt/dsh-tunnel"
SERVICE_NAME="dsh-tunnel"

[ "$(uname -s)" = "Linux" ] || die "本脚本仅支持 Linux"
[ "$EUID" -eq 0 ]           || die "请用 root 权限运行：sudo bash <(curl ...)"

clear
echo ""
echo -e "${BOLD}  dsh-bridge 隧道服务端  ·  一键部署${NC}"
echo -e "${DIM}  https://github.com/wenbin-wb/dsh-bridge${NC}"
echo -e "  ────────────────────────────────────────"

# ── 1/4 检测环境 ────────────────────────────────────────────────────────────
step "1/4  检测环境"

# 先杀掉旧进程，再检测端口——避免旧进程占着端口导致脚本选了新端口
info "清理旧进程..."
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl stop "$SERVICE_NAME" &>/dev/null
  ok "已停止旧 systemd 服务"
fi
OLD_PIDS=$(pgrep -f "$INSTALL_DIR/server.mjs" 2>/dev/null || true)
if [ -n "$OLD_PIDS" ]; then
  echo "$OLD_PIDS" | xargs kill -9 2>/dev/null || true
  ok "已终止残留进程"
fi
sleep 1  # 等端口释放

# 如果已有 .env，直接复用（重复执行时保留配置，不重新生成）
EXISTING_ENV="$INSTALL_DIR/.env"
if [ -f "$EXISTING_ENV" ] && [ -z "${FORCE_REINIT:-}" ]; then
  info "检测到已有配置，复用现有参数（令牌/路径/端口不变）"
  _read_env() { grep -E "^$1=" "$EXISTING_ENV" 2>/dev/null | head -1 | cut -d= -f2-; }
  AUTO_PORT="${PORT:-$(_read_env PORT)}"
  TOKEN="${TOKEN:-$(_read_env TOKEN)}"
  ACCESS_PATH="${ACCESS_PATH:-$(_read_env ACCESS_PATH)}"
  SAVED_PUBLIC_URL="$(_read_env PUBLIC_URL)"
  ok "复用端口：$AUTO_PORT"
  ok "复用令牌：（已保留）"
  ok "复用访问路径：/$ACCESS_PATH"
  IS_REINSTALL=true
else
  IS_REINSTALL=false
fi

# 端口（新安装时自动选择空闲端口，此时旧进程已清理，端口已释放）
AUTO_PORT="${AUTO_PORT:-3000}"
if [ "$IS_REINSTALL" = false ]; then
  if ss -tlnp 2>/dev/null | grep -q ":${AUTO_PORT} " || \
     netstat -tlnp 2>/dev/null | grep -q ":${AUTO_PORT} "; then
    for p in 3001 3002 3003 8080 8088 9000; do
      if ! ss -tlnp 2>/dev/null | grep -q ":${p} "; then
        AUTO_PORT=$p; break
      fi
    done
  fi
  info "服务端口：$AUTO_PORT"
fi

# 公网 IP
PUBLIC_IP=""
for svc in "ifconfig.me" "api.ipify.org" "ipinfo.io/ip" "icanhazip.com"; do
  PUBLIC_IP=$(curl -fsSL --connect-timeout 4 "$svc" 2>/dev/null | tr -d '[:space:]') && \
    [[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && break || PUBLIC_IP=""
done
[ -n "$PUBLIC_IP" ] && ok "公网 IP：$PUBLIC_IP" || warn "无法获取公网 IP，稍后手动修改配置"

# 随机访问路径（新安装时生成，重装时已从 .env 读取）
ACCESS_PATH="${ACCESS_PATH:-$(head -c 24 /dev/urandom | base64 | tr -d '+/=\n' | head -c 16)}"
[ "$IS_REINSTALL" = false ] && ok "访问路径：/$ACCESS_PATH（随机生成，保密）"

# 访问地址
if [ -n "${DOMAIN:-}" ]; then
  BASE_URL="https://${DOMAIN}"
  ok "公网地址：$BASE_URL（域名）"
elif [ -n "$PUBLIC_IP" ]; then
  BASE_URL="http://${PUBLIC_IP}:${AUTO_PORT}"
  [ "$IS_REINSTALL" = false ] && ok "公网地址：$BASE_URL"
else
  BASE_URL="http://YOUR_SERVER_IP:${AUTO_PORT}"
  warn "公网地址：待确认（安装后修改 $INSTALL_DIR/.env 中的 PUBLIC_URL）"
fi

# 复用已有 PUBLIC_URL（重装时不覆盖用户可能手动修改过的地址）
PUBLIC_URL="${SAVED_PUBLIC_URL:-${BASE_URL}/${ACCESS_PATH}}"

# WebSocket 连接令牌
TOKEN="${TOKEN:-$(head -c 32 /dev/urandom | base64 | tr -d '+/=\n' | head -c 32)}"
[ "$IS_REINSTALL" = false ] && ok "连接令牌：已生成"

# ── 2/4 安装 Node.js ─────────────────────────────────────────────────────────
step "2/4  安装 Node.js"

need_node=true
if command -v node &>/dev/null; then
  VER=$(node -e "console.log(+process.versions.node.split('.')[0])" 2>/dev/null || echo 0)
  if [ "$VER" -ge 18 ]; then
    ok "Node.js $(node -v) 已就绪"
    need_node=false
  else
    warn "Node.js $(node -v) 版本过旧，升级至 22 LTS"
  fi
fi

if $need_node; then
  info "安装 Node.js 22 LTS..."
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - &>/dev/null
    apt-get install -y nodejs &>/dev/null
  elif command -v dnf &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - &>/dev/null
    dnf install -y nodejs &>/dev/null
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - &>/dev/null
    yum install -y nodejs &>/dev/null
  else
    die "无法自动安装 Node.js，请手动安装 18+ 后重试：https://nodejs.org"
  fi
  VER=$(node -e "console.log(+process.versions.node.split('.')[0])" 2>/dev/null || echo 0)
  [ "$VER" -ge 18 ] && ok "Node.js $(node -v) 安装完成" || die "Node.js 安装失败"
fi

if ! command -v npm &>/dev/null; then
  info "安装 npm..."
  if command -v apt-get &>/dev/null; then
    apt-get update -qq &>/dev/null && apt-get install -y npm &>/dev/null || true
  elif command -v dnf &>/dev/null; then
    dnf install -y npm &>/dev/null || true
  elif command -v yum &>/dev/null; then
    yum install -y npm &>/dev/null || true
  fi
fi

# ── 3/4 部署服务端 ───────────────────────────────────────────────────────────
step "3/4  部署服务端"

# 旧进程已在步骤1提前清理，这里只做端口二次确认
if ss -tlnp 2>/dev/null | grep -q ":${AUTO_PORT} "; then
  PIDS_ON_PORT=$(ss -tlnp 2>/dev/null | grep ":${AUTO_PORT} " | grep -oP 'pid=\K[0-9]+' || true)
  [ -n "$PIDS_ON_PORT" ] && echo "$PIDS_ON_PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
fi
ok "端口 $AUTO_PORT 已就绪"

mkdir -p "$INSTALL_DIR"
info "安装目录：$INSTALL_DIR"

cat > "$INSTALL_DIR/server.mjs" << 'SERVEREOF'
import { createServer }    from 'node:http';
import { readFileSync }    from 'node:fs';
import { WebSocketServer } from 'ws';
import { fileURLToPath }   from 'node:url';
import { dirname, join }   from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(dir, '.env'), 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const PORT        = parseInt(env.PORT || '3000', 10);
const TOKEN       = env.TOKEN || '';
const ACCESS_PATH = (env.ACCESS_PATH || '').replace(/^\/+|\/+$/g, '');
const PUBLIC_URL  = env.PUBLIC_URL || `http://localhost:${PORT}/${ACCESS_PATH}`;

if (!TOKEN)       { console.error('[dsh-tunnel] ERROR: TOKEN is not set');       process.exit(1); }
if (!ACCESS_PATH) { console.error('[dsh-tunnel] ERROR: ACCESS_PATH is not set'); process.exit(1); }

console.log(`[dsh-tunnel] starting  port=${PORT}  path=/${ACCESS_PATH}  url=${PUBLIC_URL}`);

const PATH_PREFIX = `/${ACCESS_PATH}`;
const tunnelClients = new Map();
const pending       = new Map();

function forwardRequest(ws, req, res, forwardPath) {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    ws.send(JSON.stringify({
      type: 'request', requestId,
      method: req.method, path: forwardPath,
      headers: req.headers,
      body: Buffer.concat(chunks).toString('base64'),
    }));
    // API 请求（历史记录等大响应）用更长超时
    const timeoutMs = forwardPath.startsWith('/api/') ? 120000 : 30000;
    const timer = setTimeout(() => {
      if (!pending.has(requestId)) return;
      pending.delete(requestId);
      res.writeHead(504, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Gateway Timeout');
    }, timeoutMs);
    pending.set(requestId, { res, timer });
  });
  req.on('error', () => res.destroy());
}

const httpServer = createServer((req, res) => {
  const url = req.url ?? '/';

  // 健康检查：仅允许本机访问
  if (url === '/healthz') {
    const ip = req.socket.remoteAddress ?? '';
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, clients: tunnelClients.size, uptime: process.uptime() | 0 }));
    } else {
      res.writeHead(404); res.end();
    }
    return;
  }

  const [, ws] = [...tunnelClients.entries()][0] ?? [];

  // 带前缀的请求：剥离前缀再转发（主页面入口）
  if (url === PATH_PREFIX || url.startsWith(PATH_PREFIX + '/') || url.startsWith(PATH_PREFIX + '?')) {
    if (!ws) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('No tunnel client connected. Please enable the custom tunnel in dsh-bridge.');
      return;
    }
    const stripped = url.slice(PATH_PREFIX.length) || '/';
    forwardRequest(ws, req, res, stripped);
    return;
  }

  // 不带前缀的请求（/assets/xxx.js、/api/xxx 等）：
  // 仅在已有 tunnel client 时透传——浏览器加载页面资源必须走这条路
  // 无 client 时返回 404，不泄露服务存在
  if (!ws) {
    res.writeHead(404); res.end();
    return;
  }
  forwardRequest(ws, req, res, url);
});

// 控制通道 WebSocket（tunnel client 连进来的）
const wss = new WebSocketServer({ noServer: true });

// 浏览器 WebSocket 代理（/api/events.host 等）— 等待 tunnel client 的 ws-accept
const pendingWsUpgrades = new Map(); // wsId -> { socket, head, req }
const browserWsSockets  = new Map(); // wsId -> net.Socket (已升级)

httpServer.on('upgrade', (req, socket, head) => {
  const url = req.url ?? '/';

  // tunnel client 自己的控制通道
  if (url.startsWith('/connect')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    return;
  }

  // 浏览器发来的 WebSocket 升级（如 /api/events.host）
  const [, tunnelWs] = [...tunnelClients.entries()][0] ?? [];
  if (!tunnelWs) { socket.destroy(); return; }

  // 剥前缀
  let forwardPath = url;
  if (url === PATH_PREFIX || url.startsWith(PATH_PREFIX + '/') || url.startsWith(PATH_PREFIX + '?')) {
    forwardPath = url.slice(PATH_PREFIX.length) || '/';
  }

  const wsId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  pendingWsUpgrades.set(wsId, { socket, head, req: { url: forwardPath, headers: req.headers } });

  tunnelWs.send(JSON.stringify({
    type: 'ws-open', wsId,
    path: forwardPath,
    headers: req.headers,
  }));

  // 超时清理
  setTimeout(() => {
    if (pendingWsUpgrades.has(wsId)) {
      pendingWsUpgrades.get(wsId).socket.destroy();
      pendingWsUpgrades.delete(wsId);
    }
  }, 10000);
});

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://x').searchParams;
  if (params.get('token') !== TOKEN) { ws.close(4001, 'Unauthorized'); return; }

  const id = Math.random().toString(36).slice(2);
  tunnelClients.set(id, ws);
  console.log(`[dsh-tunnel] client connected  id=${id}  ip=${req.socket.remoteAddress}  total=${tunnelClients.size}`);
  ws.send(JSON.stringify({ type: 'ready', publicUrl: PUBLIC_URL }));

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw.toString());

      // HTTP 响应
      if (msg.type === 'response') {
        const p = pending.get(msg.requestId);
        if (!p) return;
        clearTimeout(p.timer);
        pending.delete(msg.requestId);
        const HOP_BY_HOP = new Set(['transfer-encoding', 'connection', 'keep-alive', 'te', 'trailer', 'upgrade']);
        const headers = Object.fromEntries(
          Object.entries(msg.headers ?? {}).filter(([k]) => !HOP_BY_HOP.has(k.toLowerCase()))
        );
        p.res.writeHead(msg.statusCode ?? 502, headers);
        p.res.end(Buffer.from(msg.body || '', 'base64'));
        return;
      }

      // WebSocket 握手成功，完成升级并接管 socket
      if (msg.type === 'ws-accept') {
        const { wsId, replyHeaders } = msg;
        const upgrade = pendingWsUpgrades.get(wsId);
        if (!upgrade) return;
        pendingWsUpgrades.delete(wsId);

        const { socket } = upgrade;
        // 回写 101 Switching Protocols
        const lines = ['HTTP/1.1 101 Switching Protocols'];
        for (const [k, v] of Object.entries(replyHeaders ?? {})) lines.push(`${k}: ${v}`);
        lines.push('', '');
        socket.write(lines.join('\r\n'));
        browserWsSockets.set(wsId, socket);

        socket.on('data', chunk => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'ws-frame', wsId, data: chunk.toString('base64') }));
          }
        });
        socket.on('close', () => {
          if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'ws-close', wsId }));
          browserWsSockets.delete(wsId);
        });
        socket.on('error', () => socket.destroy());
        return;
      }

      // WebSocket 数据帧（来自本地 DSH，转给浏览器）
      if (msg.type === 'ws-frame') {
        const sock = browserWsSockets.get(msg.wsId);
        if (sock && !sock.destroyed) sock.write(Buffer.from(msg.data, 'base64'));
        return;
      }

      // WebSocket 关闭
      if (msg.type === 'ws-close') {
        const sock = browserWsSockets.get(msg.wsId);
        if (sock) { sock.destroy(); browserWsSockets.delete(msg.wsId); }
        return;
      }

      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    } catch {}
  });

  ws.on('close', code => {
    tunnelClients.delete(id);
    // 清理所有挂在这个 client 上的 browser socket
    for (const [wsId, sock] of browserWsSockets) { sock.destroy(); browserWsSockets.delete(wsId); }
    console.log(`[dsh-tunnel] client disconnected  id=${id}  code=${code}  remaining=${tunnelClients.size}`);
  });
  ws.on('error', err => console.error(`[dsh-tunnel] client error id=${id}: ${err.message}`));
});

httpServer.on('error', err => { console.error('[dsh-tunnel] server error:', err.message); process.exit(1); });
httpServer.listen(PORT, '0.0.0.0', () => console.log('[dsh-tunnel] ready'));
['SIGTERM', 'SIGINT'].forEach(s => process.on(s, () => { httpServer.close(); process.exit(0); }));
SERVEREOF

# 写入配置（ACCESS_PATH 单独存，便于管理）
cat > "$INSTALL_DIR/.env" << EOF
PORT=$AUTO_PORT
TOKEN=$TOKEN
ACCESS_PATH=$ACCESS_PATH
PUBLIC_URL=$PUBLIC_URL
EOF
chmod 600 "$INSTALL_DIR/.env"

cat > "$INSTALL_DIR/package.json" << 'EOF'
{ "name": "dsh-tunnel-server", "version": "1.0.0", "type": "module", "private": true }
EOF

info "安装依赖（ws）..."
cd "$INSTALL_DIR"
if ! npm install ws --save --registry=https://registry.npmmirror.com --loglevel=error &>/dev/null; then
  if ! npm install ws --save --loglevel=error &>/dev/null; then
    npm install ws --save --registry=https://registry.npmmirror.com || die "依赖 ws 安装失败，请检查服务器网络连接与 npm 环境"
  fi
fi
ok "依赖安装完成"

# ── systemd ──────────────────────────────────────────────────────────────────
if command -v systemctl &>/dev/null; then
  cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=dsh-bridge Tunnel Server
Documentation=https://github.com/wenbin-wb/dsh-bridge
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$(command -v node) $INSTALL_DIR/server.mjs
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload &>/dev/null
  systemctl enable  "$SERVICE_NAME" &>/dev/null
  systemctl restart "$SERVICE_NAME"
  sleep 2
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    ok "systemd 服务已启动并开机自启"
  else
    warn "服务未能启动，请查看日志：journalctl -u $SERVICE_NAME -n 30"
  fi
else
  warn "未检测到 systemd，请手动启动：node $INSTALL_DIR/server.mjs"
fi

# ── 防火墙 ────────────────────────────────────────────────────────────────────
if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
  ufw allow "$AUTO_PORT"/tcp &>/dev/null && ok "ufw 已放行端口 $AUTO_PORT"
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port="$AUTO_PORT"/tcp &>/dev/null
  firewall-cmd --reload &>/dev/null && ok "firewalld 已放行端口 $AUTO_PORT"
fi

# ── 4/4 验证 ──────────────────────────────────────────────────────────────────
step "4/4  验证部署"
sleep 1
# 健康检查只允许本机，所以用 127.0.0.1
HEALTH=$(curl -fsSL --connect-timeout 3 "http://127.0.0.1:${AUTO_PORT}/healthz" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"ok":true'; then
  ok "服务运行正常"
else
  warn "健康检查未响应，请稍后确认：journalctl -u $SERVICE_NAME -n 20"
fi

# ── 打印配置 ──────────────────────────────────────────────────────────────────
WS_URL="$(echo "$BASE_URL" | sed 's|^http://|ws://|;s|^https://|wss://|')/connect"

echo ""
echo ""
echo -e "${BOLD}${GREEN}  部署完成！将以下信息填入 dsh-bridge 设置${NC}"
echo ""
echo -e "  ┌──────────────────────────────────────────────────────────────┐"
echo -e "  │${BOLD}  DSH 设置  →  远程访问  →  自建隧道${NC}                          │"
echo -e "  ├──────────────────────────────────────────────────────────────┤"
echo -e "  │  WebSocket 地址                                              │"
echo -e "  │  ${YELLOW}${WS_URL}${NC}"
echo -e "  │                                                              │"
echo -e "  │  访问令牌                                                    │"
echo -e "  │  ${YELLOW}${TOKEN}${NC}"
echo -e "  └──────────────────────────────────────────────────────────────┘"
echo ""
echo -e "  连接成功后，dsh-bridge 会显示以下公网访问地址："
echo -e "  ${YELLOW}${PUBLIC_URL}${NC}"
echo ""
echo -e "  ${DIM}安全说明：该地址含随机路径（/${ACCESS_PATH}），不知道路径无法访问。${NC}"
echo -e "  ${DIM}          端口扫描只能看到 404，不会暴露 DSH 的存在。${NC}"
echo ""

if [[ "$BASE_URL" == *"YOUR_SERVER_IP"* ]]; then
  warn "未能获取公网 IP，请编辑 $INSTALL_DIR/.env，修改 PUBLIC_URL 和 BASE_URL 后执行："
  warn "systemctl restart $SERVICE_NAME"
  echo ""
fi

echo -e "  ${DIM}日志：journalctl -u $SERVICE_NAME -f${NC}"
echo -e "  ${DIM}配置：$INSTALL_DIR/.env${NC}"
echo -e "  ${DIM}更新：bash <(curl -fsSL https://raw.githubusercontent.com/wenbin-wb/dsh-bridge/main/scripts/install-tunnel-server.sh)${NC}"
echo ""
