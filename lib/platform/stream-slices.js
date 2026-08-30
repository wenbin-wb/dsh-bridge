// 流式打字机输出的公共切片工具
//
// 各平台网关（qq/feishu/telegram）的流式输出都是"增量前缀"模式：
// 第 i 片内容 = 前 i 个基础分片的拼接（服务端逐片覆盖，消息逐渐变长）。
// 基础分块器因平台而异（QQ markdown 感知分块 / 飞书换行窗口 / Telegram splitForIM），
// 本模块只沉淀三者复制的"前缀累积"逻辑。

/**
 * 把基础分片转成增量前缀切片。
 * @param {string[]} chunks 基础分片（非空内容应至少产生 1 片）
 * @returns {string[]} 第 i 个元素 = chunks[0..i] 拼接
 */
export function cumulativeSlices(chunks) {
  const slices = []
  let acc = ''
  for (const s of chunks) {
    acc += s
    slices.push(acc)
  }
  return slices
}
