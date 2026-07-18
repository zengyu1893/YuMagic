# 企鹅工坊 — 编码规范

> 二创时写代码要遵守这些规则。延续原项目的风格，你的代码才能融入进去。
> 参考上层规则：全局规则 `~/.claude/rules/ecc/common/coding-style.md` `~/.claude/rules/ecc/web/coding-style.md`

---

## 🎯 最重要的规则：文件大小管控

这是原项目最大的技术债，也是你二创时最重要的纪律。

| 规则 | 说明 |
|------|------|
| **新文件不超过 400 行** | 200-300 行最好 |
| **绝不往超大文件里加代码** | App.tsx (165KB) / Desktop.tsx (140KB) / storyLibrary.ts (90KB) |
| **组件一个文件一个功能** | 别把两个组件写在一个文件里 |
| **拆分的信号** | 一个文件有 3+ 个 `export` 时考虑拆分 |

```typescript
// ❌ 错误：在 App.tsx 里加新模块
function App() {
  // ... 已有的 2800 行代码 ...
  return (
    <div>
      {/* ❌ 不要在这里加新模块的 JSX */}
      <MyNewFeature />  
    </div>
  );
}

// ✅ 正确：新功能独立文件，在 App.tsx 只引用
// components/MyNewFeature/MyNewFeature.tsx
export function MyNewFeature() {
  return <div>新功能</div>;
}

// App.tsx 里只加一行 import
import { MyNewFeature } from './components/MyNewFeature/MyNewFeature';
```

---

## 📝 命名规范

### 文件命名

```
✅ components/MyFeature/MyFeature.tsx    — 组件用 PascalCase
✅ hooks/useMyFeature.ts                 — Hook 用 use 前缀
✅ services/myService.ts                 — 服务用 camelCase
✅ utils/myUtil.ts                       — 工具用 camelCase
✅ types/myTypes.ts                      — 类型用 camelCase
✅ constants/myConstants.ts              — 常量用 camelCase

❌ components/my-feature.tsx             — 不用 kebab-case（原项目没用）
❌ hooks/MyFeatureHook.ts                — Hook 必须 use 前缀
```

### 变量/函数命名

```typescript
// ✅ 跟原项目保持一致
const creativeIdeas: CreativeIdea[]     // camelCase 变量
const [isGenerating, setIsGenerating]   // boolean 用 is/has/can 前缀
function generateImage(prompt: string)  // camelCase 函数
function handleGenerateClick()          // 事件处理器 handle 前缀
function useDesktopState()              // Hook use 前缀

// 组件: PascalCase
export function CreativeLibrary() {}
export function GenerateButton() {}

// 接口/类型: PascalCase（原项目用 type 多于 interface）
type CreativeIdea = { ... }
type ApiStatus = 'Idle' | 'Loading' | 'Success' | 'Error'

// 常量: UPPER_SNAKE_CASE
const MAX_HISTORY_COUNT = 500
const CREATIVE_CATEGORIES = [...]
```

---

## 🧩 组件编写规范

### 组件结构模板

```typescript
// 1. React 导入
import React, { useState, useEffect, useCallback } from 'react';

// 2. 第三方库导入
import { X } from 'lucide-react';

// 3. 项目内导入
import { CreativeIdea } from '../../types';
import { useCreativeIdeas } from '../../hooks/useCreativeIdeas';

// 4. 类型定义
interface MyComponentProps {
  title: string;
  items: CreativeIdea[];
  onSelect: (id: number) => void;
}

// 5. 组件（默认导出）
export default function MyComponent({ title, items, onSelect }: MyComponentProps) {
  // 5a. Hooks 放在最上面
  const [isOpen, setIsOpen] = useState(false);
  
  // 5b. 派生计算
  const filteredItems = items.filter(item => item.isFavorite);
  
  // 5c. 事件处理器
  const handleClick = useCallback((id: number) => {
    setIsOpen(true);
    onSelect(id);
  }, [onSelect]);
  
  // 5d. 条件渲染
  if (!items.length) {
    return <div className="empty-state">暂无内容</div>;
  }
  
  // 5e. 主渲染
  return (
    <div className="my-component">
      <h2>{title}</h2>
      {filteredItems.map(item => (
        <button key={item.id} onClick={() => handleClick(item.id)}>
          {item.title}
        </button>
      ))}
    </div>
  );
}
```

### 不要这样写组件

```typescript
// ❌ 错误：组件里定义另一个组件
function Parent() {
  function Child() {  // ❌ 每次渲染都重新创建
    return <div>子组件</div>;
  }
  return <Child />;
}

// ✅ 正确：拆成两个独立组件
function Child() {
  return <div>子组件</div>;
}
function Parent() {
  return <Child />;
}

// ❌ 错误：在 JSX 里写复杂逻辑
return (
  <div>
    {items.filter(i => i.category === 'art')
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 10)
          .map(i => <Card key={i.id} item={i} />)}
  </div>
);

// ✅ 正确：提取到外面
const topArtItems = items
  .filter(i => i.category === 'art')
  .sort((a, b) => b.createdAt - a.createdAt)
  .slice(0, 10);
return (
  <div>
    {topArtItems.map(i => <Card key={i.id} item={i} />)}
  </div>
);
```

---

## 🔄 节点执行规范（CRITICAL）

**所有节点执行必须遵循此模式：源节点保持 idle，只让输出节点转圈。**

```typescript
// ❌ 错误：源节点显示执行中，阻塞用户继续创作
updateNode(nodeId, { status: 'running' });
const result = await apiCall();
updateNode(nodeId, { content: result, status: 'completed' });

// ✅ 正确：源节点不变，创建输出节点转圈
const outNodeId = uuid();
const outNode: CanvasNode = {
    id: outNodeId, type: 'image', title: '输出',
    content: '',
    x: node.x + node.width + 100, y: node.y,
    width: 300, height: 300, status: 'running'   // ← 只有输出节点转圈
};
// 添加节点和连接
const conn = { id: uuid(), fromNode: nodeId, toNode: outNodeId };
nodesRef.current = [...nodesRef.current, outNode];
connectionsRef.current = [...connectionsRef.current, conn];
setNodes(prev => [...prev, outNode]);
setConnections(prev => [...prev, conn]);
setHasUnsavedChanges(true);

try {
    const result = await apiCall();
    if (!signal.aborted) updateNode(outNodeId, { content: result, status: 'completed' });
} catch {
    if (!signal.aborted) updateNode(outNodeId, { status: 'error' });
}
// 源节点始终 idle，可以继续点击执行
```

**核心规则：**
- 源节点始终 `idle`，用户可连续点击多次执行
- 输出节点初始 `status: 'running'`（显示转圈）
- API 成功 → 输出节点 `completed`，失败 → `error`
- **不要**使用执行锁（`executingNodesRef`），用户应能自由重复执行
- **不要**检查 `node.status === 'running'` 阻止执行

---

## 🎨 样式规范

原项目使用 **Tailwind CSS**，样式写在 `className` 中。

```tsx
// ✅ 正确：Tailwind className
<div className="flex items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
  <span className="text-lg font-bold text-gray-900 dark:text-white">标题</span>
</div>

// ❌ 错误：内联 style
<div style={{ display: 'flex', padding: '16px' }}>  // 不要这样

// ❌ 错误：自己写 CSS 文件（除非有特殊理由）
// 原项目大部分样式都用 Tailwind，保持一致性
```

### 全局样式

`index.css` (23KB) 包含了全局样式、CSS 变量、动画定义等。

```css
/* 如果需要加全局样式，加在 index.css 末尾 */
/* 如果只是组件样式，用 Tailwind className 就行 */
```

### 暗色模式

```tsx
// ✅ 正确：同时写 light 和 dark
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

// ❌ 错误：只写 light 模式
<div className="bg-white text-gray-900">
```

---

## 📐 类型定义规范

### 追加字段，不修改已有

```typescript
// ✅ 正确：在 CreativeIdea 接口里追加新字段
interface CreativeIdea {
  // ... 已有字段不要动 ...
  
  // 新增字段加在最后
  myNewField?: string;          // 可选的用 ?
  myNewRequired: boolean;       // 必填的不用 ?
}

// ❌ 错误：删除或重命名已有字段
interface CreativeIdea {
  // title: string;             // ❌ 不要删除
  // myTitle: string;           // ❌ 不要重命名
}
```

### 不要用 any

```typescript
// ❌ 错误
function processData(data: any): any {
  return data.result;
}

// ✅ 正确：定义具体类型
interface ProcessInput {
  result: string;
}
function processData(data: ProcessInput): string {
  return data.result;
}

// ✅ 如果实在不知道类型，用 unknown
function processData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'result' in data) {
    return String((data as { result: unknown }).result);
  }
  return '';
}
```

---

## 🪝 Hook 编写规范

```typescript
// ✅ 正确：Hook 的结构
export function useMyFeature(initialValue: string) {
  // 1. 状态
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  
  // 2. 副作用
  useEffect(() => {
    // 初始化逻辑
  }, [initialValue]);
  
  // 3. 函数
  const updateValue = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);
  
  // 4. 返回值
  return { value, isLoading, updateValue };
}
```

---

## 🔧 服务层编写规范

参考 `services/geminiService.ts` 的模式：

```typescript
// ✅ 正确：跟原项目一致的模式
let instance: SomeClient | null = null;

export const initializeClient = (apiKey: string) => {
  if (!apiKey) {
    instance = null;
    return;
  }
  instance = new SomeClient({ apiKey });
};

export const doSomething = async (param: string): Promise<Result> => {
  if (!instance) throw new Error('Client not initialized');
  
  try {
    const result = await instance.call(param);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`操作失败: ${message}`);
  }
};
```

---

## 🤖 AI 提示词规范

如果你在 `storyLibrary.ts` 里加创意模板，注意：

```typescript
// ✅ 正确：提示词模板用占位符
{
  id: 999,
  title: '我的新模板',
  prompt: 'A beautiful {scene} with {character}, in {style} style',  // 占位符用 {xxx}
  category: 'art',
  imageUrl: '/files/creative/my_template.jpg',
  author: '你的名字',
  suggestedAspectRatio: '16:9',
  suggestedResolution: '2K',
}

// ❌ 错误：硬编码提示词
{
  prompt: 'A beautiful garden with a girl, in oil painting style',  // 没有灵活性
}

// ❌ 错误：缺少必填字段
{
  id: 999,
  title: '我的模板',  // 缺少 prompt, imageUrl, category
}
```

**`CreativeIdea` 必填字段：**
- `id` (number, 唯一)
- `title` (string)
- `prompt` (string)
- `imageUrl` (string)
- `category` (CreativeCategoryType)

---

## ⚡ 快速检查清单

提交代码前对照：

```
□ 新文件不超过 400 行？
□ 没有往 App.tsx / Desktop.tsx 里加代码？
□ 组件用 PascalCase 命名？
□ Hook 用 use 前缀？
□ 没有 any 类型？
□ 没有 console.log？
□ 支持了暗色模式（dark: 前缀）？
□ 新增的类型字段放在接口末尾？
□ 错误有被处理（try-catch）？
□ API Key 没有硬编码？
□ 节点执行是否走输出节点模式？源节点 idle，输出转圈？
□ 没有用执行锁（executingNodesRef）阻塞用户？
```
