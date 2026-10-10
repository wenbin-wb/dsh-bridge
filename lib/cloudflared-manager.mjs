import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, createReadStream, existsSync, mkdirSync, readFileSync, statSync, renameSync, writeFileSync } from 'node:fs';
import { chmod, stat, unlink, rename } from 'node:fs/promises';
import { homedir, platform, arch } from 'node:os';
import { join, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { get as httpsGet } from 'node:https';
import { get as httpGet } from 'node:http';

// 参数化执行外部命令，替代原先的 execSync(`"${path}" --version`) 字符串拼接
// （CodeQL js/shell-command-constructed-from-input）。execFileSync 不经过 shell，
// 参数以数组传递，路径里的引号 / $( ) / 反引号不再具备注入语义。
//
// Windows 例外：.cmd / .bat 无法被 execFileSync 直接执行（Node 要求经 shell），
// 官方 cloudflared 在 Windows 是 .exe 走参数化路径，只有测试注入的假二进制是
// .cmd，故按扩展名决定是否需要 shell。macOS / Linux 恒为 false。
const IS_WINDOWS = process.platform === 'win32';
function execBinSync(bin, args, options) {
  const needsShell = IS_WINDOWS && /\.(cmd|bat)$/i.test(bin);
  return execFileSync(bin, args, { ...options, shell: needsShell });
}

const CLOUDFLARED_VERSION = '2024.10.0';
const DOWNLOAD_TIMEOUT = 5 * 60 * 1000; // 5 分钟
const MIN_BINARY_SIZE = 5 * 1024 * 1024; // 最小 5MB，防止下到 HTML 错误页
const HANDSHAKE_TIMEOUT_MS = 90 * 1000; // 等待隧道就绪的握手超时（默认 90s，可注入）
const RETRY_BASE_MS = 5 * 1000; // 自愈退避起点 5s
const RETRY_MAX_MS = 5 * 60 * 1000; // 自愈退避封顶 5min
const DEFAULT_MAX_RETRIES = 12; // 连续失败超过该次数转为 error，不再无限重试

// ── 运行时健康探针 ────────────────────────────────────────────────────────
// 事故背景：cloudflared 与 Cloudflare 边缘的连接全部掉光后进程仍存活（"半死/假死"），
// 既不退出也不报错，因此只监听 exit 的旧自愈逻辑永远不会触发，隧道会静默失效
// （现象：公网 530 + 正文 error code: 1033，持续 2 天无人发现）。
//
// 关键约束（一手源码 cloudflared 2024.10.0 `tunnelstate/conntracker.go`）：/ready 的
// readyConnections 取自 CountActiveConns()，而 Disconnected / Reconnecting /
// RegisteringTunnel / Unregistering 全部把 IsConnected 置 false —— 即
// **正常重连期间 /ready 同样是 503**。因此单次 503 无法区分"连接器假死"与
// "网络暂时全断、cloudflared 正按自身退避重连"。唯一能区分的是"持续多久"，
// 故采用两级升级，且强制重建永不进入终态（见 _scheduleRestart 的 terminal 选项）。
const HEALTH_PROBE_INTERVAL_MS = 30 * 1000; // 探活间隔
const HEALTH_PROBE_TIMEOUT_MS = 5 * 1000; // 单次探活总时限（远程调用防失控）
const HEALTH_DEGRADED_THRESHOLD = 3; // 连续失败达此数 → 面板可见降级（约 90s 发现）
const HEALTH_RESTART_THRESHOLD = 10; // 连续失败达此数 → 终止进程强制重建（约 5min）

// ── cloudflared 输出落盘 ──────────────────────────────────────────────────
// 事故时 journal 里查不到任何 cloudflared 日志，导致事后无法定位断连时间点与原因。
export const CLOUDFLARED_LOG_NAME = 'cloudflared.log';
const CLOUDFLARED_LOG_MAX_BYTES = 5 * 1024 * 1024; // 超限轮转为 .1（覆盖旧的）

// 从 cloudflared 自报日志中解析 metrics 服务地址（运行时健康探针的唯一入口）。
// 真实输出形如：INF Starting metrics server on 127.0.0.1:41143/metrics
// 解析不到 → 显式告警并跳过探活（绝不静默降级，也绝不因探测不到而误杀进程）。
//
// 必须在这里就把非法地址拦掉：node:http 的 get() 对畸形 URL 会**同步抛错**
// （ERR_INVALID_URL），异常会穿透探针 Promise 造成未处理 rejection ——
// Node 默认 unhandled-rejections=throw 会直接结束整个 DSH 主进程，
// 也就是说"本该保护服务的探针"反而会把服务干掉。端口必须落在 1..65535。
export function parseMetricsAddress(text) {
  if (!text) return null;
  const m = /Starting metrics server on (\S+?)\/metrics/.exec(text);
  if (!m) return null;
  const addr = m[1];
  const parts = /^([A-Za-z0-9._-]+|\[[0-9A-Fa-f:]+\]):(\d{1,5})$/.exec(addr);
  if (!parts) return null;
  const port = Number(parts[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return addr;
}

// ── 确定性失败特征：cloudflared 因配置/用法错误退出（非网络瞬态）─────────
// 这类失败重试无意义，识别后直接置 error 让用户看到明确原因，而不是
// 误判成"意外退出"退避重连 N 次（issue #35 作者建议）。
function isFatalCloudflaredError(stderrTail) {
  if (!stderrTail) return false;
  return /Incorrect Usage|flag provided but not defined|invalid.*token|unauthorized/i.test(stderrTail);
}

// 上游 release 不提供任何官方校验和文件（已核实 2024.10.0 资产清单），
// 因此无法做下载校验和比对；退而求其次：记录产物 SHA-256 指纹供事后审计比对。
async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(filePath)
      .on('data', (c) => hash.update(c))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

// 解析 cloudflared --version 输出（"cloudflared version 2024.10.0 (built ...)"）为版本号
export function parseCloudflaredVersion(output) {
  const m = /version\s+(\d{4}\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/.exec(output || '');
  return m ? m[1] : null;
}

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

function findSystemCloudflared() {
  const isWin = platform() === 'win32';
  const candidates = [];
  if (isWin) {
    candidates.push('cloudflared.exe', 'cloudflared', 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe', 'C:\\Program Files\\cloudflared\\cloudflared.exe');
  } else {
    candidates.push('cloudflared', '/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared', '/usr/bin/cloudflared', '/bin/cloudflared');
  }

  for (const bin of candidates) {
    try {
      if (bin.includes('/') || bin.includes('\\')) {
        if (!existsSync(bin)) continue;
      }
      execBinSync(bin, ['--version'], { stdio: 'ignore', timeout: 3000 });
      return bin;
    } catch {}
  }
  return null;
}

export class CloudflaredManager {
  /**
   * @param {object} opts
   * @param {string} [opts.binaryPath] 直接指定可执行文件路径（测试注入假 cloudflared 用；
   *   生产不传，走 findSystemCloudflared → ~/.dsh-bridge/bin 的自动准备逻辑）。
   * @param {number} [opts.retryPolicy] 自愈重试策略：
   *   - false / null：禁用自动重启（保持旧版"意外退出置 error"行为）
   *   - 对象 { baseDelayMs, maxDelayMs, maxRetries }：覆盖默认退避参数（默认 5s→5min，12 次封顶）
   * @param {boolean} [opts.noAutoupdate=true] 是否禁用 cloudflared 自身的 autoupdate 自替换。
   *   autoupdate spawn 出的新进程不受本 manager 监督，会破坏"钉死版本 + 可自愈"的语义，默认必须关闭。
   * @param {string} [opts.binaryVersion=CLOUDFLARED_VERSION] 本 manager 期望管理的 cloudflared 版本。
   *   仅对自管理二进制（~/.dsh-bridge/bin）强制校验；系统级全局二进制尊重用户选择、不强制。
   * @param {number} [opts.handshakeTimeoutMs=90000] 等待隧道就绪的握手超时（测试可注入小值）。
   * @param {object} [opts.spawnOptions] 透传给 child_process.spawn 的额外选项（测试注入用，
   *   如 Windows 下需 shell:true 才能运行 .cmd mock；生产不传）。
   * @param {number} [opts.healthProbeIntervalMs=30000] 就绪后运行时探活间隔。
   * @param {number} [opts.healthProbeTimeoutMs=5000] 单次探活总时限。
   * @param {number} [opts.healthDegradedThreshold=3] 连续失败达此数即在面板上显示降级
   *   （默认约 90s——这是"发现故障"的时点）。
   * @param {number} [opts.healthRestartThreshold=10] 连续失败达此数才终止进程强制重建
   *   （默认约 5min）。必须显著大于 degraded 阈值：/ready 无法区分"假死"与
   *   "正在自行重连"，只有持续时长能区分，过早重建会误杀本可自愈的连接器。
   * @param {string|null} [opts.logFilePath=null] cloudflared stdout/stderr 落盘路径；
   *   null 表示不落盘（默认）。生产由调用方显式传入（见 lib/index.js），
   *   避免库的默认行为在单测里往真实运维日志目录写测试内容。
   * @param {number} [opts.logMaxBytes=5242880] 单文件超限后轮转为 `<logFilePath>.1`。
   */
  constructor({ port, home, token, hostname, onStateChange, logger,
    binaryPath, retryPolicy, noAutoupdate = true, binaryVersion = CLOUDFLARED_VERSION,
    handshakeTimeoutMs = HANDSHAKE_TIMEOUT_MS, spawnOptions = null,
    healthProbeIntervalMs = HEALTH_PROBE_INTERVAL_MS,
    healthProbeTimeoutMs = HEALTH_PROBE_TIMEOUT_MS,
    healthDegradedThreshold = HEALTH_DEGRADED_THRESHOLD,
    healthRestartThreshold = HEALTH_RESTART_THRESHOLD,
    logFilePath = null, logMaxBytes = CLOUDFLARED_LOG_MAX_BYTES }) {
    this.port = port;
    this.home = home || join(homedir(), '.dsh-bridge');
    this.token = token ? String(token).trim() : null;
    this.hostname = hostname ? String(hostname).trim() : null;
    this.onStateChange = onStateChange;
    this.logger = logger;

    // 显式注入的可执行文件（测试用）：跳过自动查找/下载，直接按此路径运行
    this._injectedBinaryPath = binaryPath || null;

    // 自愈重试策略：默认开启；false/null 显式禁用（旧版行为）
    if (retryPolicy === false || retryPolicy === null) {
      this.retry = null;
    } else {
      const p = retryPolicy && typeof retryPolicy === 'object' ? retryPolicy : {};
      this.retry = {
        baseDelayMs: p.baseDelayMs ?? RETRY_BASE_MS,
        maxDelayMs: p.maxDelayMs ?? RETRY_MAX_MS,
        maxRetries: p.maxRetries ?? DEFAULT_MAX_RETRIES,
      };
    }

    this.noAutoupdate = noAutoupdate !== false;
    this.binaryVersion = binaryVersion || CLOUDFLARED_VERSION;
    this.handshakeTimeoutMs = handshakeTimeoutMs ?? HANDSHAKE_TIMEOUT_MS;
    // 测试注入的 spawn 选项（如 Windows 的 shell）；生产为 null 不影响默认行为
    this._spawnOptions = spawnOptions || null;

    // 运行时健康探针参数（测试可注入小值）
    this.healthProbeIntervalMs = healthProbeIntervalMs;
    this.healthProbeTimeoutMs = healthProbeTimeoutMs;
    this.healthDegradedThreshold = healthDegradedThreshold;
    this.healthRestartThreshold = healthRestartThreshold;
    this.logFilePath = logFilePath || null;
    this.logMaxBytes = logMaxBytes;

    this.process = null;
    this.url = null;
    this.binaryPath = null;
    this._stopped = false;
    this._retryTimer = null;
    this._restartCount = 0; // 连续启动失败/意外退出次数，就绪后清零

    this._metricsAddress = null; // 本次 spawn 的 cloudflared metrics 地址（探活入口）
    this._metricsParseTail = ''; // metrics 日志行的跨 chunk 拼接缓冲
    this._probeTimer = null;
    this._probeFailures = 0;
    this._probeInFlight = false; // 防重叠探活堆积
    this._probeCount = 0; // 已完成的探活次数（供测试断言探针确实在跑）
    this._probeLogFailures = 0; // 探针日志通道自身抛错的次数（供自查是否丢过日志）
    this._spawnSeq = 0; // spawn 代数：探活结果据此作废，避免算到新进程头上
    this._healthRecovering = false; // 健康探针触发的重建链路中（此期间不允许终态）
    this._readyState = null; // 最近一次 ready 状态，供探活恢复后回写
    this._logStream = null;
    this._logBytesWritten = 0;
    this._redactCarry = ''; // 跨 chunk 的脱敏残留（防 Token 被切分而漏网）
  }

  // 异步启动，立即返回——调用方不需要 await
  start() {
    this._stopped = false;
    this._restartCount = 0;
    this._healthRecovering = false;
    this._probeInFlight = false;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    this._setState('connecting', '正在初始化...');
    this._run().catch((err) => {
      this.logger?.error('cloudflared 启动失败: %s', err.message);
      // 确定性失败（用法错误/配置错误，如 Incorrect Usage）重试无意义 → 直接 error，
      // 让用户看到明确原因；瞬态失败（网络/握手/秒退）才退避自愈
      if (err && err.fatal) {
        this._setState('error', err.message);
        return;
      }
      this._scheduleRestart(`cloudflared 启动失败: ${err.message}`);
    });
  }

  async _run() {
    await this._ensureBinary();
    if (this._stopped) return;
    await this._startProcess();
  }

  // 退避自愈调度：唯一入口在"启动失败"与"就绪后意外退出"。stop()/超限 终止。
  // _healthRecovering 期间（健康探针判定假死后触发的整条重建链路，含重启后握手失败）
  // 永不进入终态——必须覆盖整条链路而不只是那次 kill：重启时网络往往仍不通，
  // 新进程握手失败仍会走这里，若在此处转 error 就把"可自愈的断网"变成人工故障。
  _scheduleRestart(reason) {
    if (this._stopped) return; // 用户已停止，绝不复活
    if (this._retryTimer) return; // 已在倒计时中，避免叠加调度
    if (!this.retry) {
      this._setState('error', reason);
      return;
    }
    this._restartCount++;
    if (this._restartCount > this.retry.maxRetries) {
      if (!this._healthRecovering) {
        this._setState('error', `${reason}（已自动重试 ${this.retry.maxRetries} 次仍失败，请检查网络/Token，或点击「关闭」停止）`);
        return;
      }
      // 健康探针触发的重建链路永不进入终态：长时断网时 cloudflared 自身也是无限退避
      // 重连，这里保持同样语义。退避仍随 _restartCount 增长并封顶 maxDelayMs，
      // 不会退化成高频重启风暴；重新就绪（tryResolve）后该标记自动清除。
    }
    const delay = Math.min(
      this.retry.baseDelayMs * 2 ** (this._restartCount - 1),
      this.retry.maxDelayMs
    );
    // 文案必须如实：健康重建链路会故意突破 maxRetries 持续重试，
    // 若沿用"第 N/M 次"会出现"第 9/2 次"这种自相矛盾的提示，反而误导排障。
    const delayText = delay >= 1000 ? `${Math.round(delay / 1000)}s` : `${delay}ms`;
    const beyondCap = this._restartCount > this.retry.maxRetries;
    this._setState('reconnecting', beyondCap
      ? `${reason}，${delayText} 后继续自动重连（已重试 ${this._restartCount} 次；隧道长时间无法建立，请检查网络与 Token）`
      : `${reason}，${delayText} 后自动重连（第 ${this._restartCount}/${this.retry.maxRetries} 次）`);
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this._restartAttempt();
    }, delay);
  }

  // 一次实际的自愈尝试：成功（ready）后 _restartCount 清零，失败/退出由 exit/超时/异常再次调度
  _restartAttempt() {
    if (this._stopped) return;
    this._setState('connecting', '正在自动重连...');
    this._run().catch((err) => {
      this.logger?.error('cloudflared 自动重连失败: %s', err.message);
      // 自愈期间遇到确定性失败同样终止重试（如用户改坏配置后重启）
      if (err && err.fatal) {
        this._setState('error', err.message);
        return;
      }
      this._scheduleRestart(`cloudflared 启动失败: ${err.message}`);
    });
  }

  _terminateProcess() {
    const p = this.process;
    if (!p) return;
    try {
      if (platform() === 'win32') {
        // Windows 不支持 SIGTERM，用 taskkill 强制终止
        spawn('taskkill', ['/pid', String(p.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        p.kill('SIGTERM');
      }
    } catch {}
  }

  // 校验自管理二进制是否匹配期望版本；系统级二进制不校验（尊重用户安装）
  _checkManagedBinaryVersion(binPath) {
    try {
      const out = execBinSync(binPath, ['--version'], { encoding: 'utf8', timeout: 3000 });
      const ver = parseCloudflaredVersion(out);
      if (!ver) return { ok: false, reason: `无法解析版本输出: ${(out || '').trim().slice(0, 80)}` };
      if (ver !== this.binaryVersion) {
        return { ok: false, reason: `版本不匹配: 期望 ${this.binaryVersion}，实际 ${ver}` };
      }
      return { ok: true, version: ver };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  async _ensureBinary() {
    // 0. 测试注入的可执行文件：直接使用，跳过查找/下载/版本校验
    if (this._injectedBinaryPath) {
      this.binaryPath = this._injectedBinaryPath;
      return;
    }

    // 1. 优先使用系统环境变量或 Homebrew / 包管理器已安装的全局二进制（尊重用户版本，不做强制校验）
    const systemBin = findSystemCloudflared();
    if (systemBin) {
      this.binaryPath = systemBin;
      this.logger?.info('优先使用系统全局 cloudflared: %s', systemBin);
      return;
    }

    const { url, name } = getCloudflaredInfo();
    const binDir = join(this.home, 'bin');
    const binPath = join(binDir, name);
    this.binaryPath = binPath;

    // 2. 检查本地 ~/.dsh-bridge/bin/cloudflared 是否已存在且可用
    if (existsSync(binPath)) {
      try {
        const s = await stat(binPath);
        if (s.size > MIN_BINARY_SIZE) { // >5MB 才视为有效二进制
          // 检查是否为历史残留未解压的 gzip 压缩包 (0x1f 0x8b)
          const fd = readFileSync(binPath);
          const isGzip = fd.length >= 2 && fd[0] === 0x1f && fd[1] === 0x8b;
          if (isGzip) {
            this.logger?.warn('检测到历史残留的未解压 cloudflared.tgz 压缩包，正在清理重新准备...');
            await unlink(binPath).catch(() => {});
          } else {
            // macOS / Linux 赋予可执行权限并清除 Gatekeeper 隔离属性
            if (platform() !== 'win32') {
              await chmod(binPath, 0o755).catch(() => {});
              if (platform() === 'darwin') {
                try { execBinSync('xattr', ['-d', 'com.apple.quarantine', binPath], { stdio: 'ignore' }); } catch {}
              }
            }
            // 版本钉死校验：cloudflared autoupdate 可能已把钉死的版本自替换成新版，
            // 自管理二进制必须与期望版本一致，否则回滚重下——版本控制权留在插件手里。
            const check = this._checkManagedBinaryVersion(binPath);
            if (check.ok) {
              this.logger?.info('cloudflared 已存在且验证通过: %s (version=%s)', binPath, check.version);
              return;
            }
            this.logger?.warn('现有 cloudflared 二进制验证失败（%s），准备重新下载', check.reason);
          }
        }
      } catch (verifyErr) {
        this.logger?.warn('现有 cloudflared 二进制验证失败 (%s)，准备重新下载', verifyErr.message);
      }
      // 损坏 / 版本不符 / 无法执行：删掉重下
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

      if (url.endsWith('.tgz') || url.endsWith('.tar.gz')) {
        try {
          execBinSync('tar', ['-xzf', tempPath, '-C', binDir]);
          await unlink(tempPath).catch(() => {});
        } catch (tarErr) {
          this.logger?.error('解压 cloudflared 压缩包失败: %s', tarErr.message);
          throw new Error(`解压 cloudflared 失败: ${tarErr.message}`, { cause: tarErr });
        }
      } else {
        if (existsSync(binPath)) await unlink(binPath).catch(() => {});
        await rename(tempPath, binPath);
      }

      if (platform() !== 'win32') {
        await chmod(binPath, 0o755).catch(() => {});
        if (platform() === 'darwin') {
          try { execBinSync('xattr', ['-d', 'com.apple.quarantine', binPath], { stdio: 'ignore' }); } catch {}
        }
      }

      // 下载产物也必须通过版本校验（钉死版本）
      const check = this._checkManagedBinaryVersion(binPath);
      if (!check.ok) {
        throw new Error(`下载的 cloudflared 版本校验失败: ${check.reason}`);
      }
      this.logger?.info('cloudflared 下载并准备完成 (version=%s, sha256=%s)', check.version, await sha256File(binPath));
    } catch (err) {
      await unlink(tempPath).catch(() => {});
      throw new Error(`准备 cloudflared 失败: ${err.message}`, { cause: err });
    }
  }

  _startProcess() {
    return new Promise((resolve, reject) => {
      if (this._stopped) return reject(new Error('已取消'));

      this._setState('connecting', this._restartCount > 0 ? '正在自动重连...' : '正在连接 Cloudflare...');

      const args = this.token
        // --no-autoupdate 是 tunnel 子命令的全局 flag，须在 run 之前（cloudflared 2024.10.0，issue #35）
        ? ['tunnel', ...(this.noAutoupdate ? ['--no-autoupdate'] : []), 'run', '--token', this.token]
        : ['tunnel', ...(this.noAutoupdate ? ['--no-autoupdate'] : []), '--url', `http://127.0.0.1:${this.port}`];

      // 隐藏日志中的 token 敏感字段
      const safeArgs = this.token ? args.map((a) => (a === this.token ? '***' : a)) : args;
      this.logger?.info('启动 cloudflared: %s %s', this.binaryPath, safeArgs.join(' '));

      // 环境变量双保险禁用 autoupdate（部分打包/脚本以 env 方式读取）
      const spawnEnv = this.noAutoupdate
        ? { ...process.env, NO_AUTOUPDATE: 'true' }
        : process.env;

      const proc = spawn(this.binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: spawnEnv,
        ...(this._spawnOptions || {}),
      });
      this.process = proc;

      // 本次 spawn 独立状态：metrics 地址与日志流都随进程生命周期重建；
      // 代数（_spawnSeq）用于让飞行中的旧探活结果作废——重启后 cloudflared 很
      // 可能复用同一个 metrics 端口，仅比对地址字符串不足以识别"这是新进程"。
      this._metricsAddress = null;
      this._metricsParseTail = '';
      this._spawnSeq++;
      this._openLogStream();

      let resolved = false;
      let timeoutTimer = null;
      // 累积 stderr 尾部（供 exit 时判断确定性失败：CLI 用法错误 / 配置错误）
      let stderrTail = '';

      // 仅当当前引用的仍是本次 spawn 的进程时才清空——自愈重启后旧进程的
      // exit 事件可能晚于新进程 spawn 触发；exit handler 内用 stillCurrent
      // （this.process === proc）判定，避免误清新进程引用（stop() 将无法终止它）。

      const tryResolve = () => {
        if (!resolved) {
          resolved = true;
          if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
          }
          // 迟到的就绪必须撤回"已排定的重试"。
          //
          // 实测竞态（Windows 上假件 spawn 延迟 ~390–411ms 恰好压着 handshakeTimeoutMs=400ms）：
          // 握手超时先触发 → _terminateProcess() + reject → _scheduleRestart() 排定 20ms 后的
          // 重试；紧接着同一进程才吐出 "Registered tunnel connection" → 走到这里。
          // 此时若留着那枚定时器，20ms 后 _restartAttempt() 会把**已经就绪的**连接器再杀一次：
          // 既白白多一轮重启，又把 _restartCount（此处刚清零）重新推向 maxRetries →
          // 偶发进入终态 error，正是本模块最该避免的"可自愈的断网变成人工故障"。
          //
          // 两个前置条件缺一不可：
          //   1) this.process === proc —— 只撤本次 spawn 的重试，绝不误撤新进程那条链；
          //   2) 进程仍存活（无 exitCode/signalCode）—— 若它其实已经退出，那枚定时器就是
          //      这条链**唯一**的重启来源（exit 处理器早已因 _retryTimer 非空而提前返回），
          //      撤回会让隧道永久无人接管。宁可多一次多余重启，也不能留下死隧道。
          const procAlive = proc.exitCode === null && proc.signalCode === null;
          if (this._retryTimer && this.process === proc && procAlive) {
            clearTimeout(this._retryTimer);
            this._retryTimer = null;
          }
          // 就绪即证明链路可用：连续失败计数清零，并退出"健康重建"模式
          this._restartCount = 0;
          this._healthRecovering = false;
          this._startHealthProbe(); // 就绪后才探活：启动阶段的问题由握手超时/exit 负责
          resolve();
        }
      };

      // 1. 命名/Token 隧道：通过握手日志判定就绪，使用预设固定域名
      const parseNamedTunnel = (text) => {
        if (!this.token) return;
        if (
          (text.includes('Registered tunnel') ||
           text.includes('registered connIndex') ||
           text.includes('Connection') && text.includes('registered') ||
           text.includes('Updated to new configuration') ||
           text.includes('Route propagated')) &&
          !resolved
        ) {
          let fixedUrl = this.hostname
            ? (this.hostname.startsWith('http') ? this.hostname : `https://${this.hostname}`)
            : null;
          this.url = fixedUrl;
          this._setState('ready', fixedUrl ? `固定隧道已建立 (${fixedUrl})` : '固定隧道已建立');
          this.logger?.info('cloudflared 固定隧道就绪: %s', this.url || 'Token 模式');
          tryResolve();
        }
      };

      // 2. 免费临时隧道：从 stdout/stderr 解析随机分配的 trycloudflare.com 域名
      const parseUrl = (text) => {
        if (this.token) {
          parseNamedTunnel(text);
          return;
        }
        const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          this.url = match[0];
          this._setState('ready', '临时隧道已建立');
          this.logger?.info('cloudflared 临时隧道就绪: %s', this.url);
          tryResolve();
        }
      };

      // metrics 地址必须先于就绪文本被记录：cloudflared 是先起 metrics 服务再注册连接。
      // 两处稳健性处理：
      //  1) 该日志行本身也可能被 chunk 切断 → 用滚动缓冲拼接后再匹配；
      //  2) 地址可能"迟到"（就绪时还没解析到）→ 一旦补上就补启探活，否则安全网永久不启用。
      const captureMetricsAddress = (text) => {
        if (this._metricsAddress) return;
        const buffered = (this._metricsParseTail + text).slice(-512);
        this._metricsParseTail = buffered;
        const addr = parseMetricsAddress(buffered);
        if (!addr) return;
        this._metricsAddress = addr;
        if (resolved && !this._stopped && !this._probeTimer) {
          this._probeLog('info', 'metrics 地址在就绪后才解析到，补启运行时健康探活: %s', addr);
          this._startHealthProbe();
        }
      };

      proc.stdout.on('data', (d) => {
        const text = d.toString();
        this._appendCloudflaredLog(text);
        captureMetricsAddress(text);
        parseUrl(text);
      });
      proc.stderr.on('data', (d) => {
        const text = d.toString();
        this.logger?.debug('cloudflared: %s', text.trim());
        this._appendCloudflaredLog(text);
        captureMetricsAddress(text);
        stderrTail = (stderrTail + text).slice(-2000); // 只保留尾部 2KB
        parseUrl(text);
        if (text.includes('Registered tunnel') && !resolved) {
          this._setState('connecting', '隧道已注册，等待就绪...');
        }
      });

      proc.on('exit', (code, signal) => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        // 探活定时器与日志流都绑定本次 spawn，退出即回收（自愈会重新建立）
        this._stopHealthProbe();
        this._closeLogStream();
        // exit 时"仍是当前进程"才允许清理引用 + 调度自愈。
        // 自愈已 spawn 新进程后，旧进程迟到的 exit 不满足 stillCurrent → 静默，
        // 避免"新进程连接中、旧 exit 又触发一次重启"的竞态（否则会叠出第三进程）。
        const stillCurrent = this.process === proc;
        if (stillCurrent) this.process = null;
        this.url = null;
        if (!resolved) {
          // 就绪前退出 = 启动失败，交给 reject → start()/restart 的 catch 进入退避自愈。
          // 若 stderr 显示确定性配置/用法错误（Incorrect Usage 等）→ 标 fatal，
          // catch 收到后直接置 error，不再无意义退避重连。
          const msg = `cloudflared 启动失败: ${isFatalCloudflaredError(stderrTail) ? '配置错误（' + (stderrTail.trim().split('\n').pop() || '请检查 Token 与参数') + '）' : `cloudflared 退出，code=${code ?? ''} signal=${signal ?? ''}`}`;
          const err = new Error(msg);
          if (isFatalCloudflaredError(stderrTail)) err.fatal = true;
          reject(err);
        } else if (!this._stopped && stillCurrent) {
          // 就绪后的意外退出（崩溃 / OOM / 误杀 / autoupdate 残留自替换 / 健康探针判定假死）
          // → 退避自愈。是否允许终态由 _scheduleRestart 依 _healthRecovering 判定。
          this._scheduleRestart(`cloudflared 进程意外退出 (code=${code ?? ''}${signal ? `, ${signal}` : ''})`);
        } else {
          this._setState('idle', '');
        }
      });

      proc.on('error', (err) => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        this._stopHealthProbe();
        this._closeLogStream();
        if (!resolved) reject(err);
      });

      // 握手超时：只终止进程、不置 _stopped——让退出/重试路径接管（kill 后进程
      // exit 会触发 reject；此处兜底 reject 保证进程僵死时也能推进）
      timeoutTimer = setTimeout(() => {
        if (!resolved) {
          this.logger?.warn('等待隧道 URL 超时（%ss），终止进程并进入自动重试', Math.round(this.handshakeTimeoutMs / 1000));
          this._terminateProcess();
          reject(new Error(`等待隧道 URL 超时（${Math.round(this.handshakeTimeoutMs / 1000)}秒）`));
        }
      }, this.handshakeTimeoutMs);
    });
  }

  // ── cloudflared 输出落盘（含 Token 脱敏与大小轮转）──────────────────────

  // Token 属敏感凭据，落盘前一律替换；不依赖上游是否会自行脱敏。
  //
  // 关键：stderr 的 'data' 事件不保证按行对齐，Token 可能被切分在两个块之间。
  // 这里用**逐字符扫描**而不是"整块 split 替换"：
  //   - 任意位置命中完整 Token → 替换为 ***（完整 Token 绝不会明文落盘）；
  //   - 只在"剩余不足一个 Token 长度、且恰好是 Token 前缀"时才扣住，等下一块补齐。
  // 不能退化成"扣掉最长的 Token 前缀后缀"这种简化写法：若 Token 自身存在 border
  // （例如首尾字符相同），完整 Token 结尾处也会被误判成前缀而扣下一截，结果前半段
  // 与扣下的那截先后写出、在文件里重新拼成完整 Token（已实测的泄漏路径）。
  _redactToken(text) {
    if (!this.token) return text;
    const token = this.token;
    const L = token.length;
    const combined = this._redactCarry + text;
    this._redactCarry = '';
    let out = '';
    let i = 0;
    while (i < combined.length) {
      if (i + L <= combined.length && combined.startsWith(token, i)) {
        out += '***';
        i += L;
        continue;
      }
      if (i + L > combined.length) {
        const rest = combined.slice(i);
        if (token.startsWith(rest)) {
          this._redactCarry = rest; // 可能是被切开的 Token 前半段
          break;
        }
      }
      out += combined[i];
      i++;
    }
    return out;
  }

  _openLogStream() {
    this._closeLogStream(); // 幂等：自愈重启时先关掉上一个进程的流，避免句柄堆积
    if (!this.logFilePath) return;
    try {
      mkdirSync(dirname(this.logFilePath), { recursive: true });
      // 同步把文件建出来：createWriteStream 是异步 open，若不在此时落地，
      // 紧随其后的轮转判定会遇到"文件还没存在"而 rename 落空（运行中轮转失效）。
      writeFileSync(this.logFilePath, '', { flag: 'a' });
      this._rotateIfOversize();
      this._logBytesWritten = existsSync(this.logFilePath) ? statSync(this.logFilePath).size : 0;
    } catch (err) {
      // 目录创建/建文件/取大小失败：不阻断日志写入，但必须让问题可见
      this.logger?.warn('cloudflared 日志目录或文件准备失败（本次可能不落盘）: %s', err.message);
    }
    try {
      const stream = createWriteStream(this.logFilePath, { flags: 'a' });
      stream.on('error', (err) => {
        // 流已不可写：置空引用，避免后续继续往死流写并重复刷同一条告警
        this._logStream = null;
        this.logger?.warn('cloudflared 日志写入失败: %s', err.message);
      });
      this._logStream = stream;
    } catch (err) {
      this._logStream = null;
      this.logger?.warn('无法打开 cloudflared 日志文件 %s: %s', this.logFilePath, err.message);
    }
  }

  _rotateIfOversize() {
    if (!this.logFilePath) return;
    try {
      if (existsSync(this.logFilePath) && statSync(this.logFilePath).size >= this.logMaxBytes) {
        renameSync(this.logFilePath, `${this.logFilePath}.1`);
        this._logBytesWritten = 0;
      }
    } catch (err) {
      this.logger?.warn('cloudflared 日志轮转失败（继续追加写）: %s', err.message);
    }
  }

  _closeLogStream() {
    // 无论流是否可用，carry 都必须清空——否则残留的 Token 片段会污染下一个
    // 进程的第一行日志（流先报 error 置空、随后 close 早退的场景实测可复现）。
    const carry = this._redactCarry;
    this._redactCarry = '';
    if (!this._logStream) return;
    // 流关闭时仍扣着的必然是 Token 的一个前缀（见 _redactToken）：以占位符收尾。
    // 取舍说明：这会牺牲最多 token.length-1 个正常字符的日志保真度，
    // 但换来"任何 Token 片段都不落盘"。极端情况下宁可少一行尾巴，不可留密钥片段。
    if (carry) this._logStream.write('***');
    this._logStream.end();
    this._logStream = null;
  }

  _appendCloudflaredLog(text) {
    if (!this._logStream || !text) return;
    const out = this._redactToken(text);
    if (!out) return;
    const bytes = Buffer.byteLength(out, 'utf8');
    // 运行中也检查轮转：只在 spawn 时检查会让长寿命进程把日志写爆。
    // 这里按"本次运行已写入字节数"判定，不依赖 statSync——写流是异步的，
    // 刚写完就 stat 可能仍是旧大小，会造成轮转判定抖动。
    if (this._logBytesWritten + bytes >= this.logMaxBytes) {
      this._closeLogStream();
      this._renameToRotated();
      this._openLogStream();
      if (!this._logStream) return;
    }
    this._logStream.write(out);
    this._logBytesWritten += bytes;
  }

  _renameToRotated() {
    if (!this.logFilePath) return;
    try {
      if (existsSync(this.logFilePath)) renameSync(this.logFilePath, `${this.logFilePath}.1`);
    } catch (err) {
      this.logger?.warn('cloudflared 日志轮转失败（继续追加写）: %s', err.message);
    }
    this._logBytesWritten = 0;
  }

  // ── 运行时健康探针 ──────────────────────────────────────────────────────

  // 就绪后启动探活。metrics 地址解析失败时显式告警并跳过——绝不静默降级，
  // 也绝不在没有可信探活通道的情况下误杀进程；同时把降级写进面板可见的状态详情，
  // 否则"整个安全网失效"只会是一行没人看的 journal warning（本次事故的教训）。
  // 探针专用安全日志：探针跑在定时器与子进程数据回调里，异常没有任何上层接住，
  // 一旦 logger 自身抛错就会变成未处理 rejection —— Node 默认 unhandled-rejections=throw
  // 会直接结束宿主进程，即"本该保护服务的探针把服务干掉"。故此处绝不允许抛出。
  _probeLog(level, msg, ...args) {
    try {
      this.logger?.[level]?.(msg, ...args);
    } catch (logErr) {
      // 日志通道本身故障：此处再抛就会拖垮宿主进程，故刻意吞掉。
      // 这不是"静默降级"——要输出的降级信息本身就在这条已损坏的通道上，无处可写；
      // 且关键降级仍经 _setState → 面板独立可见，不依赖 logger。
      // 注意：该计数目前只在单测中被读取，生产尚无出口（后续可接入面板/统计），
      // 因此不要把它当作"生产可自查"的手段。
      this._probeLogFailures++;
    }
  }

  _startHealthProbe() {
    this._stopHealthProbe();
    if (!this._metricsAddress) {
      const detail = `${this._readyState?.detail || '隧道已建立'}；⚠️ 运行时健康探活未启用`
        + '（未识别到 cloudflared metrics 地址），连接器若静默假死将无法自动发现';
      this._probeLog('warn', '未从 cloudflared 输出识别到 metrics 地址，本次运行跳过健康探活'
        + '（连接器若静默假死将无法自动发现，请检查 cloudflared 版本是否变更了 metrics 日志文案）');
      // record:false —— 这是降级提示，不能污染"纯净的 ready 详情"，
      // 否则地址迟到后补启探活时将无法把面板文案恢复成正常状态。
      this._setState('ready', detail, { record: false });
      return;
    }
    // 地址迟到后补启探活：把面板文案恢复为正常的 ready 详情
    if (this._readyState) this._setState(this._readyState.phase, this._readyState.detail);
    this._probeTimer = setInterval(() => {
      // 必须显式 catch：探针里任何逃逸的异常（如畸形 metrics 地址让 http.get 同步抛错）
      // 都会变成未处理 rejection，而 Node 默认 unhandled-rejections=throw 会直接
      // 结束整个 DSH 主进程 —— 那正是探针本该防止的"服务整体消失"。
      // 用 _probeLog 而非 logger 直调：catch 处理器自身也不允许再抛。
      this._probeOnce().catch((err) => {
        this._probeLog('warn', '健康探活出现未预期异常（已忽略，不影响连接器运行）: %s', err?.message ?? err);
      });
    }, this.healthProbeIntervalMs);
    this._probeTimer.unref?.(); // 不因探活定时器而阻止进程退出
  }

  _stopHealthProbe() {
    if (this._probeTimer) {
      clearInterval(this._probeTimer);
      this._probeTimer = null;
    }
    this._probeFailures = 0;
  }

  async _probeOnce() {
    // 防重叠：单次探活最长 healthProbeTimeoutMs，若上一轮还没结论就不再叠加请求
    if (this._probeInFlight) return;
    const addr = this._metricsAddress;
    if (!addr) return;
    const seq = this._spawnSeq; // spawn 代数：据此识别"结果属于哪个进程"

    this._probeInFlight = true;
    let result;
    try {
      result = await this._checkTunnelReady(addr);
    } catch (err) {
      // 兜底：探针内部任何异常都不得向外逃逸（见 setInterval 处的说明）
      result = { healthy: false, reason: `探针内部异常: ${err?.message ?? err}` };
    } finally {
      this._probeInFlight = false;
    }
    this._probeCount++;

    // 探活期间可能已被 stop()、或已自愈重启到新进程 → 结果作废。
    // 必须比对代数而非地址：重启后 cloudflared 很可能复用同一个 metrics 端口。
    if (this._stopped || this._spawnSeq !== seq) return;

    if (result.healthy) {
      if (this._probeFailures >= this.healthDegradedThreshold) {
        this._probeLog('info', '隧道健康探活已自行恢复（此前连续失败 %d 次）', this._probeFailures);
        if (this._readyState) this._setState(this._readyState.phase, this._readyState.detail);
      }
      this._probeFailures = 0;
      return;
    }

    this._probeFailures++;
    const fails = this._probeFailures;
    const why = result.reason || '未知原因';

    if (fails === this.healthDegradedThreshold) {
      // 第一级：可见降级。此时不杀进程——/ready 为 503 也可能只是 cloudflared
      // 正在按自身退避重连，过早介入反而会把本可自愈的故障变成人工故障。
      this._probeLog('warn', '隧道健康探活连续 %d 次失败（%s）：连接器可能已无健康边缘连接，'
        + '转入降级观察，达 %d 次将强制重建', fails, why, this.healthRestartThreshold);
      this._setState('reconnecting', `健康探活连续 ${fails} 次失败：连接器已无健康边缘连接，`
        + `正在观察能否自行恢复（${fails}/${this.healthRestartThreshold}）`);
    } else if (fails < this.healthDegradedThreshold) {
      this._probeLog('warn', '隧道健康探活失败（第 %d/%d 次）: %s；原因: %s',
        fails, this.healthRestartThreshold, addr, why);
    } else {
      this._probeLog('warn', '隧道健康探活仍失败（第 %d/%d 次）: %s', fails, this.healthRestartThreshold, why);
    }

    if (fails < this.healthRestartThreshold) return;

    // 第二级：持续不恢复 → 判定假死，强制重建。
    // 置 _healthRecovering：整条重建链路（含重启后握手失败）都不允许进入终态。
    this._probeLog('error', '隧道连接器连续 %d 次探活失败（约 %d 分钟）：判定为假死，'
      + '终止进程以触发重建；该重建不设终态上限，网络恢复后仍会自愈',
    fails, Math.round(fails * this.healthProbeIntervalMs / 60000));
    this._stopHealthProbe();
    this._healthRecovering = true;
    this._terminateProcess(); // 不自行重启：交给 exit → _scheduleRestart 既有链路
  }

  // 探活判据：HTTP 200 且 readyConnections > 0（与 cloudflared 官方 /ready 语义一致）。
  // 返回 { healthy, reason }：reason 会进入 warn 级日志，生产关闭 debug 时也能看到原因。
  // 注意：http 的 timeout 选项只是 **socket 不活动** 超时，不是总时限——对"持续滴流
  // 字节"的响应永不触发，因此这里额外加一个绝对截止时间兜底。
  _checkTunnelReady(addr) {
    return new Promise((resolve) => {
      let settled = false;
      let deadline = null;
      let req = null;
      const done = (healthy, reason) => {
        if (settled) return;
        settled = true;
        if (deadline) clearTimeout(deadline);
        try { req?.destroy(); } catch { /* 已结束的请求 destroy 无害 */ }
        resolve({ healthy, reason });
      };

      deadline = setTimeout(() => {
        done(false, `探活超过总时限 ${this.healthProbeTimeoutMs}ms`);
      }, this.healthProbeTimeoutMs);

      // httpGet 对畸形 URL 会同步抛错；虽然 parseMetricsAddress 已在入口校验，
      // 这里再兜一层，确保该函数永不向外抛（否则会变成未处理 rejection 拖垮主进程）。
      try {
        req = httpGet(`http://${addr}/ready`, { timeout: this.healthProbeTimeoutMs }, (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            if (res.statusCode !== 200) {
              done(false, `HTTP ${res.statusCode}`);
              return;
            }
            try {
              const parsed = JSON.parse(body);
              const conns = Number(parsed?.readyConnections);
              done(conns > 0, conns > 0 ? '' : `HTTP 200 但 readyConnections=${parsed?.readyConnections}`);
            } catch (err) {
              done(false, `响应无法解析为 JSON: ${err.message}`);
            }
          });
        });
      } catch (err) {
        done(false, `无法发起探活请求（地址可能非法）: ${err.message}`);
        return;
      }
      req.on('timeout', () => { done(false, `socket 不活动超过 ${this.healthProbeTimeoutMs}ms`); });
      req.on('error', (err) => { done(false, `请求失败: ${err.message}`); });
    });
  }

  _setState(phase, detail, { record = true } = {}) {
    // 记住最近一次"纯净"的 ready 状态：探活由降级恢复、或地址迟到后补启探活时
    // 要回写它，避免面板长期停留在降级文案上（record:false 用于降级提示本身）。
    if (phase === 'ready' && record) this._readyState = { phase, detail };
    this.onStateChange?.({ phase, detail });
  }

  stop() {
    this._stopped = true;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    this._restartCount = 0;
    this._stopHealthProbe();
    this._closeLogStream();
    if (this.process) {
      this.logger?.info('停止 cloudflared...');
      this._terminateProcess();
      this.process = null;
    }
    this.url = null;
    this._setState('idle', '');
  }
}
