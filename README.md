# DSH Bridge

<div align="center">

**Multi-channel access bridge for DSH** - Remote tunnels, LAN access, and bot integrations

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-blue)](https://github.com/deepseek-ai/dsh)

</div>

## Overview

DSH Bridge is a production-grade plugin that extends [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/dsh) with multi-channel access capabilities. Access your DSH instance from anywhere - mobile devices, other computers, or integrate with messaging platforms.

### Key Features

- 🌐 **LAN Access**: Automatic local network detection with QR code
- ☁️ **Cloudflare Tunnel**: One-click public URL via cloudflared
- 🔧 **Custom Tunnel**: Self-hosted WebSocket reverse tunnel
- 🤖 **Bot Ready**: Extensible architecture for future WeChat, QQ, Telegram, Lark integrations
- 🎨 **Elegant UI**: Production-grade settings panel with real-time status
- 🔒 **Secure**: Token authentication, loopback-only RPC, proper trust boundaries

## Quick Start

### Installation

```bash
# Install plugin
npm install dsh-bridge

# Or with pnpm
pnpm add dsh-bridge
```

### Configuration

Add to your `cordis.yml`:

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082  # Proxy port (optional, default: 3082)
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com  # Optional
      accessToken: your-secret-token           # Optional
```

Or use environment variables:

```bash
export DSH_BRIDGE_SERVER=wss://tunnel.yourdomain.com
export DSH_BRIDGE_TOKEN=your-secret-token
```

### Usage

1. Start DSH with the plugin enabled
2. Open DSH web interface at `http://localhost:3080`
3. Navigate to **Settings → DSH Bridge**
4. Choose your access method:
   - **LAN Access**: Scan QR code from mobile device on same Wi-Fi
   - **Cloudflare**: Click "Start" for instant public URL
   - **Custom Server**: Configure and start your own tunnel

## Access Methods

### 🏠 LAN Access

Perfect for accessing DSH from your phone or tablet on the same network.

**Features:**
- Auto-detects best network interface
- QR code for instant mobile access
- No internet required
- Zero configuration

**Use case:** Quick access from mobile device at home or office

---

### ☁️ Cloudflare Tunnel

Fastest way to get a public URL without server setup.

**Features:**
- One-click activation
- Auto-downloads cloudflared binary
- No account required
- Free tier available

**Limitations:**
- URL changes on each restart
- Subject to Cloudflare terms
- May have rate limits

**Use case:** Quick demo, temporary sharing, development

---

### 🔧 Custom Tunnel Server

Production-ready self-hosted solution with fixed domain.

**Features:**
- Your own domain
- Full control over data
- Token authentication
- WebSocket-based with auto-reconnect
- Health monitoring

**Requirements:**
- VPS or cloud server
- Domain with SSL certificate
- Docker (recommended)

**Use case:** Production deployment, team access, long-term usage

## Custom Tunnel Server Setup

### Quick Deploy with Docker

```bash
# Clone repository
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge/server

# Edit docker-compose.yml
nano docker-compose.yml
# Set ALLOWED_TOKENS and PUBLIC_URL

# Start server
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name tunnel.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/tunnel.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tunnel.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 90s;
    }
}
```

### Generate Secure Token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

See [server/README.md](./server/README.md) for detailed deployment guide.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DSH Bridge                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │              │  │              │  │              │    │
│  │  LAN Access  │  │  Cloudflare  │  │Custom Tunnel │    │
│  │              │  │              │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │             │
│         └─────────────────┼─────────────────┘             │
│                           │                               │
│                    ┌──────▼───────┐                       │
│                    │              │                       │
│                    │ Proxy Server │                       │
│                    │  Port 3082   │                       │
│                    │              │                       │
│                    └──────┬───────┘                       │
│                           │                               │
└───────────────────────────┼───────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │                │
                    │  DSH Instance  │
                    │   Port 3080    │
                    │                │
                    └────────────────┘
```

## Bot Integrations (Roadmap)

DSH Bridge is designed with extensibility in mind. Future bot integrations:

- 🔜 **WeChat** via [Clawbot](https://github.com/clawbot/clawbot)
- 🔜 **QQ** via official bot SDK
- 🔜 **Telegram** bot API
- 🔜 **Lark (Feishu)** bot integration
- 🔜 **Slack** bot
- 🔜 **Discord** bot

Each bot will provide:
- Command interface to DSH
- Notification delivery
- Conversational AI access
- File sharing

## Development

### Project Structure

```
dsh-bridge/
├── index.js                    # Host plugin entry
├── client/
│   └── index.js               # Client UI plugin
├── lib/
│   ├── bridge-rpc.js          # RPC interface
│   ├── tunnel-client.mjs      # Custom tunnel client
│   └── cloudflared-manager.mjs # Cloudflared manager
├── server/
│   ├── index.mjs              # Tunnel server
│   ├── Dockerfile             # Docker image
│   └── docker-compose.yml     # Docker Compose
└── test/
    └── basic.mjs              # Basic tests
```

### Testing

```bash
# Run tests
npm test

# Test tunnel client
node test/basic.mjs
```

### Code Quality

- ✅ Production-grade error handling
- ✅ Automatic reconnection with exponential backoff
- ✅ Health monitoring and timeout detection
- ✅ Graceful shutdown
- ✅ Comprehensive logging
- ✅ Clean architecture with service layer
- ✅ Type-safe RPC interface

## Configuration Reference

### Plugin Options

```yaml
plugins:
  dsh-bridge:
    # DSH port (default: 3080)
    dshPort: 3080
    
    # Proxy server settings
    proxy:
      port: 3082  # Proxy port (default: 3082)
    
    # Custom tunnel settings
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com
      accessToken: your-secret-token
    
    # Cache directory (default: ~/.dsh-bridge)
    home: ~/.dsh-bridge
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DSH_PORT` | DSH web port | `3080` |
| `DSH_BRIDGE_PROXY_PORT` | Proxy server port | `3082` |
| `DSH_BRIDGE_SERVER` | Custom tunnel server URL | - |
| `DSH_BRIDGE_TOKEN` | Custom tunnel access token | - |

## Security

### Best Practices

1. **Use HTTPS**: Always use SSL/TLS in production
2. **Strong Tokens**: Generate cryptographically random tokens
3. **Regular Rotation**: Update tokens periodically
4. **Network Isolation**: Use firewall rules to restrict access
5. **Monitor Access**: Review tunnel server logs regularly

### Trust Boundaries

- **Loopback-only RPC**: Browser↔Host communication restricted to localhost
- **Token Authentication**: Required for custom tunnel connections
- **Host Header Rewriting**: Proper forwarding to DSH
- **No Credential Storage**: Tokens in environment variables, not code

## Comparison with Similar Tools

| Feature | DSH Bridge | dsh-pocket |
|---------|-----------|------------|
| **LAN Access** | ✅ Auto-detect best IP | ✅ First non-internal IP |
| **Cloudflare** | ✅ One-click + auto-download | ✅ Manual install required |
| **Custom Tunnel** | ✅ Production WebSocket server | ❌ Not available |
| **UI Design** | ✅ Warm earth tones, elegant | ✅ Clean, functional |
| **QR Cache** | ✅ TTL-based with size limit | ✅ Basic caching |
| **Reconnection** | ✅ Exponential backoff | - |
| **Health Monitoring** | ✅ Heartbeat + timeout | - |
| **Bot Integration** | 🔜 Planned (extensible) | ❌ Not planned |
| **Server Included** | ✅ Full Docker setup | ❌ Client only |
| **Active Connections** | ✅ Real-time counter | ❌ Not tracked |

## Troubleshooting

### LAN Access not working

1. Check firewall allows connections to proxy port (3082)
2. Verify device is on same network
3. Try manually entering IP address

### Cloudflare tunnel fails to start

1. Check internet connection
2. Verify disk space for binary download (~20MB)
3. Review logs for specific error

### Custom tunnel connection issues

1. Verify server URL and token are correct
2. Check server is running: `curl https://your-server.com/health`
3. Verify firewall allows WebSocket connections
4. Check server logs: `docker-compose logs -f`

### High memory usage

1. Check number of active connections
2. Clear QR code cache (auto-clears every 30 min)
3. Review proxy server connections

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

### Development Setup

```bash
# Clone repository
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge

# Install dependencies
npm install

# Run tests
npm test

# Link for local testing
npm link
cd /path/to/your/dsh
npm link dsh-bridge
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and roadmap.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [DeepSeek Harness](https://github.com/deepseek-ai/dsh) - The AI agent framework
- [Cloudflare](https://www.cloudflare.com/) - Cloudflared tunnel technology
- [Cordis](https://cordisjs.org/) - Plugin system architecture

## Support

- 📖 [Documentation](https://github.com/wenbin-wb/dsh-bridge/wiki)
- 🐛 [Issue Tracker](https://github.com/wenbin-wb/dsh-bridge/issues)
- 💬 [Discussions](https://github.com/wenbin-wb/dsh-bridge/discussions)

---

<div align="center">

Made with ❤️ by [wenbin-wb](https://github.com/wenbin-wb)

</div>
