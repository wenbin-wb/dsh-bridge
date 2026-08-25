// lib/auth/login-template.js
// DeepSeek Harness 官方质感高颜值远程访问认证登录页（零外部 CDN 依赖，响应式适配手机与桌面）

export function renderLoginPage({ error = '', hasPassword = true, locked = false } = {}) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#121413">
  <title>远程访问认证 - DeepSeek Harness</title>
  <style>
    :root {
      --bg: #121413;
      --card-bg: rgba(26, 29, 27, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --brand: #22c55e;
      --brand-hover: #16a34a;
      --brand-glow: rgba(34, 197, 94, 0.25);
      --text: #f3f4f6;
      --text-secondary: #9ca3af;
      --input-bg: rgba(18, 20, 19, 0.7);
      --input-border: rgba(255, 255, 255, 0.12);
      --error-bg: rgba(239, 68, 68, 0.12);
      --error-border: rgba(239, 68, 68, 0.3);
      --error-text: #f87171;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.12) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.05) 0%, transparent 40%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      width: 100%;
      max-width: 400px;
      perspective: 1000px;
    }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 36px 28px;
      box-shadow: 
        0 20px 40px -15px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .logo-area {
      text-align: center;
      margin-bottom: 28px;
    }

    .logo-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.05));
      border: 1px solid rgba(34, 197, 94, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 16px -4px var(--brand-glow);
    }

    .logo-icon svg {
      width: 32px;
      height: 32px;
      fill: var(--brand);
    }

    h1 {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #ffffff;
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .alert {
      background: var(--error-bg);
      border: 1px solid var(--error-border);
      color: var(--error-text);
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: shake 0.4s ease;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    input[type="password"], input[type="text"] {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 12px;
      padding: 14px 44px 14px 16px;
      font-size: 15px;
      color: #ffffff;
      outline: none;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    input:focus {
      border-color: var(--brand);
      box-shadow: 0 0 0 3px var(--brand-glow);
      background: rgba(18, 20, 19, 0.9);
    }

    .toggle-pwd {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: color 0.2s;
    }

    .toggle-pwd:hover {
      color: #ffffff;
    }

    .submit-btn {
      width: 100%;
      background: var(--brand);
      color: #0b150f;
      border: none;
      border-radius: 12px;
      padding: 14px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 12px var(--brand-glow);
    }

    .submit-btn:hover {
      background: var(--brand-hover);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(34, 197, 94, 0.35);
    }

    .submit-btn:active {
      transform: translateY(1px);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(11, 21, 15, 0.3);
      border-top-color: #0b150f;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: none;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
    }

    .footer a {
      color: var(--text-secondary);
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo-area">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
        </div>
        <h1>DeepSeek Harness</h1>
        <div class="subtitle">远程安全访问认证</div>
      </div>

      <div id="errorAlert" class="alert" style="${error ? '' : 'display: none;'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span id="errorMsg">${error || ''}</span>
      </div>

      <form id="loginForm" onsubmit="return handleLogin(event)">
        <div class="form-group">
          <label for="password">访问密码 / PIN 码</label>
          <div class="input-wrapper">
            <input type="password" id="password" name="password" placeholder="请输入管理员设置的访问密码" autocomplete="current-password" autofocus required>
            <button type="button" class="toggle-pwd" onclick="togglePassword()" title="显示/隐藏密码">
              <svg id="eyeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" id="submitBtn" class="submit-btn">
          <span class="spinner" id="btnSpinner"></span>
          <span id="btnText">解锁并访问</span>
        </button>
      </form>

      <div style="margin-top: 16px; text-align: center;">
        <a href="javascript:void(0)" onclick="toggleForgotGuide()" style="font-size: 12px; color: var(--text-secondary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: color 0.2s;">
          ❓ 忘记密码怎么办？
        </a>
      </div>

      <div id="forgotGuide" style="display: none; margin-top: 14px; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; font-size: 12px; line-height: 1.6; color: var(--text-secondary); text-align: left;">
        <div style="font-weight: 600; color: #f3f4f6; margin-bottom: 4px;">🛟 找回与重置密码指引：</div>
        <div>1. <strong>电脑本机免密直连</strong>：在运行本程序的电脑本机打开本控制台，物理机享有永久免密特权，可直接修改或清除密码。</div>
        <div style="margin-top: 4px;">2. <strong>服务器救急指令</strong>：在宿主电脑终端执行 <code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; color: #34d399; font-family: monospace;">touch ~/.dsh/dsh-bridge/reset-auth</code> 即可瞬间恢复初始免密状态。</div>
      </div>

      <div class="footer">
        由 <a href="https://github.com/wenbin-wb/dsh-bridge" target="_blank">dsh-bridge</a> 安全网关守护
      </div>
    </div>
  </div>

  <script>
    function toggleForgotGuide() {
      const g = document.getElementById('forgotGuide');
      g.style.display = g.style.display === 'none' ? 'block' : 'none';
    }

    function togglePassword() {
      const input = document.getElementById('password');
      const icon = document.getElementById('eyeIcon');
      if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
      } else {
        input.type = 'password';
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
      }
    }

    async function handleLogin(e) {
      e.preventDefault();
      const pwd = document.getElementById('password').value;
      const btn = document.getElementById('submitBtn');
      const spinner = document.getElementById('btnSpinner');
      const btnText = document.getElementById('btnText');
      const alert = document.getElementById('errorAlert');
      const errorMsg = document.getElementById('errorMsg');

      btn.disabled = true;
      spinner.style.display = 'inline-block';
      btnText.textContent = '验证中…';
      alert.style.display = 'none';

      try {
        const resp = await fetch('/__dsh_bridge__/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        });
        const data = await resp.json();
        if (data.ok) {
          btnText.textContent = '✓ 认证成功，正在跳转…';
          setTimeout(() => {
            window.location.reload();
          }, 300);
        } else {
          errorMsg.textContent = data.error || '访问密码错误';
          alert.style.display = 'flex';
          alert.style.animation = 'none';
          void alert.offsetWidth; // 触发 reflow
          alert.style.animation = 'shake 0.4s ease';
          btn.disabled = false;
          spinner.style.display = 'none';
          btnText.textContent = '解锁并访问';
          document.getElementById('password').focus();
          document.getElementById('password').select();
        }
      } catch (err) {
        errorMsg.textContent = '网络请求失败，请重试';
        alert.style.display = 'flex';
        btn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = '解锁并访问';
      }
      return false;
    }
  </script>
</body>
</html>`;
}
