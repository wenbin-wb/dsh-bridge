// dsh-bridge 飞书 Slash Command（斜杠指令面板）同步
//
// 官方文档：docs/dev/lark-sdk/official-slash-command.md（"飞书智能体支持 Slash Command"）
//
// 该能力未包含在任何官方 Node SDK 中（@larksuite/channel / @larksuiteoapi/node-sdk 均无对应方法），
// 因此这里按官方文档直连 HTTP：管理接口为 application v7 的复数路径
//   POST   /open-apis/application/v7/app_slash_commands        创建（需 application:app_slash_command:write）
//   GET    /open-apis/application/v7/app_slash_commands        列表（需 ...:read）
//   PATCH  /open-apis/application/v7/app_slash_commands/:id    更新
//   DELETE /open-apis/application/v7/app_slash_commands/:id    删除
//
// 已知约束（文档要点）：客户端需 PC ≥7.70 / 移动端 ≥7.71 才显示面板；每应用上限 100 条；
// command 名称唯一（重名创建返回 code 40000000 + "command already exists"）；删除后同名可重建；
// 生效延迟为服务端约 5 分钟 + 客户端缓存约 3 分钟。

export const SLASH_COMMAND_API_PATH = '/open-apis/application/v7/app_slash_commands'

/**
 * 图标统一使用官方默认值：实测（2026-10 生产验证）创建/更新时传入文档清单内的其他 icon_key
 * 都会被服务端静默忽略——PATCH 返回 code 0，但 GET 列表里始终是 `skill_outlined`。
 * 因此这里不写自定义图标，避免"每次同步都判定为需要更新"的无效 PATCH。
 */
const DEFAULT_ICON = 'skill_outlined'

/**
 * 期望注册的斜杠指令：与 lib/platform/commands.js 的文本指令一一对应（command 字段不带前导斜杠）。
 */
export const DESIRED_SLASH_COMMANDS = [
  { command: 'help', icon: DEFAULT_ICON, zh: '查看可用指令与用法', en: 'Show available commands' },
  { command: 'new', icon: DEFAULT_ICON, zh: '新建会话并开始任务（可跟提示词）', en: 'Start a new session' },
  { command: 'sessions', icon: DEFAULT_ICON, zh: '列出历史会话', en: 'List sessions' },
  { command: 'use', icon: DEFAULT_ICON, zh: '切换到指定编号的会话', en: 'Switch session by index' },
  { command: 'rename', icon: DEFAULT_ICON, zh: '重命名当前会话', en: 'Rename current session' },
  { command: 'workspaces', icon: DEFAULT_ICON, zh: '查看已注册工作区', en: 'List workspaces' },
  { command: 'addworkspace', icon: DEFAULT_ICON, zh: '添加工作区目录', en: 'Add a workspace directory' },
  { command: 'status', icon: DEFAULT_ICON, zh: '查看 Agent 运行状态', en: 'Show agent status' },
  { command: 'stop', icon: DEFAULT_ICON, zh: '停止当前正在执行的任务', en: 'Stop the running task' },
  { command: 'end', icon: DEFAULT_ICON, zh: '结束当前会话', en: 'End the current session' },
  { command: 'diff', icon: 'update-ai_outlined', zh: '导出本轮改动的 .patch 补丁', en: "Export this turn's changes as a .patch" },
  { command: 'model', icon: DEFAULT_ICON, zh: '查看 / 切换模型（/model 列表，/model 2 选择）', en: 'List or switch models' },
  { command: 'ask', icon: DEFAULT_ICON, zh: '回答 Agent 的提问（/ask 1 选第 1 项）', en: 'Answer the Agent\'s question' },
]

/** 权限类错误码（文档 "典型错误码"）：视为"应用没开通斜杠指令权限"，不再重试 */
const PERMISSION_ERROR_CODES = new Set([99991640, 99991661, 99991663])

function isBizError(body) {
  return Boolean(body) && typeof body.code === 'number' && body.code !== 0
}

function errorInfo(body, command) {
  return {
    code: typeof body?.code === 'number' ? body.code : undefined,
    message: String(body?.msg ?? body?.message ?? body ?? 'unknown error'),
    command: command ?? undefined,
  }
}

function isAlreadyExists(body) {
  return /already exists/i.test(String(body?.msg ?? ''))
}

function isNotFound(body) {
  return /not found/i.test(String(body?.msg ?? ''))
}

/**
 * 归一化已记录的指令映射：字符串视为 { id, ours: false }（保守：不认为是自己创建的，永不删除）。
 */
export function normalizeManagedIds(managedIds = {}) {
  const out = {}
  for (const [command, value] of Object.entries(managedIds ?? {})) {
    if (!value) continue
    if (typeof value === 'string') out[command] = { id: value, ours: false }
    else if (typeof value === 'object' && value.id) out[command] = { id: String(value.id), ours: value.ours === true }
  }
  return out
}

export function isPermissionErrorCode(code) {
  return PERMISSION_ERROR_CODES.has(Number(code))
}

/** 创建/更新的请求体（icon 按文档放在 description 内） */
export function buildSlashCommandPayload(spec) {
  return {
    command: spec.command,
    description: {
      default_value: spec.zh,
      i18n: { zh_cn: spec.zh, en_us: spec.en },
      icon: { icon_key: spec.icon },
    },
  }
}

/**
 * 列表项与期望是否一致（列表响应把 icon 放在顶层，创建请求放在 description 内，两处都读）。
 * 图标也参与比较：服务端当前只回默认图标，传自定义图标会被忽略——若不比较，就会每次同步都白 PATCH。
 */
export function slashCommandMatches(existing, spec) {
  const description = existing?.description ?? {}
  const i18n = description.i18n ?? {}
  const iconKey = existing?.icon?.icon_key ?? description.icon?.icon_key ?? ''
  return String(description.default_value ?? '') === spec.zh
    && String(i18n.zh_cn ?? '') === spec.zh
    && String(i18n.en_us ?? '') === spec.en
    && iconKey === spec.icon
}

/** 统一读取业务响应体：SDK 的默认 HTTP 实例已由拦截器剥离到业务体，自定义实例可能包一层 data */
function readBody(res) {
  if (isBizError(res)) return res
  if (res?.data && typeof res.data.code === 'number') return res.data
  return res
}

async function callApi(client, token, { method, path, data }) {
  const headers = { Authorization: `Bearer ${token}` }
  if (data !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8'
  const url = `${client.domain}${path}`
  try {
    const res = await client.httpInstance.request({ url, method, headers, data })
    return readBody(res)
  } catch (err) {
    // 非 2xx（如 400 缺 Token / Token 无效）由 axios 抛出，业务体在 err.response.data
    const body = err?.response?.data
    if (body) return readBody(body)
    throw err
  }
}

/**
 * 同步斜杠指令到期望清单（幂等）：
 *   - 缺失 → 创建（记为 ours: true）
 *   - 存在但描述/图标不一致 → 更新（保留原归属：同名同名指令若本非本插件创建，记为 ours: false）
 *   - 存在且一致 → 采用（不写）
 *   - 仅【本插件创建过（ours: true）】且已不在清单内 → 删除
 *
 * managedIds 形如 { [command]: { id, ours } }；字符串形式按 { id, ours: false } 保守处理（只读不删）。
 *
 * @param {object} opts
 * @param {object} opts.client     底层 node-sdk Client（channel.rawClient）
 * @param {() => Promise<string>} opts.getToken 取 tenant_access_token（调用方负责缓存）
 * @param {object} [opts.logger]
 * @param {Array}  [opts.desired]  期望清单
 * @param {object} [opts.managedIds] 之前记录的 { command: { id, ours } }
 * @returns {Promise<{ok:boolean, ids:object, created:string[], updated:string[], adopted:string[], deleted:string[], error?:object}>}
 */
export async function syncSlashCommands({
  client,
  getToken,
  logger,
  desired = DESIRED_SLASH_COMMANDS,
  managedIds = {},
} = {}) {
  const result = { ok: false, ids: normalizeManagedIds(managedIds), created: [], updated: [], adopted: [], deleted: [], error: null }
  const ids = normalizeManagedIds(managedIds)
  const desiredNames = new Set(desired.map((item) => item.command))

  let token
  try {
    token = await getToken()
  } catch (err) {
    result.error = errorInfo(err)
    return result
  }

  try {
    return await syncWithToken({ client, token, desired, managedIds, result, ids, desiredNames })
  } catch (err) {
    // 网络异常等非业务错误：保留已完成进度，交由调用方决定是否重试
    result.ids = ids
    result.error = errorInfo(err)
    return result
  }
}

async function syncWithToken({ client, token, desired, managedIds, result, ids, desiredNames }) {
  const listRes = await callApi(client, token, { method: 'GET', path: SLASH_COMMAND_API_PATH })
  if (isBizError(listRes)) {
    result.error = errorInfo(listRes)
    return result
  }
  const items = Array.isArray(listRes?.data?.items) ? listRes.data.items : []
  const byName = new Map(items.filter((item) => item?.command).map((item) => [item.command, item]))

  for (const spec of desired) {
    const found = byName.get(spec.command)
    if (found?.command_id) {
      // 归属沿用既有记录（此前创建过 → ours 保持 true；否则视为他人/手工创建，ours: false）
      ids[spec.command] = { id: found.command_id, ours: ids[spec.command]?.ours === true }
      if (slashCommandMatches(found, spec)) {
        result.adopted.push(spec.command)
      } else {
        const res = await callApi(client, token, {
          method: 'PATCH',
          path: `${SLASH_COMMAND_API_PATH}/${found.command_id}`,
          data: buildSlashCommandPayload(spec),
        })
        if (isBizError(res)) {
          result.ids = ids
          result.error = errorInfo(res, spec.command)
          return result
        }
        result.updated.push(spec.command)
      }
      continue
    }

    const res = await callApi(client, token, {
      method: 'POST',
      path: SLASH_COMMAND_API_PATH,
      data: buildSlashCommandPayload(spec),
    })
    if (isBizError(res)) {
      // 并发或历史残留：服务端对 command 有唯一约束 → 重新拉列表认领其 command_id
      if (isAlreadyExists(res)) {
        const relist = await callApi(client, token, { method: 'GET', path: SLASH_COMMAND_API_PATH })
        const item = (relist?.data?.items ?? []).find((it) => it?.command === spec.command)
        if (item?.command_id) {
          ids[spec.command] = { id: item.command_id, ours: false }
          result.adopted.push(spec.command)
          continue
        }
      }
      result.ids = ids
      result.error = errorInfo(res, spec.command)
      return result
    }
    const created = res?.data?.command_id
    if (created) ids[spec.command] = { id: created, ours: true }
    result.created.push(spec.command)
  }

  // 清理：仅删除【本插件创建过（ours: true）】且已不在期望清单中的指令
  for (const [command, entry] of Object.entries(normalizeManagedIds(managedIds))) {
    if (desiredNames.has(command)) continue
    if (!entry.ours) {
      // 非本插件创建（同名冲突/手工创建）：保留 id 以便后续更新，但绝不删除
      ids[command] = entry
      continue
    }
    const res = await callApi(client, token, { method: 'DELETE', path: `${SLASH_COMMAND_API_PATH}/${entry.id}` })
    if (isBizError(res) && !isNotFound(res)) {
      result.ids = ids
      result.error = errorInfo(res, command)
      return result
    }
    delete ids[command]
    result.deleted.push(command)
  }

  result.ids = ids
  result.ok = true
  return result
}
