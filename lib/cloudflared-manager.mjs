// DSH Bridge - Cloudflared Manager

import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { chmod, stat, unlink, rename } from 'node:fs/promises';
import { homedir, platform, arch } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { get as httpsGet } from 'node:https';

const CLOUDFLARED_VERSION = '2024.10.0';
const DOWNLOAD_TIMEOUT = 5 * 60 * 1000; // 5 分钟
const MIN_BINARY_SIZE = 5 * 1024 * 1024; // 最小 5MB，防止下到 HTML 错误页

function getCloudflaredInfo() {
  const os = platform();
  const cpuArch = arch();

  const platformMap = {
    'win32-x64':   { file: 'cloudflared-windows-amd64.exe', name: 'cloudflared.exe' },
    'win32-arm64': { file: 'cloudflared-windows-arm64.exe', name: 'cloudflared.exe' },
    'darwin-x64':  { file: 'cloudflared-darwin-amd64.tgz',  name: 'cloudflared' },
    'darwin-arm64':{ file: 'cloudflared-darwin-arm64.tgz',  name: 'cloudflared' },
    'linux-x64':   { file: 'cloudflared-linux-amd64',       name: 'cloudflared' },
    'linux-arm64': { file: 'cloudflared-linux-arm64',       name: 'cloudflared' },
  };

  const key = `${os}-${cpuArch}`;
  const info = platformMap[key];
  if (!info) throw new Error(`不支持的平台: ${os}-${cpuArch}`);

  const url = `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${info.file}`;
  return { url, name: info.name };
}

async function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('下载超时（5分钟）')), DOWNLOAD_TIMEOUT);

    function doGet(targetUrl, redirects = 0) {
      if (redirects > 5) {
        clearTimeout(timer);
        return reject(new Error('重定向次数过多'));
      }
      httpsGet(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          return doGet(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          clearTimeout(timer);
          return reject(new Error(`下载失败: HTTP ${res.statusCode}`));
        }

        const total = parseInt(res.headers['content-length'] ?? '0', 10);
        let downloaded = 0;
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (onProgress && total > 0) {
            onProgress(Math.round(downloaded / total * 100), downloaded, total);
          }
        });

        const fileStream = createWriteStream(dest);
        pipeline(res, fileStream)
          .then(() => { clearTimeout(timer); resolve(); })
          .catch((err) => { clearTimeout(timer); reject(err); });
      }).on('error', (err) => { clearTimeout(timer); reject(err); });
    }

    doGet(url);
  });
}

export class CloudflaredManager {
  constructor({ port, home, onStateChange, logger }) {
    this.port = port;
    this.home = home || join(homedir(), '.dsh-bridge');
    this.onStateChange = onStateChange;
    this.logger = logger;

    this.process = null;
    this.url = null;
    this.binaryPath = null;
    this._stopped = false;
  }

  // 异步启动，立即返回——调用方不需要 await
  start() {
    this._stopped = false;
    this._run().catch((err) => {
      this.logger?.error('cloudflared 启动失败: %s', err.message);
      this._setState('error', err.message);
    });
  }

  async _run() {
    await this._ensureBinary();
    if (this._stopped) return;
    await this._startProcess();
  }

  async _ensureBinary() {
    const { url, name } = getCloudflaredInfo();
    const binDir = join(this.home, 'bin');
    const binPath = join(binDir, name);
    this.binaryPath = binPath;

    if (existsSync(binPath)) {
      try {
        const s = await stat(binPath);
        if (s.size > MIN_BINARY_SIZE) { // >5MB 才视为有效二进制
          this.logger?.info('cloudflared 已存在: %s', binPath);
          return;
        }
      } catch {}
      // 损坏文件，删掉重下
      await unlink(binPath).catch(() => {});
    }

    this._setState('downloading', '正在下载 cloudflared (~30MB)...');
    this.logger?.info('从 %s 下载 cloudflared', url);

    mkdirSync(binDir, { recursive: true });
    const tempPath = `${binPath}.tmp`;

    try {
      await downloadFile(url, tempPath, (percent, downloaded, total) => {
        if (this._stopped) return;
        const mb = (downloaded / 1024 / 1024).toFixed(1);
        const totalMb = (total / 1024 / 1024).toFixed(1);
        this._setState('downloading', `下载 cloudflared: ${mb}/${totalMb} MB (${percent}%)`);
      });

      if (existsSync(binPath)) await unlink(binPath).catch(() => {});
      await rename(tempPath, binPath);

      if (platform() !== 'win32') {
        await chmod(binPath, 0o755);
      }
      this.logger?.info('cloudflared 下载完成');
    } catch (err) {
      await unlink(tempPath).catch(() => {});
      throw new Error(`下载失败: ${err.message}`);
    }
  }

  _startProcess() {
    return new Promise((resolve, reject) => {
      if (this._stopped) return reject(new Error('已取消'));

      this._setState('connecting', '正在连接 Cloudflare...');

      const args = ['tunnel', '--url', `http://127.0.0.1:${this.port}`];
      this.logger?.info('启动 cloudflared: %s %s', this.binaryPath, args.join(' '));

      this.process = spawn(this.binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let resolved = false;

      const tryResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      // URL 同时在 stdout 和 stderr 里找（不同版本行为不同）
      const parseUrl = (text) => {
        const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          this.url = match[0];
          this._setState('ready', '隧道已建立');
          this.logger?.info('cloudflared 隧道就绪: %s', this.url);
          tryResolve();
        }
      };

      this.process.stdout.on('data', (d) => parseUrl(d.toString()));
      this.process.stderr.on('data', (d) => {
        const text = d.toString();
        this.logger?.debug('cloudflared: %s', text.trim());
        parseUrl(text);
        if (text.includes('Registered tunnel') && !resolved) {
          this._setState('connecting', '隧道已注册，等待 URL...');
        }
      });

      this.process.on('exit', (code) => {
        this.process = null;
        this.url = null;
        if (!resolved) {
          reject(new Error(`cloudflared 退出，code=${code}`));
        } else {
          this._setState('idle', '');
        }
      });

      this.process.on('error', (err) => {
        if (!resolved) reject(err);
      });

      // 连接超时 90 秒
      setTimeout(() => {
        if (!resolved) {
          this.stop();
          reject(new Error('等待隧道 URL 超时（90秒）'));
        }
      }, 90000);
    });
  }

  _setState(phase, detail) {
    this.onStateChange?.({ phase, detail });
  }

  stop() {
    this._stopped = true;
    if (this.process) {
      this.logger?.info('停止 cloudflared...');
      try {
        if (platform() === 'win32') {
          // Windows 不支持 SIGTERM，用 taskkill 强制终止
          spawn('taskkill', ['/pid', String(this.process.pid), '/f', '/t'], { stdio: 'ignore' });
        } else {
          this.process.kill('SIGTERM');
        }
      } catch {}
      this.process = null;
    }
    this.url = null;
  }
}
