# 企鹅工坊 Penguin Magic — 项目全貌

> 本文件是二创入门第一站。先读懂这张地图，再动手改代码。
> 参考上层规则：全局规则 `~/.claude/rules/ecc/common/` `~/.claude/rules/ecc/web/`

---

## 🧭 一句话概括

企鹅工坊是一个 **AI 图像桌面管理工具**。用户输入提示词 → AI 生成图片 → 在画布上拖拽管理这些图片，就像整理电脑桌面一样。

---

## 🏗️ 技术架构（三层）

```
┌─────────────────────────────────────────────┐
│  前端 (React 19 + TypeScript + Tailwind)     │
│  Vite 构建 → dist/                           │
│  端口: 5176 (dev) / 8765 (生产，由后端托管)  │
├─────────────────────────────────────────────┤
│  后端 (Node.js + Express)                    │
│  backend-nodejs/src/server.js               │
│  端口: 8765                                  │
├─────────────────────────────────────────────┤
│  桌面壳 (Electron)                           │
│  electron/main.cjs                           │
│  把浏览器包装成 .exe                          │
└─────────────────────────────────────────────┘
```

**数据流方向：**
```
用户浏览器 ←→ 后端 Express API ←→ JSON 文件存储
     │
     └→ Gemini API / RunningHub API (AI 生成)
```

---

## 📂 核心目录速览

| 目录/文件 | 是什么 | 二创常见度 |
|-----------|--------|:---:|
| `App.tsx` | 应用主入口，组装所有模块 (165KB，过大) | ⭐⭐⭐ |
| `components/Desktop.tsx` | 画布主界面，拖拽管理 (140KB，过大) | ⭐⭐⭐ |
| `components/CreativeLibrary.tsx` | 创意模板库界面 (43KB) | ⭐⭐⭐ |
| `components/SettingsModal.tsx` | 设置面板 (43KB) | ⭐⭐ |
| `components/AddCreativeIdeaModal.tsx` | 添加/编辑创意模板弹窗 (38KB) | ⭐⭐ |
| `components/ApiKeyManager.tsx` | API Key 管理 | ⭐⭐ |
| `components/GenerateButton.tsx` | 生成按钮组件 | ⭐⭐ |
| `components/PebblingCanvas/` | 画布节点编辑器 | ⭐⭐⭐ |
| `components/Desktop/` | 桌面相关子组件 | ⭐⭐ |
| `services/geminiService.ts` | Gemini AI 生成核心逻辑 (30KB) | ⭐⭐⭐ |
| `services/storyLibrary.ts` | 内置创意模板数据 (90KB) | ⭐⭐⭐ |
| `services/pebblingGeminiService.ts` | 另一个 Gemini API 封装 | ⭐⭐ |
| `services/creativeExtractor.ts` | 从网页提取创意模板 | ⭐⭐ |
| `hooks/` | 6 个自定义 Hook，管理桌面状态 | ⭐⭐⭐ |
| `contexts/` | 3 个 Context (主题/任务队列) | ⭐⭐ |
| `types.ts` | 所有 TypeScript 类型定义 (核心!) | ⭐⭐⭐ |
| `constants/` | 常量定义 | ⭐ |
| `utils/` | 工具函数 (图片处理等) | ⭐ |
| `backend-nodejs/src/server.js` | Express 后端主文件 | ⭐⭐⭐ |
| `backend-nodejs/src/routes/` | 8 个 API 路由模块 | ⭐⭐⭐ |
| `backend-nodejs/src/config.js` | 后端配置 (路径/端口等) | ⭐⭐ |
| `data/` | JSON 数据文件 (创意/历史/设置) | ⭐⭐ |
| `output/`, `input/` | AI 生成的图片存放处 | ⭐ |
| `electron/` | Electron 打包配置 | ⭐ |
| `docs/` | API 接入文档 | ⭐ |

---

## 🔗 核心数据流

### 生成一张图的完整链路

```
1. 用户选择创意模板 (CreativeLibrary → storyLibrary.ts)
2. 用户在 GenerateButton 输入提示词
3. 前端调用 services/geminiService.ts
4. geminiService 用 @google/genai SDK 调 Gemini API
5. Gemini 返回图片 base64
6. 前端显示在 GeneratedImageDisplay 组件
7. 用户拖拽到 Desktop 画布
8. 画布状态通过 useDesktopState Hook 管理
9. 保存时写后端 API → JSON 文件
```

### 前端状态管理

```
App.tsx (最顶层，管理全局状态)
  ├─ useCreativeIdeas    — 创意模板列表
  ├─ useGenerationHistory — 生成历史
  ├─ useDesktopState     — 画布上的项目
  ├─ useDesktopLayout    — 画布布局计算
  ├─ useDesktopInteraction — 拖拽/点击交互
  └─ contexts/
       ├─ ThemeContext    — 暗色/亮色主题
       ├─ RunningHubTaskContext — RunningHub 任务
       └─ RHTaskQueueContext     — RunningHub 任务队列
```

### 后端 API 路由

```
/api/creative-ideas  — 创意模板 CRUD
/api/history         — 生成历史
/api/files           — 图片文件管理
/api/settings        — 用户设置 (主题/API Key)
/api/desktop         — 画布项目
/api/image-ops       — 图片处理 (移除背景/放大)
/api/canvas          — 画布工作流
/api/runninghub      — RunningHub 工作流
/api/status          — 服务状态检查
```

---

## 🎯 二创入口点指南

根据你想做的事情，找到正确的起点：

| 你想做什么 | 主要改什么 |
|-----------|-----------|
| **换 AI 模型** (换 Claude/OpenAI/国产) | `services/geminiService.ts` + `services/pebblingGeminiService.ts` |
| **加新的生图方式** (如 Stable Diffusion) | 新建 `services/xxxService.ts`，参考 geminiService 模式 |
| **修改/添加创意模板** | `services/storyLibrary.ts` (数据) + `components/CreativeLibrary.tsx` (界面) |
| **改 UI 风格/主题** | `index.css` + `components/` 下各组件 + `contexts/ThemeContext.tsx` |
| **改画布交互** | `components/Desktop.tsx` + `hooks/useDesktopInteraction.ts` |
| **加新功能模块** | 新建 `components/YourFeature/` 目录 + 在 `App.tsx` 中引入 |
| **接入新 API (如 RunningHub)** | `backend-nodejs/src/routes/` + `services/` |
| **汉化/国际化** | 散落在各组件中的中文字符串 |
| **修复 Bug** | 根据报错信息定位，参考 `docs/` 中的文档 |
| **打包发布** | `electron/` + `package.json` 的 build 配置 |

---

## ⚠️ 已知技术债（二创时要注意）

1. **超大文件** — `App.tsx` (165KB) 和 `Desktop.tsx` (140KB) 严重超标
2. **无测试** — 项目没有测试文件，改代码靠手动验证
3. **无类型检查** — 部分地方用 `any` 绕过类型系统
4. **console.log 残留** — 生产代码中有大量调试日志
5. **硬编码** — 部分配置写死在代码中而非配置文件
6. **后端无认证** — API 没有鉴权，任何人都能访问

---

## 📋 开发前检查清单

- [ ] 能跑通吗？`start.bat` 启动后 `http://127.0.0.1:8765` 能打开
- [ ] 后端正常吗？红房子/黄房子指示器是否绿了
- [ ] API Key 配了吗？在设置里填好 Gemini API Key
- [ ] 知道要改哪个文件了吗？参考上面的「二创入口点指南」
