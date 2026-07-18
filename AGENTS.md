# Penguin Magic — Agent 协作规则

> 所有 AI Agent 必须遵守的硬性规则。违反规则的代码必须在 code review 中被拒绝。

## 必须遵守

- 所有项目文件、配置文件、上传文件、生成文件、任务记录、历史记录都必须落在当前项目目录内。
- 后续所有新增功能代码、组件、配置、默认参数、模型列表、节点模板、workflow 配置、脚本、文档、图片/视频/音频/字体/图标/示例素材、默认资源，都必须从创建时就直接落在当前项目根目录下。
- 禁止把项目功能文件、默认资源或配置先放到系统临时目录、下载目录、桌面、其他项目目录、浏览器缓存或外部绝对路径里。
- 任何后期打包、运行、默认初始化、功能恢复或接力开发需要用到的文件，都必须在项目根目录内，并同步登记到 `docs/file-index.md` 和 `.claude/rules/ecc/penguin/file-map.md`。
- 正式数据统一放在 `data/` 下，通过后端 Express API 读写 JSON 文件。
- **主代码只做壳子和引用，不写具体业务功能。** 页面文件只负责布局、挂载、弹窗开关、状态衔接和事件分发；不能写功能自己的默认值、模型列表、请求规则、保存逻辑、节点命令表或业务表单。
- 每个功能都必须有独立文件；新增功能必须新增或归入明确的独立功能文件，不能直接塞进主页面。
- 图片生成、视频生成、文本 AI、供应商设置、任务队列、历史记录都按独立功能拆分。
- 共享层只放两个及以上功能真正复用的壳子、工具、类型或组件，不能放某个业务功能的模型参数、默认值、请求规则或 workflow ID。
- 后期改功能时，先查看 `docs/file-index.md` 和 `.claude/rules/ecc/penguin/file-map.md` 的文件索引，再定位对应功能文件，不要先全项目乱搜。
- 后期新增、修改、重构或验收任何画布节点时，必须先查看 `.claude/rules/ecc/penguin/coding-style.md` 中的节点执行规范。
- 更新、新增、移动功能文件时，必须同步更新 `docs/file-index.md` 和 `.claude/rules/ecc/penguin/file-map.md`。
- UI 图标统一使用 `lucide-react`；不要使用 emoji 作为结构图标。

## 功能拆分判断

只要出现以下任意情况，就视为独立功能，必须单独建文件或目录：

- 有独立参数面板
- 有独立默认值
- 有独立模型列表
- 有独立请求 adapter
- 有独立结果展示
- 有独立历史恢复规则
- 有独立上传、预览、任务重试或资源转换逻辑
- 有独立右键菜单、命令面板、节点模板或节点创建规则

## 目录职责

```
src/app/        — 应用壳子（App.tsx <100行，AppProviders.tsx，StartupErrorBoundary.tsx）
src/pages/      — 页面壳子（只放布局壳，不放业务功能）
src/features/   — 所有业务功能，按 feature-id 组织
  <feature-id>/
    components/ — 该功能自己的面板、弹窗、菜单、卡片
    config/     — 该功能自己的默认值、模型表、节点表、命令表
    services/   — 该功能自己的保存、读取、执行器、API 调用
    adapters/   — 该功能自己的请求、结果、快照转换
    types/      — 该功能自己的类型
    schemas/    — 该功能自己的参数校验
    stores/     — 该功能自己的状态管理
src/shared/     — 两个及以上功能真实复用的基础能力壳子；不能放业务参数
components/     — 【待迁移】平铺组件，逐步迁移到 src/features/ 或 src/shared/
services/       — 【待迁移】平铺服务，逐步迁移到 src/features/
hooks/          — 【待迁移】平铺 hooks，逐步迁移到 src/features/
contexts/       — 全局 Context（Theme, Model, RHTaskQueue）
```

## 当前明确边界

- AI 图像生成归属 `services/geminiService.ts`（待迁移到 `src/features/image-generation/`）
- 供应商/API 设置归属 `components/SettingsModal/`（待迁移到 `src/features/provider-settings/`）
- 创意库归属 `components/CreativeLibrary/`（待迁移到 `src/features/creative-library/`）
- 画布节点渲染归属 `components/PebblingCanvas/`（待迁移到 `src/features/canvas/`）
- 画布工作流执行归属 `components/PebblingCanvas/index.tsx` 的运行逻辑（待拆分为独立 executor）
- 历史记录归属 `components/HistoryDock.tsx` + `components/HistoryPanel.tsx`（待迁移到 `src/features/history/`）
- 任务队列归属 `contexts/RHTaskQueueContext.tsx` + `hooks/useTaskLog.ts`（待迁移到 `src/features/tasks/`）
- 共享 UI 壳子归属 `src/shared/`；只能放两个及以上功能真实复用的基础能力

## 超大文件红线（绝对禁止写入）

| 文件 | 行数 | 状态 |
|------|:---:|------|
| `App.tsx` | ~3,502 | 🔴 禁止写入，新功能独立文件 |
| `components/PebblingCanvas/index.tsx` | ~1,175 | 🔴 禁止写入，新逻辑抽 Hook/独立文件 |
| `components/PebblingCanvas/CanvasNode.tsx` | ~1,367 | 🔴 禁止写入，新节点类型独立文件 |
| `components/Desktop.tsx` | ~2,447 | 🔴 禁止写入，新交互抽 Hook |
| `services/geminiService.ts` | ~40KB | 🟡 只维护既有逻辑，新模型/参数优先迁到 feature 配置 |

## 已知技术债

- **超大文件**：App.tsx、PebblingCanvas/index.tsx、Desktop.tsx、CanvasNode.tsx 严重超标，需要按 feature 拆分
- **无测试**：项目没有测试文件，改代码靠手动验证
- **console.log 残留**：生产代码中有大量调试日志
- **硬编码**：部分配置写死在代码中而非配置文件
- **后端无认证**：API 没有鉴权
- **前端直接调 AI API**：部分逻辑在前端直接调 Gemini API，应通过后端代理
- **平铺组件结构**：`components/`、`services/`、`hooks/` 平铺，未按 feature 组织

## 文件定位流程

1. 先看 `docs/file-index.md` 和 `.claude/rules/ecc/penguin/file-map.md`
2. 找到对应功能模块
3. 只修改该功能自己的文件
4. 如果需要共享能力，确认至少两个功能真实复用，再放入 `src/shared/`
5. 如果新增功能文件或移动文件，同步更新 `docs/file-index.md` 和 `file-map.md`
6. 如果目标文件 >800 行，禁止写入，必须新建文件
