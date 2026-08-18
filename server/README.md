# DSH Bridge - Tunnel Server

Production-grade reverse tunnel server for DSH Bridge.

## Features

- **WebSocket-based reverse tunnel**: Efficient bidirectional communication
- **Token authentication**: Secure access control
- **Automatic subdomain generation**: Each client gets a unique URL
- **Heartbeat monitoring**: Automatic timeout detection
- **Health check endpoint**: Monitor server status
- **Graceful shutdown**: Clean connection cleanup

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
```

### Manual

```bash
cd server
npm install
npm start
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `ALLOWED_TOKENS` | Comma-separated list of valid tokens | _(required)_ |
| `PUBLIC_URL` | Public URL for tunnel endpoints | `http://localhost:8080` |

### Example

```bash
export PORT=8080
export ALLOWED_TOKENS=secret-token-1,secret-token-2
export PUBLIC_URL=https://tunnel.yourdomain.com
npm start
```

## Deployment

### Docker Compose

Edit `docker-compose.yml`:

```yaml
environment:
  - ALLOWED_TOKENS=your-secret-token-here
  - PUBLIC_URL=https://tunnel.yourdomain.com
```

Then deploy:

```bash
docker-compose up -d
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 90s;
    }
}
```

### Caddy Reverse Proxy

```caddy
tunnel.yourdomain.com {
    reverse_proxy localhost:8080
}
```

## Health Check

```bash
curl http://localhost:8080/health
```

Response:

```json
{
  "status": "ok",
  "totalTunnels": 2,
  "tunnels": [
    {
      "clientId": "abc123...",
      "subdomain": "xyz789...",
      "publicUrl": "https://tunnel.yourdomain.com/xyz789...",
      "uptime": 12345,
      "lastPing": 123
    }
  ]
}
```

## Security

1. **Always use HTTPS** in production with a reverse proxy (Nginx/Caddy)
2. **Generate strong tokens**: Use cryptographically random strings
3. **Rotate tokens regularly**: Update `ALLOWED_TOKENS` periodically
4. **Monitor connections**: Check `/health` endpoint for suspicious activity
5. **Rate limiting**: Configure your reverse proxy to limit requests

### Generate Secure Token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Monitoring

### Logs

```bash
# Docker
docker-compose logs -f

# Manual
npm start
```

### Metrics

The `/health` endpoint provides:
- Total active tunnels
- Per-tunnel uptime and last ping
- Server status

## Troubleshooting

### Client connection fails

1. Check `ALLOWED_TOKENS` includes the client token
2. Verify firewall allows WebSocket connections
3. Check reverse proxy WebSocket upgrade configuration

### Tunnel timeout

1. Default timeout is 90 seconds of inactivity
2. Check network stability
3. Review firewall rules

### High memory usage

1. Check number of active tunnels
2. Monitor for misbehaving clients
3. Consider adding rate limiting

## Architecture

```
┌──────────────┐         WebSocket          ┌──────────────┐
│              │ ◄─────── Token Auth ──────► │              │
│  DSH Client  │                             │ Tunnel Server│
│              │                             │              │
└──────────────┘                             └──────────────┘
                                                     ▲
                                                     │
                                              HTTP Requests
                                                     │
                                             ┌───────┴────────┐
                                             │  Public Access │
                                             └────────────────┘
```

## License

MIT
