#!/usr/bin/env node

// dsh-remote 命令行工具

import { randomBytes } from 'node:crypto';

const command = process.argv[2];

if (command === 'generate-token') {
  // 生成强随机 token
  const token = randomBytes(32).toString('base64url');
  
  console.log('');
  console.log('生成的访问令牌:');
  console.log(token);
  console.log('');
  console.log('请将此令牌保存到环境变量或配置文件中:');
  console.log(`export DSH_REMOTE_TOKEN="${token}"`);
  console.log('');
  console.log('服务器端配置:');
  console.log(`export ALLOWED_TOKENS="${token}"`);
  console.log('');
  
} else if (command === 'server') {
  // 启动服务器
  console.log('启动 DSH Remote Server...');
  console.log('请使用: node server/index.mjs');
  
} else {
  // 帮助信息
  console.log('');
  console.log('DSH Remote 命令行工具');
  console.log('');
  console.log('用法:');
  console.log('  dsh-remote generate-token    生成访问令牌');
  console.log('  dsh-remote server            启动服务器');
  console.log('  dsh-remote help              显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  # 生成令牌');
  console.log('  dsh-remote generate-token');
  console.log('');
  console.log('  # 启动服务器');
  console.log('  cd node_modules/dsh-remote/server');
  console.log('  ALLOWED_TOKENS=your-token node index.mjs');
  console.log('');
}
