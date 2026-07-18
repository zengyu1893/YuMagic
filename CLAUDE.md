# Penguin Magic — AI 图像桌面管理工具

## 项目规则

本项目遵循 `.claude/rules/ecc/penguin/` 下的编码铁律，优先级从高到低：

1. **AI 编码铁律** (`ai-coding-mandate.md`) — 文件大小管控、共享优先、禁止超大文件写入
2. **API 开发铁律** (`api-rules.md`) — 文档先行、参考优先、模型-协议精确映射
3. **编码规范** (`coding-style.md`) — 命名、组件结构、节点执行模式、样式规范
4. **安全规则** (`safety.md`) — 保命五条、禁止事项、验证清单
5. **二创指南** (`derivative-work.md`) — 九大改造场景的完整教程

## 核心架构规则

- 文件 >800 行禁止写入，新文件 ≤400 行
- 重复 2 次 = 抽共享组件/Hook
- App.tsx / Desktop.tsx 是壳子，只引用不写业务
- 画布节点每种独立文件，走注册表模式
- 新增 API 调用前必查文档，确认格式后再写

## 技术栈

React 19 + TypeScript + Tailwind CSS + Vite + Node.js Express 后端 + Electron 桌面壳
