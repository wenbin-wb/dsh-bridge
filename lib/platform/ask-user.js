// Agent 决策问答（ask_user_question / 计划审批）的**平台无关**核心。
//
// 背景：DSH 把"Agent 需要用户做个决定"统一收敛到 `dsh-user-questions` 服务，
// 机制是 cordis **waterfall 钩子** `user-questions/request`：
//
//   agent 调 ask_user_question 工具
//     → userQuestions.askTimed(request, callId, timeoutMs)
//     → ctx.waterfall('user-questions/request', request, noAnswerer)
//          ↑ 应答者在这里接管：渲染问题、等用户选择、返回答案批次
//          ↑ 无人接管 → reject('NO_PROVIDER')
//
// 在此之前，本插件**完全没有注册该钩子**：IM 用户看不到任何提问，Agent 只能拿到
// NO_PROVIDER（表现为"它想问却问不出来"，或超时后以 pending 继续）。
// 本模块提供渲染与答案规整的**纯函数**，供各 IM 平台复用；桥接与平台渲染分别在
// conversation-bridge.js（归属判定/生命周期）与各平台节点（卡片/按钮）里实现。
//
// 请求/答案的数据形状（对齐宿主 schema，勿凭想象改）：
//   request = { questions: Question[], agent?, signal?, wait?: { callId, timed } }
//   Question = { id, question, detail?, header?, options?: [{label, description?}], multiSelect? }
//   answer   = { answers: [{ id, selected: string[], custom?: string }] }  ← 每问恰好一项
//
// 一个重要语义（决定交互设计）：**选项可以为空**（纯自由输入式提问）；`multiSelect`
// 才允许选多个。答案里 `selected: []` 且无 `custom` 表示"用户显式跳过"，与"pending"
// （超时未答，稍后仍可答）是两件事。

/** 常规输入的单选项上限（超出时提示用户改用文字回复，避免卡片按钮爆炸）。 */
export const MAX_CARD_OPTIONS = 6

/** 截断过长文本（标题/详情），保持 IM 可读。 */
export function clip(text, max = 120) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/**
 * 把文本里会破坏行内代码的字符换成等价可见字符。
 *
 * 会话标签（cwd 末段 + 会话 id）理论上只含字母数字，但 cwd 目录名可以是任意字符；
 * 反引号会把后续整段吞进代码块，竖线会打乱表格，故先归一化再塞进 `` ` `` 里。
 * @param {string} text
 * @returns {string}
 */
export function escapeInlineCode(text) {
  return String(text ?? '').replace(/[`|]/g, '′').replace(/\s+/g, ' ').trim()
}

/**
 * 问题的展示标题：header 优先，其次问题正文单行。
 * @param {object} question
 */
export function questionTitle(question) {
  const header = clip(question?.header, 40)
  if (header) return header
  return clip(question?.question, 60) || '请选择'
}

/**
 * 是否属于"计划审批"型提问。
 *
 * 宿主把 plan-review 也塞进同一入口，用 `question.intent.kind === 'plan-review'` 标记
 * （见 dsh-client-ui-user-questions 的 planReviewOf）。识别出来就能共用一套 UI，
 * 只是标题/按钮措辞更贴合"审阅计划"。
 */
export function isPlanReview(question) {
  return question?.intent?.kind === 'plan-review'
}

/**
 * 判断该问题能否用**纯按钮**表达。
 *
 * 不满足时任选其一：
 *   - 选项为空 → 必须让用户自由输入（卡片按钮无能为力）；
 *   - 选项过多 → 卡片按钮会撑爆（IM 卡片没有滚动列表），退回文字回复更好用。
 * 注意 multiSelect **不**排除按钮方案：多选可用"逐个切换 + 确认"实现，但首版
 * 为稳妥起见，把多选也交回文字回复（见 formatAskPrompt 的提示语），
 * 避免用户在卡片上误以为只能单选。
 *
 * @returns {boolean}
 */
export function canRenderAsButtons(question, { maxOptions = MAX_CARD_OPTIONS } = {}) {
  const options = Array.isArray(question?.options) ? question.options : []
  if (options.length === 0) return false
  if (options.length > maxOptions) return false
  if (question?.multiSelect === true) return false
  return true
}

/**
 * 把一批问题渲染成 IM 文本（**回退路径**，也是不支持按钮的平台的主路径）。
 *
 * 编号规则：`Q1/Q2…` 问题、`1/2…` 选项。用户回复形如：
 *   `/ask 1`       → Q1 选第 1 项
 *   `/ask 1 2`     → Q1 选第 2 项
 *   `/ask 1=2,3`   → Q1 多选（配合 multiSelect）
 *   `/ask 1=自由文本` → 自由输入
 * 多条用 `;` 分隔，例如 `/ask 1; 2=1`。
 *
 * @param {object[]} questions
 * @param {{ number?: number, timeoutSec?: number, header?: string }} [opts]
 * @returns {string}
 */
/**
 * 渲染提问正文。
 *
 * @param {Array<object>} questions 宿主给出的问题列表
 * @param {object} [opts]
 * @param {number} [opts.number] 提问编号（便于 `/ask` 就近作答）
 * @param {number} [opts.timeoutSec] 等待超时（秒），>0 才提示
 * @param {string} [opts.header] 卡片模式下的引导语
 * @param {string} [opts.sessionTag] 会话来源标识（issue #112 兜底推送时必填：
 *   同一个 IM 对话可能同时承载多个会话的提问，不标来源用户无法判断在答哪一个）
 */
export function formatAskPrompt(questions, { number = 1, timeoutSec = 0, header = '', sessionTag = '' } = {}) {
  const list = Array.isArray(questions) ? questions : []
  const lines = []
  const plan = list.some(isPlanReview)
  lines.push(`## ${plan ? '📋 计划待确认' : '❓ 需要你的决定'}${number ? ` (#${number})` : ''}`)
  if (sessionTag) lines.push('', `> 会话：\`${escapeInlineCode(String(sessionTag))}\``)
  if (header) lines.push('', String(header))
  if (timeoutSec > 0) {
    const min = Math.max(1, Math.round(timeoutSec / 60))
    lines.push('', `> 等待超时：${min} 分钟（超时后 Agent 可能先继续其它工作，你稍后仍可回复）`)
  }
  lines.push('')

  list.forEach((q, qi) => {
    const title = questionTitle(q)
    const detail = clip(q?.detail, 500)
    lines.push(`**Q${qi + 1}. ${title}**`)
    if (detail) lines.push(detail)
    const options = Array.isArray(q?.options) ? q.options : []
    if (options.length === 0) {
      lines.push('- （自由输入，无预设选项）')
    } else {
      options.forEach((opt, oi) => {
        const desc = clip(opt?.description, 120)
        // 推荐项：宿主约定把推荐项放第一位并带 "(Recommended)" 标注
        const recommended = /\(recommended\)|（推荐）/i.test(String(opt?.label ?? ''))
        lines.push(`- \`${oi + 1}\` ${clip(opt?.label, 60)}${recommended ? ' ⭐' : ''}${desc ? ` — ${desc}` : ''}`)
      })
      if (q?.multiSelect === true) lines.push('  *（可多选，用逗号分隔，如 `1,3`）*')
    }
    lines.push('')
  })

  const n = list.length
  lines.push('**回复方式**')
  if (n === 1) {
    const multiSel = list[0]?.multiSelect === true
    lines.push(multiSel ? '- 选多项：`/ask 1,3`（逗号分隔）' : '- 选一项：`/ask 1`（选第 1 个选项）')
    lines.push('- 自由输入：`/ask =你的答案`')
  } else {
    lines.push(`- 逐个作答：\`/ask 1; 2; 3\`（按顺序对应 Q1/Q2/Q3；共 ${n} 问）`)
    lines.push('- 指定问题：`/ask 2=1`（Q2 选第 1 项）')
    lines.push('- 跳过某问：留空，如 `/ask 1; ; 2`')
  }
  return lines.join('\n').trim()
}

/**
 * 解析用户文字回复为答案批次。
 *
 * 支持的写法（宽松解析，便于手机输入）：
 *   `/ask 1`              单问：选第 1 项
 *   `/ask =自由文本`       单问：自由输入
 *   `/ask 1; 2; 3`        多问按序作答
 *   `/ask 1=2`            指定 Q1 选第 2 项
 *   `/ask Q1=2`           Q 前缀大小写不敏感
 *   `/ask 1=1,3`          多选
 *   `/ask 1=2; 2=自由文本`  混合
 *
 * @param {string} text 用户消息原文（可含 `/ask` 前缀）
 * @param {object[]} questions 与请求同序的问题数组
 * @returns {{ ok: true, answers: object[] } | { ok: false, error: string }}
 */
export function parseAskReply(text, questions) {
  const list = Array.isArray(questions) ? questions : []
  if (list.length === 0) return { ok: false, error: '当前没有待回答的问题。' }

  let raw = String(text ?? '').trim()
  if (!raw) return { ok: false, error: '回复内容为空。' }
  // 允许带 /ask、/answer、/a 前缀；也允许纯内容（如 `1`）
  raw = raw.replace(/^\/(?:ask|answer|a)\b[:：]?\s*/i, '').trim()
  if (!raw) return { ok: false, error: '请在 /ask 后给出你的选择，例如 `/ask 1`。' }
  // 全局前缀 `=`：`/ask =自由文本` 表示"直接自由输入"（不指定问题编号，
  // 单问时等价于给该问 custom；多问时报错提示需指定编号，避免歧义）。
  if (raw.startsWith('=')) {
    const body = raw.slice(1).trim()
    if (list.length !== 1) {
      return { ok: false, error: `请指明问题编号，例如 \`/ask 1=${body || '你的答案'}\`（共 ${list.length} 问）。` }
    }
    if (!body) return { ok: false, error: '自由输入内容为空。' }
    return { ok: true, answers: [{ id: list[0].id, selected: [], custom: body }] }
  }

  // 分段：分号优先；单问时整串就是一段（允许内容里含逗号等）
  const segments = raw.split(/[;；]/).map((s) => s.trim()).filter((s) => s !== '')
  const byIndex = new Map()
  const positional = []

  for (const seg of segments) {
    // Q1=... / 1=...
    const m = /^(?:q|Q)?\s*(\d+)\s*[=:：]\s*([\s\S]*)$/.exec(seg)
    if (m) {
      const qi = Number(m[1]) - 1
      if (!Number.isInteger(qi) || qi < 0 || qi >= list.length) {
        return { ok: false, error: `问题编号 ${m[1]} 超出范围（共 ${list.length} 问）。` }
      }
      byIndex.set(qi, m[2])
    } else {
      positional.push(seg)
    }
  }

  // 位置式：按序填进尚未指定的问题
  let posCursor = 0
  for (const seg of positional) {
    while (posCursor < list.length && byIndex.has(posCursor)) posCursor += 1
    if (posCursor >= list.length) return { ok: false, error: `回复的问题数量多于待答问题（共 ${list.length} 问）。` }
    byIndex.set(posCursor, seg)
    posCursor += 1
  }

  const answers = list.map((q, qi) => {
    const value = byIndex.get(qi)
    // 未提及 → 视为显式跳过（selected 为空、无 custom）
    if (value === undefined || value === '') return { id: q.id, selected: [] }
    const options = Array.isArray(q?.options) ? q.options : []

    // 纯数字/逗号 → 选选项
    if (/^\s*\d+(\s*[,，]\s*\d+)*\s*$/.test(value)) {
      const picks = value.split(/[,，]/).map((x) => Number(x.trim()))
      const selected = []
      for (const p of picks) {
        if (!Number.isInteger(p) || p < 1 || p > options.length) {
          return { __error: `Q${qi + 1} 的选项编号 ${p} 无效（共 ${options.length} 个选项）。` }
        }
        const label = String(options[p - 1]?.label ?? '')
        if (selected.includes(label)) continue
        if (selected.length > 0 && q?.multiSelect !== true) {
          return { __error: `Q${qi + 1} 不是多选，请只给一个选项编号。` }
        }
        selected.push(label)
      }
      return { id: q.id, selected }
    }

    // 字母编号（a/b/c）→ 也当选项（部分用户会这么回）
    const letters = value.trim().toLowerCase()
    if (/^[a-z](\s*[,，]\s*[a-z])*$/.test(letters) && options.length > 0) {
      const picks = letters.split(/[,，]/).map((x) => x.trim().charCodeAt(0) - 96)
      if (picks.every((p) => p >= 1 && p <= options.length)) {
        const selected = picks.map((p) => String(options[p - 1]?.label ?? ''))
        if (selected.length > 1 && q?.multiSelect !== true) return { __error: `Q${qi + 1} 不是多选，请只给一个选项。` }
        return { id: q.id, selected }
      }
    }

    // 其它一律当自由输入
    return { id: q.id, selected: [], custom: value }
  })

  const bad = answers.find((a) => a.__error)
  if (bad) return { ok: false, error: bad.__error }
  return { ok: true, answers: answers.map(({ __error, ...rest }) => rest) }
}

/**
 * 校验答案批次是否满足宿主约束：**每个问题恰好一项**。
 *
 * 宿主 `userQuestions.answer()` 对不满足的批次抛 BAD_ANSWER，因此必须在这里先自查，
 * 避免把非法批次送出去（表现为"点了没反应"）。
 *
 * @param {object[]} answers
 * @param {object[]} questions
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateAnswerBatch(answers, questions) {
  const list = Array.isArray(questions) ? questions : []
  const batch = Array.isArray(answers) ? answers : []
  if (batch.length !== list.length) {
    return { ok: false, error: `答案条目数（${batch.length}）与问题数（${list.length}）不一致。` }
  }
  const seen = new Set()
  for (const ans of batch) {
    if (!ans || typeof ans.id !== 'string') return { ok: false, error: '答案缺少 id。' }
    if (seen.has(ans.id)) return { ok: false, error: `答案重复命名了问题 ${ans.id}。` }
    seen.add(ans.id)
    if (!Array.isArray(ans.selected)) return { ok: false, error: `问题 ${ans.id} 的 selected 必须是数组。` }
    if (ans.custom !== undefined && typeof ans.custom !== 'string') return { ok: false, error: `问题 ${ans.id} 的 custom 必须是字符串。` }
  }
  for (const q of list) {
    if (!seen.has(q?.id)) return { ok: false, error: `答案未覆盖问题 ${q?.id}。` }
  }
  return { ok: true }
}

/**
 * 生成的答案在 IM 里回显一行，便于用户确认自己的选择被正确理解。
 * @param {object[]} answers
 * @param {object[]} questions
 */
export function formatAnswerAck(answers, questions, { number = 0 } = {}) {
  const list = Array.isArray(questions) ? questions : []
  const rows = (Array.isArray(answers) ? answers : []).map((ans) => {
    const q = list.find((item) => item?.id === ans.id)
    const title = clip(q?.header || q?.question, 30) || ans.id
    const picked = ans.selected?.length ? ans.selected.join('、') : (ans.custom ? '' : '（已跳过）')
    const value = ans.custom ? `${picked ? `${picked}；` : ''}${clip(ans.custom, 80)}` : picked
    return `- **${title}** → ${value || '（已跳过）'}`
  })
  const head = `✓ 已提交你的选择${number ? ` (#${number})` : ''}`
  return [head, ...rows].join('\n')
}

/** 按钮回调数据里承载的前缀（与审批的 action 值区分开）。 */
export const ASK_ACTION_PREFIX = 'ask'
