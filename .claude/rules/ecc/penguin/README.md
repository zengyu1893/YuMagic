# 企鹅工坊 二创规则

> 这是企鹅工坊 (Penguin Magic) 项目的专属规则包。做二创时，Claude Code 会自动参考这些规则。

## 📖 文件导航

按优先级阅读：

| 顺序 | 文件 | 内容 | 适合 |
|:---:|------|------|------|
| 0️⃣ | [api-rules.md](api-rules.md) | **API 开发铁律 — 文档先行、参考优先** | 改 API 调用前必读 |
| 1️⃣ | [overview.md](overview.md) | 项目架构、技术栈、数据流 | 所有人，先读这个 |
| 2️⃣ | [file-map.md](file-map.md) | 每个文件的作用速查表 | 不知道改哪个文件时查 |
| 3️⃣ | [safety.md](safety.md) | 安全保命规则、禁止事项、验证清单 | 小白必读 |
| 4️⃣ | [coding-style.md](coding-style.md) | 本项目编码规范、命名、模式 | 开始写代码前读 |
| 5️⃣ | [derivative-work.md](derivative-work.md) | 九大二创场景的完整改造教程 | 知道要做什么后，来这里找步骤 |

## 🚀 快速开始

如果你不知道该做什么，按这个顺序：

```
1. 读 overview.md    → 了解项目长什么样
2. 读 file-map.md    → 知道每个文件干嘛的
3. 读 safety.md      → 知道什么绝对不能碰
4. 看 derivative-work.md → 找到你想做的事情，按步骤来
5. 写代码时参考 coding-style.md → 保持风格一致
```

## 🎯 常见二创场景速查

| 你想做什么 | 直接看 |
|-----------|--------|
| 换 AI 模型 | [derivative-work.md §1](derivative-work.md#1-换-ai-模型) |
| 加创意模板 | [derivative-work.md §3](derivative-work.md#3-改创意模板库) |
| 改 UI 颜色 | [derivative-work.md §4](derivative-work.md#4-改-ui-和主题) |
| 加新功能 | [derivative-work.md §6](derivative-work.md#6-加全新功能模块) |
| 打包发布 | [derivative-work.md §9](derivative-work.md#9-打包发布自己的版本) |
| 某个文件是干嘛的 | [file-map.md](file-map.md) |

## 🔗 与上层规则的关系

本项目规则**扩展**但不**覆盖**全局 ECC 规则：

```
全局规则 (~/.claude/rules/ecc/)
  ├── common/    通用规则 (always)
  ├── web/       Web 前端规则 (always)
  └── arkts/     ArkTS 规则 (本项目的 HarmonyOS 部分)

本项目规则 (.claude/rules/ecc/penguin/)
  ├── overview.md         扩展 common/patterns.md
  ├── coding-style.md     扩展 common/ + web/coding-style.md
  ├── safety.md           扩展 common/ + web/security.md
  ├── derivative-work.md  项目专属，无对应上层规则
  └── file-map.md         项目专属，无对应上层规则
```

> **注意：** 全局规则中还有 `typescript/` 和 `react/` 等其他语言规则，
> 它们由全局配置自动加载，本项目规则不需要额外引用。

**规则优先级：** 本项目规则 > 全局语言规则 > 全局通用规则
