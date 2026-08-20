// dsh-bridge 平台抽象层统一导出
//
// 提供多平台 IM 接入的基础设施：
//   Platform             平台适配器基类（协议/连接/登录/收发消息）
//   ConversationBridge   平台无关会话桥（白名单/会话/审批/命令/digest）
//   PlatformManager      多平台注册与状态聚合

export { Platform } from './base.js'
export { ConversationBridge, conversationBridgeHelpers, BRIDGE_MARK, textOfAssistantMessage } from './conversation-bridge.js'
export { PlatformManager } from './manager.js'
