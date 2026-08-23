import puppeteer from 'puppeteer-core'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// 定位文件路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')
const OUT_PATH = join(ROOT_DIR, 'docs', 'banner.jpg')
const SCREENSHOTS_DIR = join(ROOT_DIR, 'docs', 'screenshots')

// Chrome 本地执行路径
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function sleep(ms) { 
  return new Promise(r => setTimeout(r, ms)) 
}

async function main() {
  console.log('🖼️ 正在读取截图素材...')
  const secImgBuf = await readFile(join(SCREENSHOTS_DIR, 'security-auth-config.jpg'))
  const feishuChatBuf = await readFile(join(SCREENSHOTS_DIR, 'feishu-chat.jpg'))
  const secBase64 = `data:image/jpeg;base64,${secImgBuf.toString('base64')}`
  const feishuBase64 = `data:image/jpeg;base64,${feishuChatBuf.toString('base64')}`

  console.log('🚀 启动无头浏览器渲染 Banner...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: {
      width: 1280,
      height: 520,
      deviceScaleFactor: 2,
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  // ==========================================
  // 💡 在下方 HTML 中直接修改文案、标签与排版：
  // ==========================================
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1280px;
      height: 520px;
      background-color: #080c14;
      background-image: 
        radial-gradient(ellipse 90% 60% at 75% 30%, rgba(56, 189, 248, 0.14), transparent 70%),
        radial-gradient(ellipse 70% 50% at 20% 80%, rgba(99, 102, 241, 0.12), transparent 70%),
        radial-gradient(ellipse 50% 40% at 85% 85%, rgba(16, 185, 129, 0.1), transparent 60%),
        linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 100% 100%, 32px 32px, 32px 32px;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 54px 0 64px;
      position: relative;
    }

    .top-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 10%, rgba(56, 189, 248, 0.6) 50%, transparent 90%);
    }

    .left {
      z-index: 10;
      max-width: 530px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 9999px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 11.5px;
      font-weight: 600;
      color: #38bdf8;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.12);
      width: fit-content;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
    }

    h1 {
      font-size: 52px;
      font-weight: 800;
      letter-spacing: -0.035em;
      line-height: 1.05;
      margin-bottom: 14px;
      background: linear-gradient(135deg, #ffffff 40%, #cbd5e1 75%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .desc {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 24px;
      font-weight: 400;
    }
    .desc strong {
      color: #f1f5f9;
      font-weight: 600;
    }

    .feature-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .feature-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .feat-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      font-size: 12.5px;
      color: #e2e8f0;
      font-weight: 500;
      backdrop-filter: blur(8px);
    }
    .feat-tag.highlight {
      border-color: rgba(56, 189, 248, 0.35);
      background: rgba(14, 116, 144, 0.15);
      color: #38bdf8;
    }
    .feat-tag.green {
      border-color: rgba(16, 185, 129, 0.35);
      background: rgba(6, 78, 59, 0.2);
      color: #34d399;
    }

    .right {
      z-index: 10;
      position: relative;
      width: 610px;
      height: 440px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .desktop-window {
      position: absolute;
      left: 10px;
      top: 25px;
      width: 480px;
      height: 380px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .window-header {
      height: 32px;
      background: #1e293b;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 6px;
    }
    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .window-title {
      font-size: 11px;
      font-family: monospace;
      color: #94a3b8;
      margin-left: 8px;
    }
    .window-content {
      flex: 1;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: top center;
      background-image: url('${secBase64}');
    }

    .phone-mockup {
      position: absolute;
      right: 0;
      bottom: 15px;
      width: 215px;
      height: 420px;
      background: #020617;
      border: 3px solid #334155;
      border-radius: 28px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(16, 185, 129, 0.15);
      overflow: hidden;
      z-index: 20;
      display: flex;
      flex-direction: column;
    }
    .phone-notch {
      position: absolute;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      width: 65px;
      height: 14px;
      background: #000000;
      border-radius: 10px;
      z-index: 30;
    }
    .phone-screen {
      flex: 1;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: top center;
      background-image: url('${feishuBase64}');
    }

    .floating-pill {
      position: absolute;
      top: 10px;
      right: 140px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 9999px;
      padding: 6px 14px;
      font-size: 11.5px;
      font-weight: 600;
      color: #34d399;
      display: flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.2);
      backdrop-filter: blur(12px);
      z-index: 25;
    }
  </style>
</head>
<body>
  <div class="top-glow"></div>

  <!-- 左侧：文案与特性药丸 -->
  <div class="left">
    <div class="badge">
      <span class="badge-dot"></span>
      DEEPSEEK HARNESS • REMOTE BRIDGE
    </div>
    <h1>dsh-bridge</h1>
    <p class="desc">
      <strong>人不在电脑前，也能在手机与 IM 里接着干。</strong><br/>
      局域网 / 公网扫码免密直入 · 全域安全防篡改门禁 · 微信 / QQ / 飞书 / Telegram 全矩阵。
    </p>

    <div class="feature-grid">
      <div class="feature-row">
        <span class="feat-tag highlight">🛡️ 双密码与防篡改锁</span>
        <span class="feat-tag">📱 局域网 / Wi-Fi 扫码</span>
        <span class="feat-tag">🌐 Cloudflare & 自建隧道</span>
      </div>
      <div class="feature-row">
        <span class="feat-tag green">💬 微信 ClawBot</span>
        <span class="feat-tag">🐧 QQ 官方机器人</span>
        <span class="feat-tag">🕊️ 飞书 WebSocket</span>
        <span class="feat-tag">✈️ Telegram</span>
      </div>
    </div>
  </div>

  <!-- 右侧：真实产品 Mockup 橱窗 -->
  <div class="right">
    <div class="desktop-window">
      <div class="window-header">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
        <span class="window-title">DeepSeek Harness — 远程访问控制台</span>
      </div>
      <div class="window-content"></div>
    </div>

    <div class="phone-mockup">
      <div class="phone-notch"></div>
      <div class="phone-screen"></div>
    </div>

    <div class="floating-pill">
      <span class="badge-dot"></span>
      实时长连接已就绪
    </div>
  </div>
</body>
</html>
  `

  await page.setContent(html, { waitUntil: 'networkidle0' })
  await sleep(800)

  await page.screenshot({
    path: OUT_PATH,
    type: 'jpeg',
    quality: 95,
  })

  console.log('✨ Banner 生成成功，已保存至:', OUT_PATH)
  await browser.close()
}

main().catch(console.error)
