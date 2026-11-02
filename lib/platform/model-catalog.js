// 模型目录（issue #91）：从宿主的 `llm` 服务读取可选的 provider / model 列表。
//
// 目录只用于「给人看 + 让人选」：真正的路由由宿主 llm 适配器决定，这里不做校验。
// 目录按编号展示，编号是**本次目录的顺序**，因此调用方需要缓存目录，保证
// 「先看列表、再发 /model 2」时编号不会漂移。
//
// 容错：任一 provider 的 listModels 失败/超时都只影响它自己（该 provider 显示为空），
// 整个目录仍然可用；`llm` 服务缺失时返回 available:false，由调用方给出降级提示。

/** 单个 provider 拉取模型列表的超时（毫秒）。部分适配器会真的发网络请求。 */
const LIST_MODELS_TIMEOUT_MS = 2500

/** 目录缓存时长：编号要稳定，不宜频繁刷新。 */
export const MODEL_CATALOG_TTL_MS = 10 * 60 * 1000

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('model list timeout')), ms)
    timer.unref?.()
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * 收集宿主可用的 provider 与模型。
 *
 * @param {object} ctx cordis 上下文
 * @returns {Promise<{available: boolean, providers: Array<{id: string, name: string, models: Array<{id: string, name: string, description: string}>}>, flat: Array<{provider: string, providerName: string, model: string, modelName: string}>}>}
 */
export async function collectModelCatalog(ctx) {
  let llm
  try {
    llm = ctx?.get?.('llm') ?? ctx?.llm
  } catch {
    llm = undefined
  }
  if (typeof llm?.listProviders !== 'function' || typeof llm?.listModels !== 'function') {
    return { available: false, providers: [], flat: [] }
  }

  let rawProviders
  try {
    rawProviders = await withTimeout(Promise.resolve(llm.listProviders()), LIST_MODELS_TIMEOUT_MS)
  } catch {
    return { available: false, providers: [], flat: [] }
  }

  const jobs = (Array.isArray(rawProviders) ? rawProviders : []).map(async (provider) => {
    const id = typeof provider?.id === 'string' ? provider.id.trim() : ''
    if (!id) return undefined
    let models
    try {
      models = await withTimeout(Promise.resolve(llm.listModels(id)), LIST_MODELS_TIMEOUT_MS)
    } catch {
      models = [] // 单个提供方不可用不影响整个目录
    }
    const list = (Array.isArray(models) ? models : [])
      .filter((model) => model && typeof model.id === 'string' && model.id.length > 0)
      .map((model) => ({
        id: model.id,
        name: typeof model.name === 'string' && model.name.length > 0 ? model.name : model.id,
        description: typeof model.description === 'string' ? model.description : '',
      }))
    return {
      id,
      name: typeof provider?.name === 'string' && provider.name.length > 0 ? provider.name : id,
      models: list,
    }
  })

  const providers = (await Promise.all(jobs)).filter(Boolean)
  const flat = []
  for (const provider of providers) {
    for (const model of provider.models) {
      flat.push({
        provider: provider.id,
        providerName: provider.name,
        model: model.id,
        modelName: model.name,
      })
    }
  }
  return { available: true, providers, flat }
}

/**
 * 当前选中的模型描述（用于回显）。
 *
 * @param {{provider?: string, model?: string}|undefined} current
 * @returns {string} `provider/model` 或「DSH 默认」
 */
export function describeSelection(current) {
  return current?.provider && current?.model ? `${current.provider}/${current.model}` : 'DSH 默认'
}

/**
 * 渲染模型目录（Markdown 文本，直接发到 IM）。
 *
 * @param {object} catalog collectModelCatalog() 的返回值
 * @param {object} [opts]
 * @param {{provider?: string, model?: string}} [opts.current] 当前选择，用于打勾
 * @returns {string}
 */
export function formatModelCatalog(catalog, { current } = {}) {
  const lines = ['## 🤖 模型选择', '']
  if (!catalog?.available) {
    lines.push('> 当前宿主没有提供模型目录（`llm` 服务不可用或未注册适配器）。')
    lines.push('> 仍可用 `/model <provider>/<model>` 直接指定，例如 `/model deepseek/deepseek-reasoner`。')
    return lines.join('\n')
  }
  if (!catalog.flat?.length) {
    lines.push('> 模型目录为空：宿主已注册的提供方都没有报告可用模型。')
    lines.push('> 可用 `/model <provider>/<model>` 直接指定。')
    return lines.join('\n')
  }

  lines.push(`> 当前：**${describeSelection(current)}**`)
  lines.push('')
  let index = 0
  for (const provider of catalog.providers) {
    if (provider.models.length === 0) continue
    lines.push(`### ${provider.name}（\`${provider.id}\`）`)
    for (const model of provider.models) {
      index += 1
      const mark = current?.provider === provider.id && current?.model === model.id ? ' ✅' : ''
      lines.push(`${index}. \`${model.id}\` — ${model.name}${mark}`)
    }
    lines.push('')
  }
  lines.push('> 发送 `/model <编号>` 选择；`/model reset` 恢复 DSH 默认。')
  lines.push('> 选择对该平台新建（`/new`）或重新接入（`/use`）的会话生效。')
  return lines.join('\n')
}

/**
 * 解析 `/model` 的参数。
 *
 * 支持：编号（对应最近一次目录的顺序）、`provider/model` 直写。
 *
 * @param {object} catalog collectModelCatalog() 的返回值
 * @param {string} input 指令参数
 * @returns {{provider: string, model: string}|{error: 'out-of-range'|'invalid'}|undefined}
 *   空参数返回 undefined（表示"只列目录"）
 */
export function resolveModelSelection(catalog, input) {
  const raw = String(input ?? '').trim()
  if (!raw) return undefined
  if (/^\d+$/.test(raw)) {
    const entry = catalog?.flat?.[Number(raw) - 1]
    if (!entry) return { error: 'out-of-range' }
    return { provider: entry.provider, model: entry.model }
  }
  const match = /^([^/\s]+)\/([^\s]+)$/.exec(raw)
  if (match) return { provider: match[1], model: match[2] }
  return { error: 'invalid' }
}
