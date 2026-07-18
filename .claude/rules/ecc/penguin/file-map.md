# 企鹅工坊 — 文件地图

> 速查表：知道要干什么 → 找到要改哪个文件。搭配 [overview.md](overview.md) 和 `docs/file-index.md` 使用。

> 2026-07-10：新增 `docs/file-index.md` 作为项目内文件索引树，后续新增、删除、移动功能文件或默认资源时，需要同步维护本文件和 `docs/file-index.md`。

---

## 🔑 核心入口文件

| 文件 | 行数估算 | 作用 | 什么时候改 |
|------|:---:|------|-----------|
| `index.tsx` | 17 | React 挂载入口 | 几乎不改 |
| `index.html` | ~20 | HTML 模板 | 改标题/favicon |
| `App.tsx` | ~2800 | **应用总控**，组装所有模块 | 加新功能/改全局布局 |
| `vite.config.ts` | ~40 | Vite 构建配置 | 改代理/端口/构建 |
| `tsconfig.json` | ~20 | TS 编译配置 | 改路径别名/严格模式 |

## 🎨 前端组件

### 桌面/画布
| 文件 | 大小 | 作用 | 什么时候改 |
|------|:---:|------|-----------|
| `components/Desktop.tsx` | 140KB | **主画布**，拖拽管理核心 | 改拖拽逻辑/右键菜单/画布交互 |
| `components/Desktop/` | 目录 | 桌面子组件 | 改桌面布局子模块 |
| `components/PebblingCanvas/` | 目录 | 画布节点编辑器 | 改工作流/节点编辑 |
| `components/PebblingCanvas/canvasKeyboardShortcuts.ts` | 1KB | 画布全局快捷键输入目标保护 | 改画布快捷键拦截规则 |
| `components/PebblingCanvas/canvasKeyboardShortcuts.test.mjs` | 1KB | 画布快捷键输入框回归测试 | 验证节点输入框 Backspace/Delete 不被抢占 |
| `components/EmptyState.tsx` | 1KB | 空状态提示 | 改空画布欢迎语 |
| `components/WelcomeScreen.tsx` | 2KB | 首次欢迎页 | 改欢迎页内容 |

### 创意库
| 文件 | 大小 | 作用 | 什么时候改 |
|------|:---:|------|-----------|
| `components/CreativeLibrary.tsx` | 43KB | **创意库主页** | 改创意库布局/分类/展示 |
| `components/AddCreativeIdeaModal.tsx` | 38KB | 添加/编辑创意弹窗 | 改创意编辑表单 |
| `components/ImportCreativeModal.tsx` | 6KB | 导入创意弹窗 | 改导入功能 |

### AI 生成
| 文件 | 大小 | 作用 | 什么时候改 |
|------|:---:|------|-----------|
| `components/GenerateButton.tsx` | 6KB | 生成触发按钮 | 改生成按钮UI/行为 |
| `components/GeneratedImageDisplay.tsx` | 12KB | 生成结果展示 | 改结果展示/预览 |
| `components/ImageUploader.tsx` | 5KB | 图上传组件 | 改上传交互 |
| `components/ImagePreviewModal.tsx` | 8KB | 图预览弹窗(详细) | 改大图预览 |

### 工作流/高级功能
| 文件 | 大小 | 作用 | 什么时候改 |
|------|:---:|------|-----------|
| `components/RunningHubGenerator.tsx` | 27KB | RunningHub 生成器 | 改 RunningHub 集成 |
| `components/RunningHubProgress.tsx` | 15KB | RunningHub 进度 | 改进度显示 |
| `components/Multiangle/` | 目录 | 多角度生成 | 改多角度功能 |

### 通用组件
| 文件 | 大小 | 作用 | 什么时候改 |
|------|:---:|------|-----------|
| `components/SettingsModal.tsx` | 43KB | **设置面板** | 改设置选项 |
| `components/ApiKeyManager.tsx` | 16KB | API Key 管理 | 改 Key 存储/验证 |
| `components/HistoryDock.tsx` | 9KB | 历史记录 Dock | 改历史展示 |
| `components/HistoryPanel.tsx` | 5KB | 历史面板 | 改历史列表 |
| `components/HistoryStrip.tsx` | 12KB | 历史条 | 改历史缩略图条 |
| `components/PromptPresets.tsx` | 3KB | 提示词预设 | 改预设管理 |
| `components/Accordion.tsx` | 2KB | 折叠面板 | 基本不改 |

## ⚙️ 业务逻辑

| 文件 | 大小 | 作用 | 什么时候改 |
|------|:---:|------|-----------|
| `services/geminiService.ts` | 30KB | **Gemini AI 核心** | 换模型/改生成逻辑/加参数 |
| `services/storyLibrary.ts` | 90KB | **内置创意模板数据** | 加模板/改提示词 |
| `services/pebblingGeminiService.ts` | 13KB | Gemini 第二封装 | 改另一种调用方式 |
| `services/creativeExtractor.ts` | 10KB | 网页创意提取器 | 改自动导入 |
| `services/soraService.ts` | <1KB | 旧 Sora 设置的配置兼容层 | 改旧设置读写兼容 |
| `services/veoService.ts` | <1KB | 旧 Veo 设置的配置兼容层 | 改旧设置读写兼容 |
| `services/api/` | 目录 | 前端 API 调用层 | 改 API 请求 |
| `services/db/` | 目录 | 前端数据库层 | 改本地存储 |
| `services/export/` | 目录 | 导出功能 | 改导出格式 |

## 🪝 自定义 Hooks

| 文件 | 大小 | 作用 | 什么时候改 |
|------|:---:|------|-----------|
| `hooks/useDesktopState.ts` | 7KB | 画布状态核心 | 改画布数据模型 |
| `hooks/useDesktopInteraction.ts` | 16KB | 拖拽/点击/右键 | 改交互行为 |
| `hooks/useDesktopLayout.ts` | 5KB | 画布布局计算 | 改排列算法 |
| `hooks/useCreativeIdeas.ts` | 8KB | 创意模板状态管理 | 改创意库逻辑 |
| `hooks/useGenerationHistory.ts` | 6KB | 生成历史 | 改历史记录 |
| `hooks/index.ts` | 1KB | Hook 统一导出 | 基本不改 |

## 📦 状态管理 (Context)

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `contexts/ThemeContext.tsx` | 暗色/亮色主题 | 改主题逻辑 |
| `contexts/ModelContext.tsx` | AI 模型选择全局状态 | 改模型切换逻辑 |
| `contexts/RunningHubTaskContext.tsx` | RunningHub 任务跟踪 | 改 RH 集成 |
| `contexts/RHTaskQueueContext.tsx` | RunningHub 任务队列 | 改任务队列 |

## 📝 类型定义

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `types.ts` | **所有 TS 类型** (387行) | 加新字段/新类型/改数据结构 |
| `types/` | 额外类型文件 | 加类型模块 |

## 🔧 工具/常量

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `constants/defaultRunningHubIdeas.ts` | RunningHub 默认创意 | 加 RH 模板 |
| `utils/image.ts` | 图片处理工具 | 改图片操作 |

## 🖥️ 后端

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `backend-nodejs/src/server.js` | Express 主文件 | 加中间件/改端口/改日志 |
| `backend-nodejs/src/config.js` | 配置中心 | 改路径/端口/限制 |
| `backend-nodejs/src/config.test.mjs` | 配置中心测试 | 验证打包/开发环境目录策略 |
| `backend-nodejs/src/routes/creative.js` | 创意模板 API | 改创意 CRUD |
| `backend-nodejs/src/routes/history.js` | 历史 API | 改历史存取 |
| `backend-nodejs/src/routes/files.js` | 文件 API | 改文件上传/下载 |
| `backend-nodejs/src/routes/settings.js` | 设置 API | 改设置存取 |
| `backend-nodejs/src/routes/desktop.js` | 桌面数据 API | 改画布持久化 |
| `backend-nodejs/src/routes/canvas.js` | 画布 API | 改画布工作流存储 |
| `backend-nodejs/src/routes/imageOps.js` | 图片操作 API | 改去背景/放大 |
| `backend-nodejs/src/routes/runninghub.js` | RunningHub API | 改 RH 后端 |
| `backend-nodejs/src/routes/providerModels.js` | 供应商模型代理 API | 改 OpenAI 兼容模型拉取、解析、分类和错误提示 |
| `backend-nodejs/src/routes/providerModels.test.mjs` | 供应商模型代理测试 | 验证模型解析、分类、HTML/非 2xx 错误 |
| `backend-nodejs/src/utils/jsonStorage.js` | JSON 文件读写 | 改存储方式 |
| `backend-nodejs/src/utils/fileHandler.js` | 文件处理工具 | 改文件操作 |

## 📊 数据文件

| 路径 | 内容 | 什么时候改 |
|------|------|-----------|
| `data/creative_ideas.json` | 用户创建的创意模板 | 手动迁移数据 |
| `data/history.json` | 生成历史记录 | 清理历史 |
| `data/settings.json` | 用户设置 | 手动改设置 |
| `data/desktop_items.json` | 画布上的项目 | 手动迁移画布 |
| `data/canvas_list.json` | 画布列表 | 手动改画布 |

## 🏗️ 构建/部署

| 文件 | 作用 | 什么时候改 |
|------|------|-----------|
| `package.json` | 依赖/脚本/Electron 配置 | 加依赖/改版本号 |
| `vite.config.ts` | Vite 配置 | 改开发服务器/代理 |
| `electron/main.cjs` | Electron 主进程 | 改窗口行为 |
| `electron/` | Electron 相关配置 | 改打包 |
| `scripts/afterPack.cjs` | Electron 打包后写入 Windows 图标与应用版本资源 | 改打包后处理、图标或 EXE 版本信息 |
| `release-uploader/upload.cjs` | 发布上传脚本 | 改上传逻辑 |
| `Start.bat` / `Stop.bat` / `Restart.bat` | 启停脚本 | 改启动命令 |

---

## 🚨 特殊文件警告

| 文件 | 警告 |
|------|------|
| `App.tsx` (165KB) | **不要往里加代码！** 新增功能写成独立组件 |
| `Desktop.tsx` (140KB) | **不要往里加代码！** 交互逻辑拆到 hooks |
| `storyLibrary.ts` (90KB) | 只追加新模板，不要改已有数据结构 |
| `temp_old_sidebar.txt` (41KB) | 历史备份，可直接删除 |
| `creative_images/` | 创意库封面图，别批量删 |
| `.backend.pid` | 后端进程 ID 文件，不要手动改 |
| `services/authToken` | 空文件，可能是认证占位符 |
| `.env` / `.env.*` | 环境变量，gitignore 里有但可能泄露 API Key |

---

## 🏗️ 新架构目录（src/features/ + src/shared/ + src/app/）

> 2026-06-27 新建。按「大炮无限画布」参考架构进行 feature-based 模块化改造。
> 当前为**迁移目标**（Strangler Fig 模式），已有代码逐步迁入。

### src/app/ — 应用壳子

| 文件 | 行数 | 作用 |
|------|:---:|------|
| `src/app/AppProviders.tsx` | 25 | Provider 组合壳 |
| `src/app/AppShell.tsx` | 31 | 应用壳子入口（迁移完成后切换） |
| `src/app/StartupErrorBoundary.tsx` | 60 | 启动错误边界 |
| `src/app/AppStore.ts` | 18 | 应用级运行时状态 |

### src/features/canvas/ — 画布核心 (config + services)

| 文件 | 行数 | 作用 |
|------|:---:|------|
| `config/portTypes.ts` | 220 | 端口类型 SSOT — 23种节点端口合同 |
| `config/nodeTemplates.ts` | 308 | 节点模板注册表 |
| `config/nodeRendererRegistry.ts` | 289 | 渲染元信息注册表 |
| `config/nodeExecutorRegistry.ts` | 74 | 执行器注册表（迁移目标） |
| `config/createNodeCommands.ts` | 97 | 新建节点菜单命令表 |
| `config/connectionHandles.ts` | 48 | 端口handle ID常量 |
| `services/canvasNodeFactory.ts` | 109 | 节点工厂 |
| `services/canvasEdgeFactory.ts` | 119 | 连线工厂 |
| `services/workflowAssetGraph.ts` | 233 | 资产流分析 |
| `services/workflowNodeExecutor.ts` | 81 | 执行入口（注册表分发） |
| `services/workflowRunner.ts` | 171 | 链式运行调度 |
| `types/canvas.types.ts` | 129 | 画布类型扩展 |

### src/features/<feature-id>/ — 业务功能

| Feature | 状态 | 文件 |
|---------|:---:|------|
| image-generation | 🟡 | types, config |
| text-ai | 🟡 | types |
| provider-settings | 🟡 | components/ApiProviderProfilesPanel.tsx, components/ApiProviderModelProfilesPanel.tsx, components/ApiProviderRuntimeSelector.tsx, config/apiProviderTemplates.ts, services/apiProviderSettingsClient.ts, types/providerSettings.types.ts |
| creative-library | 🟡 | types |
| model-registry | 🟡 | types |
| 其余14个feature | 🔴 | 空目录待迁移 |

### src/shared/ — 共享层

| 文件 | 行数 | 作用 |
|------|:---:|------|
| `components/layout/ThreePanelLayout.tsx` | 67 | 三栏布局 |
| `lib/domTarget.ts` | 58 | DOM输入判断 |
| `lib/formatDate.ts` | 55 | 日期格式化 |
| `lib/safeJson.ts` | 24 | JSON安全解析 |
| `types/index.ts` | 51 | 通用类型 |

### 根目录规则文件

| 文件 | 作用 |
|------|------|
| `CLAUDE.md` | 项目规则入口 |
| `AGENTS.md` | Agent协作规则 |
| `docs/file-index.md` | 项目内文件索引树 |
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
