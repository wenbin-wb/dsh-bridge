# DSH Bridge Skills

这个目录包含 DSH Bridge 项目的可复用技能文档。

## 可用技能

### dsh-bridge-coding-standards

**用途**: 确保 DSH 插件代码符合规范、专业、可维护

**版本**: 1.0.0

**适用场景**:
- 开发新的 DSH 插件
- 审查 DSH 插件代码
- 修复 DSH 插件问题
- 学习 DSH 插件开发规范

**核心内容**:
- DSH Bundle 配置规范（`dsh.bundle` 字段）
- 四大具名导出（`name`, `inject`, `apply`, `using`）
- 服务访问规范
- 资源清理规范
- 代码风格和命名约定
- 安全规范
- 性能优化
- 测试和文档规范

**使用方法**:

当开发或审查 DSH 插件代码时，参考此技能确保：

1. ✅ `package.json` 包含 `dsh.bundle` 声明
2. ✅ 正确使用四大具名导出
3. ✅ 在 `inject` 中声明所有服务依赖
4. ✅ 在 `dispose` 中清理所有资源
5. ✅ 遵循代码风格和安全规范

**快速检查清单**:

```bash
# 1. 检查 dsh.bundle
grep -A 2 '"dsh"' package.json

# 2. 检查导出
grep 'export const name' index.js
grep 'export const inject' index.js
grep 'export function apply' index.js

# 3. 检查清理
grep 'dispose' index.js

# 4. 运行测试
npm test
```

## 如何添加新技能

1. 在此目录创建新的 Markdown 文件
2. 使用清晰的结构和示例
3. 包含检查清单和常见错误
4. 更新本 README

## 技能文档格式

推荐的技能文档结构：

```markdown
# 技能名称

## 技能元信息
- 名称
- 版本
- 用途
- 适用范围

## 核心规范
- 规范 1
- 规范 2
- ...

## 检查清单
- [ ] 检查项 1
- [ ] 检查项 2

## 常见错误及解决方法

## 参考资源
```

## 相关文档

- [DSH Bundle 规范](../docs/DSH_BUNDLE.md)
- [代码规范](../CODE_STANDARDS.md)
- [代码审查清单](../CODE_REVIEW.md)

---

**维护者**: wenbin-wb  
**最后更新**: 2025-01-18
