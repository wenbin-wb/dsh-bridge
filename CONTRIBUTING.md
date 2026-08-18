# Contributing to DSH Bridge

Thank you for your interest in contributing to DSH Bridge! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Git
- Basic understanding of DSH and Cordis plugins

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/dsh-bridge.git
cd dsh-bridge

# Install dependencies
npm install

# Run tests
npm test

# Link for local development
npm link
cd /path/to/your/dsh
npm link dsh-bridge
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits atomic and meaningful

### 3. Test Your Changes

```bash
# Run tests
npm test

# Test manually with DSH
# Start DSH with your linked plugin
dsh
```

### 4. Commit

Use clear, descriptive commit messages:

```
feat: add telegram bot integration
fix: resolve connection timeout issue
docs: update deployment guide
refactor: improve tunnel client error handling
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference any related issues
- Screenshots for UI changes
- Test results

## Code Style

### General Principles

- **Clarity over cleverness**: Write code that's easy to understand
- **Production-grade**: Error handling, logging, graceful degradation
- **Type safety**: Use JSDoc for type hints where helpful
- **Clean architecture**: Separate concerns, dependency injection

### JavaScript Style

```javascript
// Use modern JavaScript
const { feature } = await import('./module.mjs');

// Descriptive names
function calculateBestLanIp() { ... }

// Error handling
try {
  await riskyOperation();
} catch (err) {
  logger.error('Operation failed: %s', err.message);
  throw new Error(`Failed to complete: ${err.message}`);
}

// Comments for complex logic
// Calculate network interface score based on:
// 1. Private IP range (highest priority)
// 2. Physical vs virtual interface
// 3. Ethernet vs WiFi
```

### UI Components

```javascript
// React without JSX
React.createElement('div', {
  style: { padding: '20px' }
},
  React.createElement('h1', null, 'Title')
)

// Elegant, production-grade design
// - Warm earth tones (#C4612F, #F7F4EF)
// - Rounded buttons (999px)
// - Clear hierarchy
// - Real-time feedback
```

## Testing

### Unit Tests

```javascript
// test/feature.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Feature', () => {
  it('should work correctly', () => {
    assert.strictEqual(result, expected);
  });
});
```

### Integration Tests

Test complete workflows:
- Tunnel connection and reconnection
- QR code generation and caching
- RPC communication
- Error recovery

### Manual Testing

1. Test all access methods (LAN, Cloudflare, Custom)
2. Test on different platforms (Windows, macOS, Linux)
3. Test UI on different browsers
4. Test mobile device access

## Documentation

### Code Documentation

```javascript
/**
 * Connect to tunnel server with automatic reconnection
 * @throws {Error} If server URL or token is invalid
 */
async connect() { ... }
```

### User Documentation

- Update README.md for new features
- Add examples and use cases
- Include troubleshooting steps
- Update CHANGELOG.md

## Adding New Features

### Bot Integrations

Structure for adding a new bot:

```javascript
// lib/bots/telegram-bot.mjs
export class TelegramBot {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
  }
  
  async start() {
    // Initialize bot
  }
  
  async handleCommand(command, args) {
    // Process commands
  }
  
  async sendNotification(message) {
    // Send messages
  }
  
  stop() {
    // Cleanup
  }
}
```

Register in `index.js`:

```javascript
if (config.telegram?.enabled) {
  const bot = new TelegramBot(ctx, config.telegram);
  ctx.provide('telegram', bot);
  await bot.start();
}
```

Add UI in `client/index.js`:

```javascript
React.createElement(BotCard, {
  ctx,
  title: 'Telegram Bot',
  description: 'Receive notifications via Telegram',
  status: status.telegram,
  onStart: () => handleAction('startTelegram'),
  onStop: () => handleAction('stopTelegram'),
})
```

### Access Channels

For new tunnel types, follow the pattern:

1. Create manager class in `lib/`
2. Integrate in `BridgeService`
3. Add RPC endpoints
4. Add UI card in client
5. Update documentation

## Pull Request Guidelines

### Before Submitting

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No console.log() in production code (use logger)
- [ ] Error messages are user-friendly

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests pass
- [ ] CHANGELOG updated
```

## Release Process

Maintainers follow semantic versioning:

- **Major (1.0.0)**: Breaking changes
- **Minor (0.1.0)**: New features, backward compatible
- **Patch (0.0.1)**: Bug fixes

## Questions?

- Open an [issue](https://github.com/wenbin-wb/dsh-bridge/issues)
- Start a [discussion](https://github.com/wenbin-wb/dsh-bridge/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to DSH Bridge! 🎉
