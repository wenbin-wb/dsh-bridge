// 跨平台文件系统与工作区路径安全校验模块
// 防范任意路径遍历、系统关键目录越权与符号链接逃逸

import { resolve, normalize, isAbsolute, basename } from 'node:path';
import { homedir, platform } from 'node:os';
import { stat, realpath } from 'node:fs/promises';

const isWin = platform() === 'win32';

// 敏感隐藏文件夹 / 文件名黑名单（全平台）
const SENSITIVE_NAMES = new Set([
  '.ssh',
  '.gnupg',
  '.aws',
  '.azure',
  '.kube',
  '.git',
  '.svn',
  '.hg',
  '.bash_history',
  '.zsh_history',
  '.profile',
  '.bash_profile',
  '.bashrc',
  '.zshrc',
  '.netrc',
  'id_rsa',
  'id_ed25519',
  'id_ecdsa',
  'id_dsa',
  'credentials',
  'shadow',
  'passwd',
  '.env',
  '.npmrc',
]);

// Windows 系统敏感前缀
const WIN_SYSTEM_PREFIXES = [
  '\\\\', // UNC 路径限制
  'windows',
  'winnt',
  'program files',
  'program files (x86)',
  'system volume information',
  '$recycle.bin',
  'recovery',
  'perflogs',
  'boot',
  'programdata\\microsoft',
];

// POSIX 系统敏感前缀
const POSIX_SYSTEM_PREFIXES = [
  '/etc',
  '/root',
  '/sys',
  '/proc',
  '/dev',
  '/boot',
  '/lib',
  '/lib64',
  '/lib32',
  '/usr/bin',
  '/usr/sbin',
  '/bin',
  '/sbin',
  '/private',
  '/var/run',
  '/var/root',
];

/**
 * 判断文件名/单级目录名是否属于敏感目录
 */
export function isSensitiveFolderName(name) {
  if (!name || typeof name !== 'string') return true;
  const lower = name.toLowerCase().trim();
  if (SENSITIVE_NAMES.has(lower)) return true;
  if (/^(\$recycle\.bin|system volume information|\.ssh|\.gnupg|\.aws|\.git)$/i.test(lower)) return true;
  return false;
}

/**
 * 校验路径是否安全可作为工作区或被远程浏览
 * @param {string} targetPath 目标路径
 * @param {object} options 配置项
 * @returns {Promise<{ valid: boolean, error?: string, path?: string, realPath?: string }>}
 */
export async function isSafeWorkspacePath(targetPath, options = {}) {
  if (!targetPath || typeof targetPath !== 'string') {
    return { valid: false, error: '路径不能为空' };
  }

  const trimmed = targetPath.trim();
  if (!trimmed || trimmed.includes('\0')) {
    return { valid: false, error: '非法路径字符 (Null byte)' };
  }

  // 1. 基础路径归一化
  let normalized;
  try {
    let raw = trimmed;
    if (isWin && /^[A-Za-z]:$/.test(raw)) {
      raw = `${raw}\\`;
    }
    normalized = normalize(resolve(raw));
  } catch (err) {
    return { valid: false, error: `路径解析失败: ${err.message}` };
  }

  const lowerNormalized = normalized.toLowerCase();

  // 2. 检查 Windows 敏感路径
  if (isWin) {
    // 提取盘符后面的相对部分
    const driveMatch = normalized.match(/^[A-Za-z]:\\(.*)$/);
    if (driveMatch) {
      const rest = driveMatch[1].toLowerCase();
      for (const prefix of WIN_SYSTEM_PREFIXES) {
        if (rest === prefix || rest.startsWith(`${prefix}\\`)) {
          return { valid: false, error: `安全拦截：禁止访问系统敏感目录 (${prefix})` };
        }
      }
    } else if (normalized.startsWith('\\\\')) {
      return { valid: false, error: '安全拦截：禁止访问 UNC 网络共享路径' };
    }
  } else {
    // 3. 检查 POSIX 敏感路径
    for (const prefix of POSIX_SYSTEM_PREFIXES) {
      if (lowerNormalized === prefix || lowerNormalized.startsWith(`${prefix}/`)) {
        return { valid: false, error: `安全拦截：禁止访问系统关键目录 (${prefix})` };
      }
    }
  }

  // 4. 检查敏感隐藏目录片段（如路径中包含 /.ssh/ 或 \.ssh\）
  const pathParts = normalized.split(/[\\/]/).filter(Boolean);
  for (const part of pathParts) {
    if (isSensitiveFolderName(part)) {
      return { valid: false, error: `安全拦截：禁止访问敏感配置目录「${part}」` };
    }
  }

  // 5. 校验物理文件系统状态与符号链接（Symlink）真实目标
  let realTargetPath;
  try {
    const s = await stat(normalized);
    if (!s.isDirectory()) {
      return { valid: false, error: `指定路径不是文件夹: ${normalized}` };
    }
    realTargetPath = await realpath(normalized);
  } catch (err) {
    // 若仅是做路径规范性预校验（未必须已存在）
    if (options.allowNonExistent) {
      return { valid: true, path: normalized };
    }
    return { valid: false, error: `无法访问指定路径 (${err.message})` };
  }

  // 6. 对符号链接解析后的真实物理路径进行二次黑名单校验（防范符号链接逃逸）
  if (realTargetPath && realTargetPath !== normalized) {
    const realLower = realTargetPath.toLowerCase();
    if (isWin) {
      const realDriveMatch = realTargetPath.match(/^[A-Za-z]:\\(.*)$/);
      if (realDriveMatch) {
        const rest = realDriveMatch[1].toLowerCase();
        for (const prefix of WIN_SYSTEM_PREFIXES) {
          if (rest === prefix || rest.startsWith(`${prefix}\\`)) {
            return { valid: false, error: `安全拦截：符号链接指向系统敏感目录 (${prefix})` };
          }
        }
      }
    } else {
      for (const prefix of POSIX_SYSTEM_PREFIXES) {
        if (realLower === prefix || realLower.startsWith(`${prefix}/`)) {
          return { valid: false, error: `安全拦截：符号链接指向系统关键目录 (${prefix})` };
        }
      }
    }

    const realParts = realTargetPath.split(/[\\/]/).filter(Boolean);
    for (const part of realParts) {
      if (isSensitiveFolderName(part)) {
        return { valid: false, error: `安全拦截：符号链接指向敏感配置目录「${part}」` };
      }
    }
  }

  return {
    valid: true,
    path: normalized,
    realPath: realTargetPath || normalized,
  };
}
