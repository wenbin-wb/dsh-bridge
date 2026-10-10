// test/cloudflared-process-scan.test.mjs
// issue #71 第4条：同 tunnel token 的外部 cloudflared 检测（纯函数 + 可注入 + fail-open）。
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractCloudflaredAuth,
  findSameTokenRunner,
  parsePsProcesses,
  parsePowerShellProcesses,
  listLinuxProcesses,
  listCloudflaredProcesses,
  scanSameTokenRunner,
} from '../lib/cloudflared-process-scan.js'

// ── 命令行凭据提取 ───────────────────────────────────────────────────────
test('extractCloudflaredAuth：空格/等号/引号四种形态都识别', () => {
  assert.deepEqual(
    extractCloudflaredAuth('/usr/bin/cloudflared tunnel run --token abc123'),
    { via: 'token', value: 'abc123' },
  )
  assert.deepEqual(
    extractCloudflaredAuth('cloudflared tunnel --token=abc123 run'),
    { via: 'token', value: 'abc123' },
  )
  assert.deepEqual(
    extractCloudflaredAuth('C:\\Program Files (x86)\\cloudflared\\cloudflared.exe tunnel --token-file "C:\\ProgramData\\cloudflared\\tok" run'),
    { via: 'token-file', value: 'C:\\ProgramData\\cloudflared\\tok' },
  )
  assert.deepEqual(
    extractCloudflaredAuth('cloudflared tunnel --token-file=/etc/cf/tok run'),
    { via: 'token-file', value: '/etc/cf/tok' },
  )
  assert.equal(extractCloudflaredAuth('/usr/bin/cloudflared tunnel run'), null, '无凭据 → null')
  assert.equal(extractCloudflaredAuth('/usr/bin/other-tool --token abc'), null, '非 cloudflared → null')
  assert.equal(extractCloudflaredAuth(''), null)
})

// ── 同 token 比对 ───────────────────────────────────────────────────────
test('findSameTokenRunner：token 相同命中、不同不命中、排除自举 PID', () => {
  const processes = [
    { pid: 7, cmdline: 'cloudflared tunnel run --token same-tok' },
    { pid: 8, cmdline: 'cloudflared tunnel run --token other-tok' },
    { pid: 9, cmdline: '/usr/bin/sshd -D' },
  ]
  assert.deepEqual(
    findSameTokenRunner({ myToken: 'same-tok', processes }),
    { pid: 7, via: 'token' },
  )
  assert.equal(findSameTokenRunner({ myToken: 'nope', processes }), null)
  assert.equal(
    findSameTokenRunner({ myToken: 'same-tok', processes, excludePids: [7] }),
    null,
    '排除自己拉起的进程后不得命中',
  )
  assert.equal(findSameTokenRunner({ myToken: '', processes }), null, '自己没配 token → 不探测')
  assert.equal(findSameTokenRunner({ myToken: 'x', processes: null }), null)
})

test('findSameTokenRunner：token-file 读文件比对；读不到 → fail-open 不告警', () => {
  const processes = [
    { pid: 11, cmdline: 'cloudflared tunnel --token-file /pf/other-tok run' },
    { pid: 12, cmdline: 'cloudflared tunnel --token-file /pf/same-tok run' },
    { pid: 13, cmdline: 'cloudflared tunnel --token-file /pf/denied run' },
  ]
  const readFileFn = (p) => {
    if (p === '/pf/other-tok') return 'different\n'
    if (p === '/pf/same-tok') return 'my-secret-tok  '
    throw new Error('EACCES')
  }
  assert.deepEqual(
    findSameTokenRunner({ myToken: 'my-secret-tok', processes, readFileFn }),
    { pid: 12, via: 'token-file' },
    '比对前需 trim',
  )
  assert.equal(findSameTokenRunner({ myToken: 'x', processes, readFileFn }), null)
})

// ── 进程列表解析（跨平台）───────────────────────────────────────────────
test('parsePsProcesses / parsePowerShellProcesses：按行解析 pid + 命令行', () => {
  const ps = '  1234 /usr/local/bin/cloudflared tunnel run\n    56 /sbin/init\nnot-a-line\n'
  assert.deepEqual(parsePsProcesses(ps), [
    { pid: 1234, cmdline: '/usr/local/bin/cloudflared tunnel run' },
    { pid: 56, cmdline: '/sbin/init' },
  ])
  const psshell = '4711 C:\\Program Files (x86)\\cloudflared\\cloudflared.exe tunnel run --token-file x\n'
  assert.deepEqual(parsePowerShellProcesses(psshell), [
    { pid: 4711, cmdline: 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe tunnel run --token-file x' },
  ])
})

test('listLinuxProcesses：可注入 /proc 视图；非法目录与读失败逐个跳过', () => {
  const fakeProc = {
    '1': 'cloudflared\0tunnel\0run\0--token\0abc\0',
    '2': '/usr/sbin/sshd\0-D\0',
    '3': null, // 无权限/已退出
    'self': 'ignored-non-numeric',
  }
  const list = listLinuxProcesses({
    readdirFn: () => Object.keys(fakeProc),
    readFileFn: (p) => {
      const pid = p.split('/')[2]
      if (fakeProc[pid] === null) throw new Error('EACCES')
      if (fakeProc[pid] === undefined) throw new Error('ENOENT')
      return fakeProc[pid]
    },
  })
  assert.deepEqual(list, [{ pid: 1, cmdline: 'cloudflared tunnel run --token abc' }])

  assert.deepEqual(listLinuxProcesses({ readdirFn: () => { throw new Error('EACCES') } }), [], '读不到 /proc → 空列表（fail-open）')
})

test('listCloudflaredProcesses：darwin/win32 用注入执行器；任何失败 → []', () => {
  const darwin = listCloudflaredProcesses({
    platformName: 'darwin',
    execFn: () => '  1234 /usr/local/bin/cloudflared tunnel run\n  56 /sbin/init\n',
  })
  assert.deepEqual(darwin, [{ pid: 1234, cmdline: '/usr/local/bin/cloudflared tunnel run' }])

  const win = listCloudflaredProcesses({
    platformName: 'win32',
    execFn: () => '4711 C:\\pf\\cloudflared.exe tunnel run\n',
  })
  assert.deepEqual(win, [{ pid: 4711, cmdline: 'C:\\pf\\cloudflared.exe tunnel run' }])

  assert.deepEqual(listCloudflaredProcesses({ platformName: 'darwin', execFn: () => { throw new Error('timeout') } }), [], '执行失败 fail-open')
  assert.deepEqual(listCloudflaredProcesses({ platformName: 'freebsd' }), [], '未知平台 → 空')
})

// ── 端到端扫描（注入一切外部依赖）───────────────────────────────────────
test('scanSameTokenRunner：命中/未命中/自举排除/列表抛错 全部按契约返回', async () => {
  const processes = [
    { pid: 500, cmdline: 'cloudflared tunnel run --token shared' },
    { pid: 501, cmdline: 'cloudflared tunnel run --token shared' },
  ]
  const hit = await scanSameTokenRunner({
    myToken: 'shared',
    listProcesses: () => processes,
    getExcludePids: () => [500],
  })
  assert.deepEqual(hit, { pid: 501, via: 'token' }, '排除自举 PID 后命中另一个')

  assert.equal(await scanSameTokenRunner({ myToken: 'other', listProcesses: () => processes }), null)
  assert.equal(await scanSameTokenRunner({ myToken: 'shared', listProcesses: () => { throw new Error('EPERM') } }), null, '列表失败 fail-open')
  assert.equal(await scanSameTokenRunner({ myToken: '', listProcesses: () => processes }), null, '未配置 token 不扫描')
  assert.equal(await scanSameTokenRunner({ listProcesses: () => processes }), null)
})
