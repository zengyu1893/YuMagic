# Penguin Magic — 文件索引树

后期修改功能时，先从这里找文件，再进入对应模块修改。新增、删除、移动功能文件后必须同步更新本文件，并同步维护 `.claude/rules/ecc/penguin/file-map.md`。

```text
Penguin-Magic-main/
├─ AGENTS.md
│  └─ Agent 协作硬规则入口；约束文件落位、功能拆分、超大文件红线和索引更新。
├─ CLAUDE.md
│  └─ Claude/Codex 类 Agent 的项目规则入口。
├─ README.md、ELECTRON_GUIDE.md、CONTRIBUTING.md、CHANGELOG*.txt
│  └─ 项目说明、Electron 指南、贡献说明和版本记录。
├─ package.json、package-lock.json、.npmrc
│  └─ npm 依赖、脚本、Electron 打包配置和安装源配置。
├─ vite.config.ts、tsconfig.json、index.html、index.tsx、index.css
│  └─ Vite/TypeScript/HTML/React 挂载入口与全局样式入口。
├─ App.tsx
│  └─ 旧应用总控，约 3500 行，属于红线文件；新增功能禁止继续写入。
├─ Start.bat、Stop.bat、Restart.bat、Install.bat、Release.bat、clean-build.bat
│  └─ Windows 安装、启动、停止、重启、发布和清理构建脚本。
├─ backend-nodejs/
│  └─ Express 后端服务；正式数据通过后端 API 读写 data/ 下 JSON。
├─ components/
│  └─ 待迁移的平铺前端组件；当前大量业务真实落点仍在这里。
├─ contexts/
│  └─ 全局 Context，包括主题、模型、RunningHub 任务和任务队列。
├─ hooks/
│  └─ 待迁移的平铺 hooks，包括桌面状态、画布拖拽、持久化和任务日志。
├─ services/
│  └─ 待迁移的平铺业务服务，包括 Gemini、视频、创意提取、导出和前端 API。
├─ src/
│  └─ 新 feature-based 架构迁移目标，已落地 app/shared/features 部分模块。
├─ data/
│  └─ 正式 JSON 数据目录；后端 Express API 的默认读写落点。
├─ creative_images/、thumbnails/、input/、output/、temp_uploads/、resources/
│  └─ 项目内素材、缩略图、输入输出、临时上传和资源目录；不要迁移到项目外路径。
├─ public/、electron/、scripts/、release/、release-uploader/
│  └─ 静态资源、Electron 主进程/打包、辅助脚本、发布产物和上传脚本。
└─ docs/
   └─ 项目文档和本文件索引。
```

## 核心入口

| 文件 | 当前状态 | 作用 | 修改规则 |
|------|:---:|------|-----------|
| `index.tsx` | 入口 | React 挂载入口 | 几乎不改 |
| `index.html` | 入口 | Vite HTML 模板 | 改标题、favicon 或根挂载点 |
| `App.tsx` | 红线 | 旧应用总控，约 3500 行 | 禁止继续塞新功能，新增能力放独立文件 |
| `vite.config.ts` | 构建 | Vite 配置 | 改端口、代理、构建和插件 |
| `tsconfig.json` | 构建 | TypeScript 配置 | 改路径别名或编译规则 |
| `package.json` | 构建 | 依赖、脚本、Electron 配置 | 加依赖、改脚本或版本 |

## 新架构目录

### `src/app/`

| 文件 | 作用 |
|------|------|
| `src/app/AppProviders.tsx` | 应用全局 Provider 组合壳 |
| `src/app/AppShell.tsx` | 新应用壳子入口 |
| `src/app/AppStore.ts` | 应用级运行时状态 |
| `src/app/StartupErrorBoundary.tsx` | 启动错误边界 |

### `src/shared/`

| 文件 | 作用 |
|------|------|
| `src/shared/components/layout/ThreePanelLayout.tsx` | 三栏布局壳 |
| `src/shared/lib/domTarget.ts` | DOM 输入目标判断 |
| `src/shared/lib/formatDate.ts` | 日期格式化 |
| `src/shared/lib/safeJson.ts` | JSON 安全解析 |
| `src/shared/types/index.ts` | 共享类型 |

共享层只放两个及以上功能真实复用的基础能力，不能放某个业务功能的模型 ID、默认参数、请求规则或 workflow ID。

## Feature 目录

```text
src/features/
├─ canvas/
│  ├─ config/
│  │  ├─ connectionHandles.ts
│  │  ├─ createNodeCommands.ts
│  │  ├─ nodeExecutorRegistry.ts
│  │  ├─ nodeRendererRegistry.ts
│  │  ├─ nodeTemplates.ts
│  │  └─ portTypes.ts
│  ├─ services/
│  │  ├─ canvasEdgeFactory.ts
│  │  ├─ canvasNodeFactory.ts
│  │  ├─ workflowAssetGraph.ts
│  │  ├─ workflowNodeExecutor.ts
│  │  └─ workflowRunner.ts
│  ├─ types/canvas.types.ts
│  └─ index.ts
├─ creative-library/types/creative.types.ts
├─ image-generation/config/imageDefaults.ts
├─ image-generation/types/imageGeneration.types.ts
├─ model-registry/types/modelRegistry.types.ts
├─ provider-settings/
│  ├─ components/ApiProviderProfilesPanel.tsx
│  ├─ components/ApiProviderModelProfilesPanel.tsx
│  ├─ components/ApiProviderRuntimeSelector.tsx
│  ├─ config/apiProviderTemplates.ts
│  ├─ services/apiProviderSettingsClient.ts
│  ├─ services/apiProviderSettingsClient.test.mjs
│  ├─ services/apiProviderRuntimeResolver.ts
│  ├─ services/apiProviderRuntimeResolver.test.mjs
│  └─ types/providerSettings.types.ts
├─ text-ai/types/textAi.types.ts
├─ api-request/
├─ assets/
├─ desktop/
├─ history/
├─ image-editing/
├─ project/
├─ source-media/
├─ source-text/
├─ tasks/
├─ video-generation/
└─ workflows/
```

### 画布核心

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `src/features/canvas/config/portTypes.ts` | 画布端口类型、颜色、输入输出合同 | 新增或修改节点端口 |
| `src/features/canvas/config/nodeTemplates.ts` | 节点默认模板、标题、featureId | 新增节点模板 |
| `src/features/canvas/config/nodeRendererRegistry.ts` | 节点图标、布局、默认尺寸和最小尺寸 | 新增节点 UI 或尺寸 |
| `src/features/canvas/config/nodeExecutorRegistry.ts` | 节点执行器注册表 | 新增可运行节点 |
| `src/features/canvas/config/createNodeCommands.ts` | 新建节点菜单命令表 | 新增右键/命令菜单节点 |
| `src/features/canvas/services/canvasNodeFactory.ts` | 节点工厂和默认节点数据 | 改节点创建、尺寸修复、输出节点创建 |
| `src/features/canvas/services/canvasEdgeFactory.ts` | 连线工厂和端口 handle 绑定 | 改连线创建、兼容校验或样式 |
| `src/features/canvas/services/workflowAssetGraph.ts` | 上下游资产收集 | 改输入资产解析 |
| `src/features/canvas/services/workflowNodeExecutor.ts` | 画布节点执行入口 | 只做分发，不塞具体业务执行分支 |
| `src/features/canvas/services/workflowRunner.ts` | 工作流链式运行调度 | 改运行到节点、上游补跑、停止逻辑 |
| `src/features/canvas/types/canvas.types.ts` | 画布类型扩展 | 改节点/连线/快照类型 |

后续新增、修改、重构或验收任何画布节点前，先读 `.claude/rules/ecc/penguin/coding-style.md`。

### 业务 Feature 状态

| Feature | 当前文件 | 状态 |
|---------|----------|------|
| `image-generation` | `config/imageDefaults.ts`、`types/imageGeneration.types.ts` | 迁移中 |
| `text-ai` | `types/textAi.types.ts` | 迁移中 |
| `provider-settings` | `components/ApiProviderProfilesPanel.tsx`、`components/ApiProviderModelProfilesPanel.tsx`、`components/ApiProviderRuntimeSelector.tsx`、`config/apiProviderTemplates.ts`、`services/apiProviderSettingsClient.ts`、`types/providerSettings.types.ts` | 迁移中 |
| `creative-library` | `types/creative.types.ts` | 迁移中 |
| `model-registry` | `types/modelRegistry.types.ts` | 迁移中 |
| `api-request`、`assets`、`desktop`、`history`、`image-editing`、`project`、`source-media`、`source-text`、`tasks`、`video-generation`、`workflows` | 目录已建或预留 | 待迁移 |

## 旧组件真实落点

### 桌面/画布

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `components/Desktop.tsx` | 旧桌面/主画布交互，约 2447 行 | 红线文件，新增交互抽 hook 或独立文件 |
| `components/PebblingCanvas/index.tsx` | 旧节点画布主入口，约 1175 行 | 红线文件，新增运行逻辑抽服务/Hook |
| `components/PebblingCanvas/CanvasNode.tsx` | 旧画布节点渲染，约 1367 行 | 红线文件，新增节点类型独立文件 |
| `components/PebblingCanvas/CanvasRenderer.tsx` | 旧画布渲染器 | 改渲染层行为 |
| `components/PebblingCanvas/Sidebar.tsx` | 旧画布侧栏 | 改旧画布侧栏 |
| `components/PebblingCanvas/ApiSettings.tsx` | 旧画布 API 设置 | 改旧画布内设置 |
| `components/PebblingCanvas/ModelSelect.tsx` | 旧画布模型选择 | 改旧画布模型选择 |
| `components/PebblingCanvas/apiAdapters.ts` | 旧画布 API 适配 | 改旧画布请求适配 |
| `components/PebblingCanvas/canvasKeyboardShortcuts.ts` | 画布快捷键输入保护 | 改旧画布快捷键拦截 |
| `components/PebblingCanvas/*.test.mjs` | 旧画布回归测试 | 验证快捷键、缩略图工具等行为 |

### 创意库

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `components/CreativeLibrary.tsx` | 旧创意库主页 | 改创意库布局、分类、展示 |
| `components/CreativeLibrary/CreativeCard.tsx` | 创意卡片 | 改创意卡片展示 |
| `components/CreativeLibrary/VirtualizedCreativeGrid.tsx` | 创意虚拟网格 | 改大量创意渲染性能 |
| `components/CreativeLibrary/types.ts` | 旧创意库类型 | 改旧创意类型 |
| `components/AddCreativeIdeaModal.tsx` | 添加/编辑创意弹窗 | 改创意表单 |
| `components/ImportCreativeModal.tsx` | 导入创意弹窗 | 改导入功能 |

### AI 生成与素材

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `components/GenerateButton.tsx` | 生成触发按钮 | 改生成按钮 UI/行为 |
| `components/GeneratedImageDisplay.tsx` | 生成结果展示 | 改结果展示/预览 |
| `components/ImageUploader.tsx` | 图片上传组件 | 改上传交互 |
| `components/ImagePreviewModal.tsx` | 图片预览弹窗 | 改大图预览 |
| `components/RunningHubGenerator.tsx` | RunningHub 生成器 | 改 RH 集成 |
| `components/RunningHubProgress.tsx` | RunningHub 进度 | 改 RH 进度显示 |
| `components/Multiangle/` | 多角度生成组件目录 | 改多角度能力 |

### 设置、历史与通用组件

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `components/SettingsModal/SettingsModal.tsx` | 当前设置弹窗主体 | 改设置面板布局 |
| `components/SettingsModal/*.tsx` | API、RunningHub、视频 API、主题等设置区块 | 改对应设置区块 |
| `components/SettingsModal.tsx` | 根级旧/兼容设置入口 | 改前先确认是否仍被引用 |
| `components/ApiKeyManager.tsx` | API Key 管理 | 改 Key 存储/验证 |
| `components/HistoryDock.tsx` | 历史记录 Dock | 改历史展示入口 |
| `components/HistoryPanel.tsx` | 历史面板 | 改历史列表 |
| `components/HistoryStrip.tsx` | 历史缩略图条 | 改历史缩略图展示 |
| `components/PromptPresets.tsx` | 提示词预设 | 改预设管理 |
| `components/Accordion.tsx` | 折叠面板 | 通用 UI 壳，谨慎修改 |

## Hooks 与 Context

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `hooks/useDesktopState.ts` | 旧桌面状态核心 | 改桌面数据模型 |
| `hooks/useDesktopInteraction.ts` | 旧桌面拖拽、点击、右键 | 改桌面交互行为 |
| `hooks/useDesktopLayout.ts` | 旧桌面布局计算 | 改排列算法 |
| `hooks/useCanvas*.ts` | 旧画布回调、拖拽、鼠标、持久化、工具状态 | 改画布交互和保存 |
| `hooks/useCreativeIdeas.ts` | 创意模板状态管理 | 改创意库逻辑 |
| `hooks/useGenerationHistory.ts` | 生成历史 | 改历史记录 |
| `hooks/useTaskLog.ts` | 任务日志 | 改任务记录 |
| `contexts/ThemeContext.tsx` | 主题状态 | 改主题逻辑 |
| `contexts/ModelContext.tsx` | 模型选择全局状态 | 改模型切换 |
| `contexts/RunningHubTaskContext.tsx` | RunningHub 任务跟踪 | 改 RH 任务跟踪 |
| `contexts/RHTaskQueueContext.tsx` | RunningHub 任务队列 | 改任务队列 |

## Services

| 文件/目录 | 作用 | 什么时候改 |
|-----------|------|-----------|
| `services/geminiService.ts` | Gemini/AI 图像生成核心，约 40KB | 改生成逻辑、模型调用、参数 |
| `services/pebblingGeminiService.ts` | Gemini 第二封装 | 改旧画布生成调用 |
| `services/creativeExtractor.ts` | 网页创意提取 | 改自动导入 |
| `services/soraService.ts` | 旧 Sora 设置的配置兼容层 | 改旧设置读写兼容 |
| `services/veoService.ts` | 旧 Veo 设置的配置兼容层 | 改旧设置读写兼容 |
| `services/modelService.ts` | 模型服务 | 改模型读取/选择 |
| `services/protocolRegistry.ts` | 协议注册 | 改协议映射 |
| `services/api/` | 前端 API 调用层 | 改后端请求 |
| `services/db/` | 前端数据层 | 改本地/后端数据桥接 |
| `services/export/` | 导出功能 | 改导出格式 |
| `services/storyLibrary/` | 内置故事/创意库目录 | 改内置模板资源 |
| `services/storyLibrary.ts` | 当前很小的兼容入口 | 改前确认真实数据落点 |

## 后端

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `backend-nodejs/src/server.js` | Express 主文件 | 加中间件、路由、日志、端口 |
| `backend-nodejs/src/config.js` | 后端配置中心 | 改数据路径、端口、限制 |
| `backend-nodejs/src/config.test.mjs` | 配置测试 | 验证路径策略 |
| `backend-nodejs/src/routes/creative.js` | 创意 API | 改创意 CRUD |
| `backend-nodejs/src/routes/history.js` | 历史 API | 改历史存取 |
| `backend-nodejs/src/routes/files.js` | 文件 API | 改上传/下载 |
| `backend-nodejs/src/routes/settings.js` | 设置 API | 改设置存取 |
| `backend-nodejs/src/routes/desktop.js` | 桌面数据 API | 改桌面持久化 |
| `backend-nodejs/src/routes/canvas.js` | 画布 API | 改画布工作流存储 |
| `backend-nodejs/src/routes/imageOps.js` | 图片操作 API | 改去背景/放大 |
| `backend-nodejs/src/routes/runninghub.js` | RunningHub API | 改 RH 后端 |
| `backend-nodejs/src/routes/yuliProxy.js` | 玉玉 API 代理 | 改玉玉代理 |
| `backend-nodejs/src/routes/providerModels.js` | 供应商模型代理 API | 改 OpenAI 兼容模型拉取、解析、分类和错误提示 |
| `backend-nodejs/src/routes/providerModels.test.mjs` | 供应商模型代理测试 | 验证模型解析、分类、HTML/非 2xx 错误 |

## 数据与资源

| 路径 | 内容 | 修改规则 |
|------|------|----------|
| `data/creative_ideas.json` | 用户创意模板 | 通过后端 API 读写，手动迁移需谨慎 |
| `data/history.json` | 生成历史 | 通过后端 API 读写 |
| `data/settings.json` | 用户设置 | 通过后端 API 读写 |
| `data/desktop_items.json` | 桌面项目 | 通过后端 API 读写 |
| `data/canvas_list.json` | 画布列表 | 通过后端 API 读写 |
| `creative_images/` | 创意库封面图 | 不要批量删除或迁出项目 |
| `thumbnails/` | 缩略图 | 由项目功能生成/读取 |
| `input/`、`output/` | 项目内输入输出目录 | 禁止改到项目外默认路径 |
| `temp_uploads/` | 项目内临时上传 | 仍应留在项目目录内 |
| `resources/`、`public/` | 项目资源和静态资源 | 新增默认资源需登记到本文件 |

## 红线文件

| 文件 | 当前规模 | 规则 |
|------|:---:|------|
| `App.tsx` | 约 3502 行 | 禁止写入新功能，抽独立文件 |
| `components/Desktop.tsx` | 约 2447 行 | 禁止写入新交互，抽 Hook/独立文件 |
| `components/PebblingCanvas/index.tsx` | 约 1175 行 | 禁止继续塞运行逻辑，抽服务 |
| `components/PebblingCanvas/CanvasNode.tsx` | 约 1367 行 | 新节点类型独立文件 |

## 文件定位流程

1. 先看本文件和 `.claude/rules/ecc/penguin/file-map.md`。
2. 找到对应功能模块。
3. 只修改该功能自己的文件。
4. 新功能优先落到 `src/features/<feature-id>/`，旧功能维护才改根级 `components/`、`services/`、`hooks/`。
5. 共享能力只有两个及以上功能真实复用时才放 `src/shared/`。
6. 如果新增、删除、移动功能文件或默认资源，同步更新本文件和 `.claude/rules/ecc/penguin/file-map.md`。
7. 如果目标文件超过 800 行，禁止继续扩写，必须新建独立文件或服务。
## Added Provider/Canvas Files

| File | Purpose |
|------|---------|
| `components/PebblingCanvas/nodes/ProviderModelSelect.tsx` | Canvas node provider/model selector for image, LLM, and video nodes |
| `components/PebblingCanvas/nodes/providerModelSelectUsage.test.mjs` | Regression test that image-generation nodes use provider-scoped model selector |
| `components/PebblingCanvas/nodes/ImageGenerationOptions.tsx` | Shared canvas node controls for image quality and moderation fields |
| `components/PebblingCanvas/nodes/ImageNode.tsx` | Upload-only canvas media node for files, folders, previews, and media clearing |
| `components/PebblingCanvas/imageGenerationOptionsUsage.test.mjs` | Regression tests for image options, local persistence, and concurrent OUTPUT result slots |
| `components/PebblingCanvas/execution/outputNodeManager.ts` | Creates/reuses OUTPUT nodes and keeps concurrent pending result positions stable |
| `services/imageResponseParser.ts` | Isolated parser for local, remote, base64, and Gemini inline image responses |
| `components/PebblingCanvas/execution/generatedImageAsset.ts` | Persists generated canvas images to local output files before OUTPUT node resolution |
| `components/PebblingCanvas/execution/executeFloatingGenerate.ts` | Floating canvas image/edit generation executor with local output persistence |
| `backend-nodejs/src/utils/generatedImageOutput.js` | Persists Yuli/OpenAI-compatible image proxy results to local output files and thumbnails |
| `backend-nodejs/src/utils/generatedImageOutput.test.mjs` | Regression tests for backend generated image local persistence and response rewriting |
| `src/features/provider-settings/services/apiProviderRuntimeResolver.ts` | Resolves node-selected provider/model into runtime API config |
| `src/features/provider-settings/services/apiProviderRuntimeResolver.test.mjs` | Regression tests for canvas provider/model runtime resolution |
| `src/features/provider-settings/config/apiProviderTemplates.ts` | Provider templates plus per-interface recommended base URL and Key registration links |
| `src/features/provider-settings/components/ApiProviderProfilesPanel.tsx` | Provider profile editor with one Key link for each recommended interface |
| `scripts/afterPack.cjs` | Writes the packaged Windows executable icon and app version resources |
| `docs/superpowers/plans/2026-07-15-video-provider-routing-fix.md` | Implementation plan for node-selected video provider routing and HTTP error handling |
| `components/PebblingCanvas/execution/videoBatchProviderUsage.test.mjs` | Regression coverage that video batch execution uses the node-selected provider and validates HTTP responses |
| `src/features/video-generation/services/videoApiResponse.ts` | Parses video API JSON responses and preserves remote HTTP error details |
| `src/features/video-generation/services/videoApiResponse.test.mjs` | Unit tests for successful and failed video API response parsing |
| `backend-nodejs/src/routes/videoProxy.js` | Local Express proxy for provider-selected video create and polling requests |
| `backend-nodejs/src/routes/videoProxy.test.mjs` | Regression tests for video proxy URL, authorization, and upstream status forwarding |
| `docs/superpowers/specs/2026-07-16-video-node-cleanup-design.md` | Design boundaries for video node dead-code removal, shared execution, and failure-state cleanup |
| `docs/superpowers/plans/2026-07-16-video-node-cleanup.md` | TDD implementation plan for video node cleanup and shared execution services |
| `src/features/video-generation/services/videoTaskRunner.ts` | Shared provider video task creation, polling, status parsing, and input image preparation |
| `src/features/video-generation/services/videoTaskRunner.test.mjs` | Unit tests for provider video task success, failure, malformed output, and image preparation |
| `src/features/video-generation/services/videoDownload.ts` | Downloads generated videos through the backend and validates the local file response |
| `src/features/video-generation/services/videoDownload.test.mjs` | Unit tests for successful, failed, and malformed generated video downloads |
| `types/pebblingTypes.ts` | Canvas node data contracts, including typed video duration and legacy duration compatibility |
| `docs/superpowers/specs/2026-07-18-github-public-release-design.md` | GitHub 公开发布清理与安全设计 |
| `docs/superpowers/plans/2026-07-18-github-public-release.md` | GitHub 公开发布实施计划 |
| `SECURITY.md` | 公开仓库安全和凭据处理说明 |
| `backend-nodejs/data/.gitkeep` | 保留后端本地 JSON 数据目录结构，不上传运行数据 |
| `temp_uploads/.gitkeep` | 保留项目内临时上传目录结构，不上传上传内容 |
