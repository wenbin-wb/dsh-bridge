#!/bin/bash
# dsh-bridge 隧道服务端一键部署脚本
#
# 用法（零配置，全自动）：
#   bash <(curl -fsSL https://raw.githubusercontent.com/wenbin-wb/dsh-bridge/main/scripts/install-tunnel-server.sh)
#
# 自定义参数（可选，通过环境变量覆盖）：
#   PORT=8080 bash <(curl -fsSL ...)          # 自定义端口
#   TOKEN=my-token bash <(curl -fsSL ...)     # 自定义令牌
#   DOMAIN=tunnel.example.com bash <(curl -fsSL ...)  # 有域名时指定

set -euo pipefail

# ── 颜色 ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC}  $*"; }
info() { echo -e "  ${BLUE}·${NC}  $*"; }
warn() { echo -e "  ${YELLOW}!${NC}  $*"; }
die()  { echo -e "\n  ${RED}✗  错误：$*${NC}\n"; exit 1; }
step() { echo -e "\n${BOLD}$*${NC}"; }

INSTALL_DIR="/opt/dsh-tunnel"
SERVICE_NAME="dsh-tunnel"

# ── 系统检查 ───────────────────────────────────────────────────────────────
[ "$(uname -s)" = "Linux" ] || die "本脚本仅支持 Linux"
[ "$EUID" -eq 0 ]           || die "请用 root 权限运行：sudo bash <(curl ...)"

clear
echo ""
echo -e "${BOLD}  dsh-bridge 隧道服务端  ·  一键部署${NC}"
echo -e "${DIM}  https://github.com/wenbin-wb/dsh-bridge${NC}"
echo -e "  ────────────────────────────────────────"

# ── 自动确定配置 ───────────────────────────────────────────────────────────
step "1/4  检测环境"

# 端口：优先用环境变量，否则自动找空闲端口
AUTO_PORT="${PORT:-3000}"
if ss -tlnp 2>/dev/null | grep -q ":${AUTO_PORT} " || \
   netstat -tlnp 2>/dev/null | grep -q ":${AUTO_PORT} "; then
  # 端口被占，找下一个可用端口
  for p in 3001 3002 3003 8080 8088 9000; do
    if ! ss -tlnp 2>/dev/null | grep -q ":${p} "; then
      AUTO_PORT=$p; break
    fi
  done
fi
info "服务端口：$AUTO_PORT"

# 公网 IP：多个接口依次尝试
PUBLIC_IP=""
for svc in "ifconfig.me" "api.ipify.org" "ipinfo.io/ip" "icanhazip.com"; do
  PUBLIC_IP=$(curl -fsSL --connect-timeout 4 "$svc" 2>/dev/null | tr -d '[:space:]') && \
    [[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && break || PUBLIC_IP=""
done
[ -n "$PUBLIC_IP" ] && ok "公网 IP：$PUBLIC_IP" || warn "无法获取公网 IP，稍后手动填写"

# 访问地址：有域名用域名，否则用 IP
if [ -n "${DOMAIN:-}" ]; then
  PUBLIC_URL="https://${DOMAIN}"
  WS_SCHEME="wss"
  ok "公网地址：$PUBLIC_URL（域名）"
elif [ -n "$PUBLIC_IP" ]; then
  PUBLIC_URL="http://${PUBLIC_IP}:${AUTO_PORT}"
  WS_SCHEME="ws"
  ok "公网地址：$PUBLIC_URL（直连 IP）"
else
  PUBLIC_URL="http://YOUR_SERVER_IP:${AUTO_PORT}"
  WS_SCHEME="ws"
  warn "公网地址：待确认（安装完成后请修改 $INSTALL_DIR/.env 中的 PUBLIC_URL）"
fi

# 令牌：优先用环境变量，否则随机生成
TOKEN="${TOKEN:-$(head -c 32 /dev/urandom | base64 | tr -d '+/=\n' | head -c 32)}"
ok "访问令牌：已生成"

# ── 安装 Node.js ───────────────────────────────────────────────────────────
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

# ── 写入服务端文件 ─────────────────────────────────────────────────────────
step "3/4  部署服务端"

mkdir -p "$INSTALL_DIR"
info "安装目录：$INSTALL_DIR"

# 服务端主程序
cat > "$INSTALL_DIR/server.mjs" << 'EOF'
import { createServer }  from 'node:http';
import { readFileSync }  from 'node:fs';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import { dirname, join }  from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(dir, '.env'), 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const PORT       = parseInt(env.PORT || '3000', 10);
const TOKEN      = env.TOKEN || '';
const PUBLIC_URL = env.PUBLIC_URL || `http://localhost:${PORT}`;

if (!TOKEN) { console.error('[dsh-tunnel] ERROR: TOKEN is not set'); process.exit(1); }

console.log(`[dsh-tunnel] starting  port=${PORT}  url=${PUBLIC_URL}`);

const tunnelClients = new Map();
const pending       = new Map();

const httpServer = createServer((req, res) => {
  // 健康检查
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: tunnelClients.size, uptime: process.uptime() | 0 }));
    return;
  }

  // 没有隧道客户端连接
  const [, ws] = [...tunnelClients.entries()][0] ?? [];
  if (!ws) {
    res.writeHead(503, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<h2>dsh-bridge tunnel: no client connected</h2><p>Please enable the custom tunnel in dsh-bridge settings.</p>');
    return;
  }

  // 转发 HTTP 请求到 dsh-bridge 客户端
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    ws.send(JSON.stringify({
      type: 'request', requestId,
      method: req.method, path: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString('base64'),
    }));

    const timer = setTimeout(() => {
      if (!pending.has(requestId)) return;
      pending.delete(requestId);
      res.writeHead(504, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Gateway Timeout');
    }, 30000);

    pending.set(requestId, { res, timer });
  });
  req.on('error', () => res.destroy());
});

const wss = new WebSocketServer({ server: httpServer, path: '/connect' });

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
      if (msg.type === 'response') {
        const p = pending.get(msg.requestId);
        if (!p) return;
        clearTimeout(p.timer);
        pending.delete(msg.requestId);
        const headers = Object.fromEntries(
          Object.entries(msg.headers ?? {})
            .filter(([k]) => !['transfer-encoding','connection'].includes(k.toLowerCase()))
        );
        p.res.writeHead(msg.statusCode ?? 502, headers);
        p.res.end(Buffer.from(msg.body || '', 'base64'));
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {}
  });

  ws.on('close', (code) => {
    tunnelClients.delete(id);
    console.log(`[dsh-tunnel] client disconnected  id=${id}  code=${code}  remaining=${tunnelClients.size}`);
  });

  ws.on('error', err => console.error(`[dsh-tunnel] client error id=${id}: ${err.message}`));
});

httpServer.on('error', err => { console.error('[dsh-tunnel] server error:', err.message); process.exit(1); });
httpServer.listen(PORT, '0.0.0.0', () => console.log(`[dsh-tunnel] ready`));
['SIGTERM','SIGINT'].forEach(s => process.on(s, () => { httpServer.close(); process.exit(0); }));
EOF

# 配置文件
cat > "$INSTALL_DIR/.env" << EOF
PORT=$AUTO_PORT
TOKEN=$TOKEN
PUBLIC_URL=$PUBLIC_URL
EOF
chmod 600 "$INSTALL_DIR/.env"

# package.json
cat > "$INSTALL_DIR/package.json" << 'EOF'
{ "name": "dsh-tunnel-server", "version": "1.0.0", "type": "module", "private": true }
EOF

info "安装依赖（ws）..."
cd "$INSTALL_DIR" && npm install ws --save --loglevel=error &>/dev/null
ok "依赖安装完成"

# ── systemd 服务 ───────────────────────────────────────────────────────────
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

# ── 自动放行防火墙 ─────────────────────────────────────────────────────────
if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
  ufw allow "$AUTO_PORT"/tcp &>/dev/null && ok "ufw 已放行端口 $AUTO_PORT"
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port="$AUTO_PORT"/tcp &>/dev/null
  firewall-cmd --reload &>/dev/null
  ok "firewalld 已放行端口 $AUTO_PORT"
fi

# ── 健康检查 ───────────────────────────────────────────────────────────────
step "4/4  验证部署"
sleep 1
HEALTH=$(curl -fsSL --connect-timeout 3 "http://127.0.0.1:${AUTO_PORT}/healthz" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"ok":true'; then
  ok "服务运行正常（健康检查通过）"
else
  warn "健康检查未响应，如有防火墙规则变更可能需要等待几秒"
fi

# ── 打印配置信息 ───────────────────────────────────────────────────────────
WS_URL="$(echo "$PUBLIC_URL" | sed 's|^http://|ws://|;s|^https://|wss://|')/connect"

echo ""
echo ""
echo -e "${BOLD}${GREEN}  部署完成！将以下信息填入 dsh-bridge 设置${NC}"
echo ""
echo -e "  ┌─────────────────────────────────────────────────────────┐"
echo -e "  │${BOLD}  dsh-bridge → 设置 → 远程访问 → 自建隧道${NC}               │"
echo -e "  ├─────────────────────────────────────────────────────────┤"
echo -e "  │  WebSocket 地址                                         │"
echo -e "  │  ${YELLOW}${WS_URL}${NC}"
echo -e "  │                                                         │"
echo -e "  │  访问令牌                                               │"
echo -e "  │  ${YELLOW}${TOKEN}${NC}"
echo -e "  └─────────────────────────────────────────────────────────┘"
echo ""

if [[ "$PUBLIC_URL" == *"YOUR_SERVER_IP"* ]]; then
  warn "未能自动获取公网 IP，请编辑 $INSTALL_DIR/.env"
  warn "将 PUBLIC_URL 改为实际地址后执行：systemctl restart $SERVICE_NAME"
  echo ""
fi

echo -e "  ${DIM}日志：journalctl -u $SERVICE_NAME -f${NC}"
echo -e "  ${DIM}配置：$INSTALL_DIR/.env${NC}"
echo -e "  ${DIM}更新：bash <(curl -fsSL https://raw.githubusercontent.com/wenbin-wb/dsh-bridge/main/scripts/install-tunnel-server.sh)${NC}"
echo ""
