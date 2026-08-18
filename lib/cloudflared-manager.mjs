// DSH Bridge - Cloudflared Manager
// Production-grade cloudflared tunnel management with auto-download and lifecycle management

import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { chmod, stat, unlink } from 'node:fs/promises';
import { homedir, platform, arch } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { get as httpsGet } from 'node:https';

const CLOUDFLARED_VERSION = '2024.10.0';
const DOWNLOAD_TIMEOUT = 60000; // 60 seconds

/**
 * Get cloudflared binary info for current platform
 */
function getCloudflaredInfo() {
  const os = platform();
  const cpuArch = arch();
  
  const platformMap = {
    'win32-x64': { file: 'cloudflared-windows-amd64.exe', name: 'cloudflared.exe' },
    'win32-arm64': { file: 'cloudflared-windows-arm64.exe', name: 'cloudflared.exe' },
    'darwin-x64': { file: 'cloudflared-darwin-amd64.tgz', name: 'cloudflared' },
    'darwin-arm64': { file: 'cloudflared-darwin-amd64.tgz', name: 'cloudflared' },
    'linux-x64': { file: 'cloudflared-linux-amd64', name: 'cloudflared' },
    'linux-arm64': { file: 'cloudflared-linux-arm64', name: 'cloudflared' },
  };
  
  const key = `${os}-${cpuArch}`;
  const info = platformMap[key];
  
  if (!info) {
    throw new Error(`Unsupported platform: ${os}-${cpuArch}`);
  }
  
  const url = `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${info.file}`;
  
  return { url, name: info.name };
}

/**
 * Download file with progress
 */
async function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    httpsGet(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        return downloadFile(res.headers.location, dest, onProgress)
          .then(resolve)
          .catch(reject);
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }
      
      const totalBytes = parseInt(res.headers['content-length'], 10);
      let downloadedBytes = 0;
      
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (onProgress && totalBytes) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100);
          onProgress(percent, downloadedBytes, totalBytes);
        }
      });
      
      const fileStream = createWriteStream(dest);
      
      pipeline(res, fileStream)
        .then(() => resolve())
        .catch(reject);
    }).on('error', reject);
    
    // Timeout
    setTimeout(() => {
      reject(new Error('Download timeout'));
    }, DOWNLOAD_TIMEOUT);
  });
}

/**
 * Cloudflared manager with auto-download and lifecycle management
 */
export class CloudflaredManager {
  constructor({ port, home, signal, onStateChange, logger }) {
    this.port = port;
    this.home = home || join(homedir(), '.dsh-bridge');
    this.signal = signal;
    this.onStateChange = onStateChange;
    this.logger = logger;
    
    this.process = null;
    this.url = null;
    this.binaryPath = null;
  }
  
  async start() {
    this._setState('starting', 'Initializing...');
    
    // Ensure binary exists
    await this._ensureBinary();
    
    // Start cloudflared
    await this._startProcess();
  }
  
  async _ensureBinary() {
    const { url, name } = getCloudflaredInfo();
    const binDir = join(this.home, 'bin');
    const binPath = join(binDir, name);
    
    this.binaryPath = binPath;
    
    // Check if binary exists
    if (existsSync(binPath)) {
      try {
        const stats = await stat(binPath);
        if (stats.size > 0) {
          this.logger?.info('Cloudflared binary found: %s', binPath);
          return;
        }
      } catch {}
    }
    
    // Download binary
    this._setState('downloading', 'Downloading cloudflared (~20MB)...');
    this.logger?.info('Downloading cloudflared from %s', url);
    
    // Create directory
    if (!existsSync(binDir)) {
      mkdirSync(binDir, { recursive: true });
    }
    
    const tempPath = `${binPath}.tmp`;
    
    try {
      await downloadFile(url, tempPath, (percent, downloaded, total) => {
        const mb = (downloaded / 1024 / 1024).toFixed(1);
        const totalMb = (total / 1024 / 1024).toFixed(1);
        this._setState('downloading', `Downloading cloudflared: ${mb}/${totalMb} MB (${percent}%)`);
      });
      
      // Move to final location
      if (existsSync(binPath)) {
        await unlink(binPath);
      }
      
      await require('node:fs/promises').rename(tempPath, binPath);
      
      // Make executable on Unix
      if (platform() !== 'win32') {
        await chmod(binPath, 0o755);
      }
      
      this.logger?.info('Cloudflared downloaded successfully');
    } catch (err) {
      // Cleanup temp file
      try {
        if (existsSync(tempPath)) {
          await unlink(tempPath);
        }
      } catch {}
      
      throw new Error(`Failed to download cloudflared: ${err.message}`);
    }
  }
  
  _startProcess() {
    return new Promise((resolve, reject) => {
      if (this.signal?.aborted) {
        return reject(new Error('Aborted'));
      }
      
      this._setState('starting', 'Starting tunnel process...');
      
      const args = ['tunnel', '--url', `http://127.0.0.1:${this.port}`];
      
      this.logger?.info('Starting cloudflared: %s %s', this.binaryPath, args.join(' '));
      
      this.process = spawn(this.binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });
      
      let resolved = false;
      
      const onAbort = () => {
        if (!resolved) {
          this.stop();
          reject(new Error('Aborted'));
        }
      };
      
      this.signal?.addEventListener('abort', onAbort);
      
      // Parse stdout for tunnel URL
      this.process.stdout.on('data', (data) => {
        const text = data.toString();
        
        // Look for tunnel URL pattern
        const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          this.url = match[0];
          this.logger?.info('Cloudflared tunnel ready: %s', this.url);
          this.signal?.removeEventListener('abort', onAbort);
          resolved = true;
          this._setState('ready', 'Tunnel established');
          resolve();
        }
        
        // State updates
        if (text.includes('Registered tunnel')) {
          this._setState('registering', 'Registering with Cloudflare...');
        }
      });
      
      this.process.stderr.on('data', (data) => {
        const text = data.toString();
        this.logger?.debug('cloudflared stderr: %s', text.trim());
      });
      
      this.process.on('exit', (code, signal) => {
        this.logger?.info('Cloudflared exited: code=%s, signal=%s', code, signal);
        this.process = null;
        this.url = null;
        
        if (!resolved) {
          this.signal?.removeEventListener('abort', onAbort);
          reject(new Error(`Cloudflared exited with code ${code}`));
        }
      });
      
      this.process.on('error', (err) => {
        this.logger?.error('Cloudflared process error: %s', err.message);
        
        if (!resolved) {
          this.signal?.removeEventListener('abort', onAbort);
          reject(err);
        }
      });
      
      // Timeout
      setTimeout(() => {
        if (!resolved) {
          this.signal?.removeEventListener('abort', onAbort);
          this.stop();
          reject(new Error('Tunnel registration timeout'));
        }
      }, 45000); // 45 seconds
    });
  }
  
  _setState(phase, detail) {
    if (this.onStateChange) {
      this.onStateChange({ phase, detail });
    }
  }
  
  stop() {
    if (this.process) {
      this.logger?.info('Stopping cloudflared...');
      
      try {
        this.process.kill('SIGTERM');
      } catch (err) {
        this.logger?.error('Failed to kill cloudflared: %s', err.message);
      }
      
      this.process = null;
    }
    
    this.url = null;
  }
}
