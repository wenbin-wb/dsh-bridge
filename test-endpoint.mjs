// 模拟 gateway.endpoint 方法的逻辑
function endpoint(peerId, scope, kind = 'messages') {
  return scope === 'group'
    ? `/v2/groups/${encodeURIComponent(peerId)}/${kind}`
    : `/v2/users/${encodeURIComponent(peerId)}/${kind}`
}

// 测试用例
console.log('Test 1 - C2C messages:', endpoint('u_1234567890ABCDEF', 'c2c', 'messages'))
console.log('Test 2 - C2C stream:', endpoint('u_1234567890ABCDEF', 'c2c', 'stream_messages'))
console.log('Test 3 - Group messages:', endpoint('g_FEDCBA0987654321', 'group', 'messages'))
console.log('Test 4 - Group stream:', endpoint('g_FEDCBA0987654321', 'group', 'stream_messages'))

// 测试 scope 推断逻辑（从 peerId 前缀）
function inferScope(peerId) {
  return peerId.startsWith('g_') ? 'group' : 'c2c'
}

console.log('\nScope inference:')
console.log('u_xxx ->', inferScope('u_1234567890ABCDEF'))
console.log('g_xxx ->', inferScope('g_FEDCBA0987654321'))
