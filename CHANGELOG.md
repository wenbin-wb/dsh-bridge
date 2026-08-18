# Changelog

All notable changes to DSH Bridge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

#### Access Layer
- **LAN Access**: Automatic local network detection with QR code generation
- **Cloudflare Tunnel**: One-click public URL via cloudflared with auto-download
- **Custom Tunnel**: WebSocket reverse tunnel to self-hosted servers
- **Smart Network Detection**: Intelligent LAN IP selection with scoring algorithm
- **QR Code Cache**: Efficient caching with TTL and size limits

#### Security
- **Token Authentication**: Secure token-based auth for custom tunnels
- **Loopback-only RPC**: Browser-to-host communication restricted to loopback
- **Host Header Rewriting**: Proper trust boundary for DSH

#### User Experience
- **Real-time Status Updates**: Auto-refresh every 3 seconds
- **Progress Indicators**: Download progress, connection states, error messages
- **Copy to Clipboard**: One-click URL copying with visual feedback
- **Active Connection Counter**: Real-time connection monitoring
- **Elegant UI**: Production-grade design with warm earth tones

#### Server Infrastructure
- **Production-grade Tunnel Server**: WebSocket-based with automatic reconnection
- **Health Monitoring**: Heartbeat system with automatic timeout detection
- **Request Multiplexing**: Efficient HTTP request/response mapping
- **Docker Support**: Complete containerization with docker-compose
- **Graceful Shutdown**: Clean connection cleanup on server stop

#### Developer Experience
- **TypeScript-ready**: Full type definitions for service interfaces
- **Comprehensive Error Handling**: Detailed error messages and recovery
- **Extensive Logging**: Debug-friendly logging at all levels
- **Clean Architecture**: Service layer separation, dependency injection

### Technical Details

#### Architecture
- **Service Orchestration Layer**: Centralized state management and health monitoring
- **Proxy Server**: HTTP and WebSocket proxy with connection tracking
- **Tunnel Client**: Auto-reconnect with exponential backoff
- **Cloudflared Manager**: Platform detection and binary auto-download

#### Performance
- **Efficient QR Generation**: Cached with 30-minute TTL
- **Connection Pooling**: Reused connections where possible
- **Minimal Memory Footprint**: Stream-based request forwarding
- **Fast Startup**: Parallel initialization of services

## Roadmap

### [1.1.0] - Bot Integrations (Q1 2024)
- [ ] WeChat bot integration via Clawbot
- [ ] QQ bot integration
- [ ] Telegram bot integration
- [ ] Lark (Feishu) bot integration

### [1.2.0] - Advanced Features (Q2 2024)
- [ ] Webhook endpoints for external services
- [ ] Session sharing across devices
- [ ] Mobile-optimized UI
- [ ] Custom domain support for tunnels
- [ ] Rate limiting and traffic shaping

### [1.3.0] - Enterprise Features (Q3 2024)
- [ ] Multi-user support with separate tokens
- [ ] Analytics dashboard
- [ ] Traffic logs and audit trails
- [ ] Slack bot integration
- [ ] Discord bot integration

### [2.0.0] - Platform Expansion (Q4 2024)
- [ ] Native mobile apps (iOS, Android)
- [ ] Desktop tray application
- [ ] Browser extension
- [ ] API for third-party integrations

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute.

## License

MIT License - see [LICENSE](./LICENSE) for details.
