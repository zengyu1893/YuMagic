# 企鹅工坊 — 二创完全指南

> 这是最核心的文件。按你想做的事情，找到对应的改造指南。
> 搭配 [file-map.md](file-map.md) 查文件，[overview.md](overview.md) 理解架构，[safety.md](safety.md) 保命。

---

## 📖 目录

1. [换 AI 模型](#1-换-ai-模型)
2. [加新 AI 服务](#2-加新-ai-服务如-stable-diffusion)
3. [改创意模板库](#3-改创意模板库)
4. [改 UI 和主题](#4-改-ui-和主题)
5. [改画布交互](#5-改画布交互)
6. [加全新功能模块](#6-加全新功能模块)
7. [改后端逻辑](#7-改后端逻辑)
8. [国际化/汉化](#8-国际化汉化)
9. [打包发布自己的版本](#9-打包发布自己的版本)

---

## 1. 换 AI 模型

### 场景
你想把 Gemini 换成别的 AI（如 OpenAI GPT-4o、Claude、国产大模型）。

### 影响范围
- **主战场:** `services/geminiService.ts` (30KB)
- **次战场:** `services/pebblingGeminiService.ts` (13KB)
- **可能涉及:** `components/ApiKeyManager.tsx`, `types.ts`

### 改造步骤

#### 第一步：理解现有结构

打开 `services/geminiService.ts`，看懂这几个函数：

```typescript
// 1. 初始化客户端（你改成新模型的 SDK）
export const initializeAiClient = (apiKey: string) => {
  ai = new GoogleGenAI({ apiKey });  // 把这行换成新 SDK
};

// 2. 生成内容（核心！这是你要重写的）
export const generateContent = async (
  prompt: string,
  images: File[],
  config: GenerationConfig
): Promise<GeneratedContent> => {
  // 这整个函数你需要替换成新模型的调用方式
  // 但返回值格式必须保持 GeneratedContent！
};

// 3. 重试机制（可以保留或重写）
const withRetry = async <T>(...): Promise<T> => {
  // 通用的重试逻辑，跨模型可用
};
```

#### 第二步：保持返回值格式

**这是最关键的一步。** 无论你换什么模型，`generateContent` 必须返回 `GeneratedContent` 格式：

```typescript
// types.ts 中定义 — 不要改这个接口！
interface GeneratedContent {
  text: string | null;      // AI 返回的文字
  imageUrl: string | null;  // 生成的图片 URL (base64 或 本地路径)
  originalFiles?: File[];   // 生成时用的原图
  coinsDeducted?: number;   // 扣了多少鹅卵石（可选）
  coinsRemaining?: number;  // 还剩多少鹅卵石（可选）
}
```

#### 第三步：以 OpenAI 为例的改造代码

```typescript
// 在 geminiService.ts 里的改动

import OpenAI from 'openai';

let client: OpenAI | null = null;

export const initializeAiClient = (apiKey: string) => {
  if (!apiKey) {
    client = null;
    return;
  }
  client = new OpenAI({ 
    apiKey,
    dangerouslyAllowBrowser: true  // 前端调用需要这个
  });
};

// 改造核心生成函数
export const generateContent = async (
  prompt: string,
  images: File[],
  config: GenerationConfig
): Promise<GeneratedContent> => {
  if (!client) throw new Error('AI Client not initialized');
  
  try {
    const messages = [
      { role: 'user' as const, content: prompt }
      // 如果有图片，这里要转成 OpenAI 的 vision 格式
    ];
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages,
    });
    
    // 关键：转成 GeneratedContent 格式
    return {
      text: response.choices[0]?.message?.content || null,
      imageUrl: null,  // OpenAI 文本模型不返回图片
      originalFiles: images,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`生成失败: ${message}`);
  }
};
```

### ⚠️ 常见坑

- **CORS:** 前端直接调 OpenAI API 可能被浏览器拦截，需要通过后端代理
- **图片格式:** Gemini 用 `inlineData`，OpenAI 用 `image_url`，格式不同
- **计费:** Gemini 的鹅卵石计费逻辑在 `pebblingGeminiService.ts`，换模型后要根据新模型的定价调整

---

## 2. 加新 AI 服务（如 Stable Diffusion）

### 场景
不替换 Gemini，而是**新增**一个 AI 服务（如 SD、Midjourney、通义万相）。

### 改造步骤

#### 第一步：新建服务文件

```typescript
// services/stableDiffusionService.ts

import { GeneratedContent } from '../types';

let isInitialized = false;

export const initializeSD = (apiKey: string) => {
  isInitialized = !!apiKey;
};

export const generateSDImage = async (
  prompt: string,
  negativePrompt?: string,
  steps?: number
): Promise<GeneratedContent> => {
  if (!isInitialized) throw new Error('SD not initialized');
  
  try {
    const response = await fetch('https://api.stability.ai/v1/generation/...', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sd_api_key')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        steps: steps || 30,
      }),
    });
    
    const data = await response.json();
    const base64 = data.artifacts[0]?.base64;
    
    return {
      text: prompt,
      imageUrl: base64 ? `data:image/png;base64,${base64}` : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`SD 生成失败: ${message}`);
  }
};
```

#### 第二步：在创意模板中注册

```typescript
// services/storyLibrary.ts — 在创意模板数组末尾追加

{
  id: 1001,
  title: 'Stable Diffusion 写实人像',
  prompt: 'Professional portrait of {subject}, {lighting} lighting, 8k',
  category: 'character',
  imageUrl: '/files/creative/sd_portrait.jpg',
  author: '你的名字',
  suggestedAspectRatio: '3:4',
  suggestedResolution: '2K',
  // 自定义字段（需要在 types.ts 追加 SdConfig 类型）
  sdConfig: {
    negativePrompt: 'ugly, deformed, extra fingers',
    steps: 30,
    cfgScale: 7,
  } as Record<string, unknown>,  // 临时用 Record，后续定义具体类型替换
}
```

#### 第三步：加 UI 入口（如果需要）

```typescript
// components/MySDGenerator/MySDGenerator.tsx
export default function MySDGenerator() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateSDImage(prompt, negativePrompt);
      setResult(res);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="sd-generator p-4">
      <textarea 
        className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
        placeholder="输入 SD 提示词..."
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />
      <button 
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? '生成中...' : 'SD 生成'}
      </button>
      {result?.imageUrl && <img src={result.imageUrl} alt="生成结果" />}
    </div>
  );
}
```

#### 第四步：在 App.tsx 中注册

```typescript
// App.tsx — 找到合适的位置，加一行导入和引用
import MySDGenerator from './components/MySDGenerator/MySDGenerator';

// 在 JSX 中的合适位置加入
<MySDGenerator />
```

---

## 3. 改创意模板库

### 场景 A：添加新的创意模板

#### 最简单：修改数据文件

```typescript
// services/storyLibrary.ts — 在文件末尾的数组里加

// 在最后一个 ] 之前追加（注意逗号）
export const defaultStoryLibrary: CreativeIdea[] = [
  // ... 前面有很多模板 ...
  
  // ====== 你的自定义模板 ======
  {
    id: 2001,                          // 从 2000 开始，避免跟原有冲突
    title: '我的自定义模板',
    prompt: 'A {animal} in {environment}, digital art',
    imageUrl: '/files/creative/my_template.jpg',
    author: 'MyName',
    category: 'art',
    isFavorite: false,
    suggestedAspectRatio: '1:1',
    suggestedResolution: '2K',
  },
  {
    id: 2002,
    title: '另一个模板',
    prompt: 'Cinematic shot of {subject}, {lighting}, 4k',
    imageUrl: '/files/creative/my_template2.jpg',
    author: 'MyName',
    category: 'scene',
    suggestedAspectRatio: '16:9',
    suggestedResolution: '4K',
  },
];
```

**图片怎么处理？**
```
1. 把封面图放到 creative_images/ 目录
2. imageUrl 写 /files/creative/my_template.jpg
3. 后端会自动托管 creative_images/ 目录
```

#### 在界面里添加（不写代码）

```
打开应用 → 创意库 → 点击「+」或「新建创意」→ 填表单 → 保存
```
数据会存到 `data/creative_ideas.json`，由后端管理。

### 场景 B：修改创意分类

```typescript
// types.ts — 改分类定义
export type CreativeCategoryType = 
  | 'character'   // 👤 人物
  | 'scene'       // 🏞️ 场景
  | 'product'     // 📦 产品
  | 'art'         // 🎨 艺术
  | 'tool'        // 🔧 工具
  | 'other'       // 📁 其他
  | 'anime';      // 🎌 你的新分类

// 同时更新分类配置
export const CREATIVE_CATEGORIES = [
  // ... 原有的 ...
  { key: 'anime', label: '动漫', icon: '🎌' },  // 加在最后
];
```

### 场景 C：改创意模板的 UI

改 `components/CreativeLibrary.tsx` (43KB)，但注意：

- **只改 UI 相关代码**，不要动数据逻辑
- 数据获取逻辑在 `hooks/useCreativeIdeas.ts`
- 如果改分类筛选，注意 `CREATIVE_CATEGORIES` 常量

---

## 4. 改 UI 和主题

### 场景 A：改颜色 / 字体

```css
/* index.css — 修改 CSS 变量 */

:root {
  /* 主色调 */
  --color-primary: #3B82F6;      /* 改成你喜欢的颜色 */
  --color-primary-hover: #2563EB;
  
  /* 背景色 */
  --color-bg: #0F172A;           /* 深色背景 */
  --color-bg-card: #1E293B;      /* 卡片背景 */
  --color-bg-hover: #334155;     /* 悬停背景 */
  
  /* 文字色 */
  --color-text: #F8FAFC;         /* 主文字 */
  --color-text-secondary: #94A3B8; /* 次要文字 */
  
  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

### 场景 B：改布局

```tsx
// App.tsx — 三大区域布局
return (
  <div className="app-container">
    {/* 左侧边栏 — 创意库 */}
    <CreativeLibrary />
    
    {/* 中间主区域 — 画布 */}
    <Desktop />
    
    {/* 右侧边栏 — 历史记录 */}
    <HistoryDock />
  </div>
);
```

改布局就是调整这三个区域的位置/大小。

### 场景 C：加新的 UI 组件

完全新建，不要修改已有组件：

```
components/
└── MyNewWidget/
    ├── MyNewWidget.tsx       # 组件本体
    └── MyNewWidget.css       # 如果 Tailwind 不够用（尽量用 Tailwind）
```

---

## 5. 改画布交互

### ⚠️ 警告

Desktop.tsx 有 140KB (2800+ 行)，是这个项目最难改的部分。**新手尽量不要直接改它。**

### 替代方案

#### 加新的拖拽行为

```
hooks/useDesktopInteraction.ts (16KB)
```

这里有拖拽、点击、右键等交互逻辑。如果你要改拖拽行为，改这里。

#### 加新的右键菜单

在 Desktop.tsx 中搜索 `contextMenu`，找到右键菜单的定义位置，追加你的菜单项。

#### 加新的布局逻辑

```
hooks/useDesktopLayout.ts (5KB)
```

如果你想让图片按不同方式排列，改这里。

### 必须改 Desktop.tsx 时

1. 用 Ctrl+F 找到你要改的那部分
2. 只改那一小段，不要动其他代码
3. 改完立刻测试

---

## 6. 加全新功能模块

### 标准流程（七步法）

```
第一步：设计数据模型     → types.ts 加类型定义
第二步：写后端 API       → backend-nodejs/src/routes/ 新路由
第三步：写前端服务层     → services/ 新服务文件
第四步：写业务逻辑       → hooks/ 新 Hook
第五步：写 UI 组件       → components/ 新组件目录
第六步：注册到应用       → App.tsx 加一行引用
第七步：测试             → 启动应用，手动测试
```

### 实例：加一个「图片收藏夹」功能

#### 第一步：types.ts

```typescript
// 追加到文件末尾
export interface FavoriteCollection {
  id: string;
  name: string;
  imageIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### 第二步：后端路由

```javascript
// backend-nodejs/src/routes/favorites.js
const express = require('express');
const router = express.Router();
const JsonStorage = require('../utils/jsonStorage');
const path = require('path');
const config = require('../config');

const FAVORITES_FILE = path.join(config.DATA_DIR, 'favorites.json');

// 获取所有收藏夹
router.get('/', (req, res) => {
  const favorites = JsonStorage.read(FAVORITES_FILE, []);
  res.json({ success: true, data: favorites });
});

// 创建收藏夹
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: '名称不能为空' });
  }
  const favorites = JsonStorage.read(FAVORITES_FILE, []);
  const newFav = {
    id: Date.now().toString(),
    name,
    imageIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  favorites.push(newFav);
  JsonStorage.write(FAVORITES_FILE, favorites);
  res.json({ success: true, data: newFav });
});

// 添加图片到收藏夹
router.post('/:id/images', (req, res) => {
  const { imageId } = req.body;
  const favorites = JsonStorage.read(FAVORITES_FILE, []);
  const fav = favorites.find(f => f.id === req.params.id);
  if (!fav) return res.status(404).json({ success: false, error: '收藏夹不存在' });
  
  if (!fav.imageIds.includes(imageId)) {
    fav.imageIds.push(imageId);
    fav.updatedAt = new Date().toISOString();
    JsonStorage.write(FAVORITES_FILE, favorites);
  }
  res.json({ success: true, data: fav });
});

module.exports = router;
```

```javascript
// 在 server.js 中注册
const favoritesRouter = require('./routes/favorites');
app.use('/api/favorites', favoritesRouter);
```

#### 第三步：前端服务层

```typescript
// services/api/favorites.ts
const BASE_URL = 'http://127.0.0.1:8765/api';

export async function getFavorites() {
  const res = await fetch(`${BASE_URL}/favorites`);
  return res.json();
}

export async function createFavorite(name: string) {
  const res = await fetch(`${BASE_URL}/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function addImageToFavorite(favId: string, imageId: string) {
  const res = await fetch(`${BASE_URL}/favorites/${favId}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId }),
  });
  return res.json();
}
```

#### 第四步：Hook

```typescript
// hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import { FavoriteCollection } from '../types';
import { getFavorites, createFavorite } from '../services/api/favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    getFavorites()
      .then(res => setFavorites(res.data))
      .finally(() => setIsLoading(false));
  }, []);
  
  const addFavorite = useCallback(async (name: string) => {
    const res = await createFavorite(name);
    if (res.success) {
      setFavorites(prev => [...prev, res.data]);
    }
    return res;
  }, []);
  
  return { favorites, isLoading, addFavorite };
}
```

#### 第五步：UI 组件

```typescript
// components/FavoritesPanel/FavoritesPanel.tsx
import { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites';

export default function FavoritesPanel() {
  const { favorites, isLoading, addFavorite } = useFavorites();
  const [newName, setNewName] = useState('');
  
  const handleCreate = async () => {
    if (!newName.trim()) return;
    await addFavorite(newName.trim());
    setNewName('');
  };
  
  if (isLoading) return <div>加载中...</div>;
  
  return (
    <div className="favorites-panel p-4">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Heart size={20} /> 收藏夹
      </h2>
      
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 px-3 py-1 border rounded dark:bg-gray-800 dark:text-white"
          placeholder="新建收藏夹..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button 
          className="px-3 py-1 bg-blue-600 text-white rounded"
          onClick={handleCreate}
        >
          <Plus size={16} />
        </button>
      </div>
      
      <div className="space-y-2">
        {favorites.map(fav => (
          <div key={fav.id} className="p-3 border rounded dark:border-gray-700">
            <span>{fav.name}</span>
            <span className="text-gray-400 ml-2">({fav.imageIds.length})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 第六步：注册

```typescript
// App.tsx — 在 imports 区域加
import FavoritesPanel from './components/FavoritesPanel/FavoritesPanel';

// 在 JSX 中加（放在侧边栏或合适位置）
<FavoritesPanel />
```

#### 第七步：测试

```bash
# 重新构建
npm run build

# 启动
Start.bat

# 打开 http://127.0.0.1:8765
# 手动测试：创建收藏夹 → 添加图片 → 检查数据文件
```

---

## 7. 改后端逻辑

### 后端文件结构

```
backend-nodejs/src/
├── server.js           # Express 主程序
├── config.js           # 所有配置
├── routes/
│   ├── creative.js     # 创意模板 CRUD
│   ├── history.js      # 生成历史
│   ├── files.js        # 文件上传/下载
│   ├── settings.js     # 用户设置
│   ├── desktop.js      # 画布数据
│   ├── canvas.js       # 画布工作流
│   ├── imageOps.js     # 图片处理
│   └── runninghub.js   # RunningHub 集成
└── utils/
    ├── jsonStorage.js  # JSON 文件读写
    └── fileHandler.js  # 文件操作工具
```

### 常见改造

#### 改端口号

```javascript
// backend-nodejs/src/config.js
PORT: process.env.PORT || 8765,  // 把 8765 改成你想要的
```

#### 加 CORS（允许其他来源访问）

```javascript
// backend-nodejs/src/server.js
app.use(cors({
  origin: ['http://127.0.0.1:8765', 'http://localhost:3000'],  // 加你的域名
}));
```

#### 加新 API 路由

```javascript
// 1. 新建 backend-nodejs/src/routes/xxx.js
// 2. 在 server.js 中注册
const xxxRouter = require('./routes/xxx');
app.use('/api/xxx', xxxRouter);
```

#### 改数据存储

数据默认存在 `data/` 目录的 JSON 文件中。如果你想改用数据库：

```javascript
// 改造 backend-nodejs/src/utils/jsonStorage.js
// 保留 JSON 存储的接口，但底层换成数据库
// 这样所有路由代码不需要改
```

---

## 8. 国际化/汉化

项目目前是中文界面，如果你想支持其他语言：

### 第一步：提取所有硬编码字符串

在组件中找到中文字符串，替换为翻译函数：

```typescript
// 之前
<button>生成图片</button>
<div>创意库</div>

// 之后
<button>{t('generate.button')}</button>
<div>{t('creative.library')}</div>
```

### 第二步：建翻译文件

```typescript
// locales/zh-CN.ts
export default {
  'generate.button': '生成图片',
  'creative.library': '创意库',
  'settings.title': '设置',
};

// locales/en-US.ts
export default {
  'generate.button': 'Generate',
  'creative.library': 'Creative Library',
  'settings.title': 'Settings',
};
```

**注意：** 这是一个大工程，项目中有大量硬编码的中文字符串。建议分阶段做：
1. 先做主要按钮和标题
2. 再做设置面板
3. 最后处理提示信息和错误消息

---

## 9. 打包发布自己的版本

### 发布前检查

```
□ package.json 中的 name 已修改（不要叫 penguin-magic）
□ package.json 中的 version 已更新
□ author 已改成你的名字
□ appId 已修改（com.penguin.magic → com.yourname.xxx）
□ productName 已修改
□ 去掉了所有跟原版相关的联系方式
□ README.md 已重写
□ CHANGELOG.md 已更新
□ 创意模板数据里没有侵权内容
□ data/ output/ input/ 目录是空的
□ 没有残留的 API Key
```

### 打包命令

```bash
# 先构建前端
npm run build

# 打包 Windows 版本
npm run package

# 打包所有平台
npm run package:all
```

### 修改安装包信息

```json
// package.json — build 配置
{
  "build": {
    "appId": "com.yourname.yourapp",      // 改
    "productName": "YourAppName",          // 改
    "win": {
      "icon": "resources/icon.ico",       // 换你自己的图标
    },
    "nsis": {
      "installerIcon": "resources/icon.ico"
    }
  }
}
```

---

## 🔧 调试技巧

### 前端调试

```
1. 浏览器打开 http://127.0.0.1:8765
2. 按 F12 打开开发者工具
3. Console 标签 = 看报错和日志
4. Network 标签 = 看 API 请求
5. Sources 标签 = 打断点调试
```

### 后端调试

```
1. 看启动 Start.bat 那个终端窗口的输出
2. 每个 API 请求都会被记录（带时间戳）
3. 报错会显示在终端里
```

### 数据调试

```
1. 打开 data/ 目录
2. 查看 JSON 文件内容
3. 手动修改可以快速测试（记得备份）
```

---

## 📌 改造优先级建议（小白友好度排序）

| 难度 | 任务 | 适合 |
|:---:|------|------|
| 🟢 简单 | 加创意模板 | 改 `storyLibrary.ts` 末尾 |
| 🟢 简单 | 修改首页文字 | 改 `WelcomeScreen.tsx` |
| 🟢 简单 | 改颜色主题 | 改 `index.css` 变量 |
| 🟡 中等 | 加新 AI 服务 | 新建 `services/xxxService.ts` |
| 🟡 中等 | 加新功能模块 | 走七步法流程 |
| 🟡 中等 | 改创意库 UI | 改 `CreativeLibrary.tsx` |
| 🔴 困难 | 换 AI 模型 | 改 `geminiService.ts` 核心逻辑 |
| 🔴 困难 | 改画布交互 | 改 `Desktop.tsx` 或 `useDesktopInteraction.ts` |
| 🔴 困难 | 改后端数据存储 | 改 `jsonStorage.js` |
| 💀 地狱 | 重构 App.tsx | 拆解 165KB 的巨型文件 |
| 💀 地狱 | 加后端认证 | 改所有路由加 JWT/OAuth |

建议从 🟢 开始，积累信心后再挑战 🔴。
