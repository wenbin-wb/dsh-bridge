// cloudflared 隧道启动和管理

import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, chmodSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { get as httpsGet } from 'node:https';
import { platform, arch, homedir } from 'node:os';

/**
 * 获取 cloudflared 下载 URL
 */
function getCloudflaredUrl() {
  const os = platform();
  const cpuArch = arch();
  
  // 映射 Node.js 架构名称到 cloudflared 架构名称
  const archMap = {
    x64: 'amd64',
    arm64: 'arm64',
    arm: 'arm',
  };
  
  const targetArch = archMap[cpuArch] || 'amd64';
  
  // Windows
  if (os === 'win32') {
    return `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-${targetArch}.exe`;
  }
  
  // macOS
  if (os === 'darwin') {
    return `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-${targetArch}`;
  }
  
  // Linux
  return `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${targetArch}`;
}

/**
 * 获取 cloudflared 二进制文件路径
 */
function getCloudflaredPath(home) {
  const binDir = home || join(homedir(), '.dsh-remote');
  const isWindows = platform() === 'win32';
  return join(binDir, isWindows ? 'cloudflared.exe' : 'cloudflared');
}

/**
 * 下载 cloudflared
 */
async function downloadCloudflared(destPath, onProgress) {
  const url = getCloudflaredUrl();
  onProgress?.('downloading', `下载 cloudflared... | downloading cloudflared...`);
  
  return new Promise((resolve, reject) => {
    httpsGet(url, (res) => {
      // 处理重定向
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpsGet(res.headers.location, (redirectRes) => {
          handleResponse(redirectRes);
        }).on('error', reject);
        return;
      }
      
      handleResponse(res);
      
      function handleResponse(response) {
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${response.statusCode}`));
          return;
        }
        
        const total = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          const percent = ((downloaded / total) * 100).toFixed(1);
          onProgress?.('downloading', `下载中 ${percent}% | downloading ${percent}%`);
        });
        
        const writeStream = createWriteStream(destPath);
        
        pipeline(response, writeStream)
          .then(() => {
            // 添加执行权限 (Unix-like 系统)
            if (platform() !== 'win32') {
              try {
                chmodSync(destPath, 0o755);
              } catch (err) {
                console.warn('无法设置执行权限:', err.message);
              }
            }
            
            onProgress?.('downloaded', '下载完成 | download complete');
            resolve();
          })
          .catch(reject);
      }
    }).on('error', reject);
  });
}

/**
 * 启动 cloudflared 隧道
 * @param {object} opts
 * @param {number} opts.port - 本地端口
 * @param {string} opts.home - cloudflared 缓存目录
 * @param {AbortSignal} opts.signal - 取消信号
 * @param {Function} opts.onPhase - 状态回调
 * @returns {Promise<{url: string, kill: Function, onExit: Function}>}
 */
export async function startCloudflaredTunnel({
  port,
  home = null,
  signal,
  onPhase,
} = {}) {
  return new Promise(async (resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    
    try {
      // 确保缓存目录存在
      const binDir = home || join(homedir(), '.dsh-remote');
      await mkdir(binDir, { recursive: true });
      
      const cloudflaredPath = getCloudflaredPath(home);
      
      // 下载 cloudflared (如果不存在)
      if (!existsSync(cloudflaredPath)) {
        await downloadCloudflared(cloudflaredPath, onPhase);
      }
      
      onPhase?.('starting', '启动隧道... | starting tunnel...');
      
      // 启动 cloudflared
      const proc = spawn(cloudflaredPath, [
        'tunnel',
        '--url', `http://127.0.0.1:${port}`,
        '--no-autoupdate',
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      
      let publicUrl = null;
      let exitCallback = null;
      let resolved = false;
      
      // 解析输出获取公网 URL
      const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
      
      proc.stdout.on('data', (data) => {
        const output = data.toString();
        
        // 查找 URL
        const match = output.match(urlPattern);
        if (match && !publicUrl) {
          publicUrl = match[0];
          onPhase?.('ready', '隧道已建立 | tunnel established');
          
          if (!resolved) {
            resolved = true;
            resolve({
              url: publicUrl,
              kill: () => {
                proc.kill();
              },
              onExit: (cb) => {
                exitCallback = cb;
              },
            });
          }
        }
      });
      
      proc.stderr.on('data', (data) => {
        const output = data.toString();
        
        // 也检查 stderr
        const match = output.match(urlPattern);
        if (match && !publicUrl) {
          publicUrl = match[0];
          onPhase?.('ready', '隧道已建立 | tunnel established');
          
          if (!resolved) {
            resolved = true;
            resolve({
              url: publicUrl,
              kill: () => {
                proc.kill();
              },
              onExit: (cb) => {
                exitCallback = cb;
              },
            });
          }
        }
        
        // 检查错误
        if (output.includes('error') || output.includes('failed')) {
          if (!resolved) {
            resolved = true;
            reject(new Error(`cloudflared 错误: ${output.trim()}`));
          }
        }
      });
      
      proc.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`启动 cloudflared 失败: ${err.message}`));
        }
      });
      
      proc.on('exit', (code, signal) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`cloudflared 退出: code=${code} signal=${signal}`));
        } else {
          exitCallback?.();
        }
      });
      
      // 处理取消信号
      if (signal) {
        const onAbort = () => {
          proc.kill();
          if (!resolved) {
            resolved = true;
            reject(new Error('Aborted'));
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
        proc.on('exit', () => {
          signal.removeEventListener('abort', onAbort);
        });
      }
      
      // 超时检测
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          proc.kill();
          reject(new Error('启动超时 - 无法获取公网地址'));
        }
      }, 60000); // 60 秒超时
      
    } catch (err) {
      reject(err);
    }
  });
}
