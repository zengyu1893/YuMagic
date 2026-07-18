# AI 编码铁律

> ⚠️ 这条规则的优先级高于所有其他规则。
> 本规则不是「建议」，是「命令」。违反本规则的代码必须重写。
> 写代码前必须过前置检查，写完后必须过自检。两者缺一不可。

---

## 🔴 写代码前：强制三问

每次准备写代码，**在动手之前**必须回答下面三个问题。回答不出来就不许写。

```
问题 1: 我要往哪个文件写？
         → 那个文件现在多少行？超过 500 行了吗？

问题 2: 这个文件已经有同类逻辑了吗？
         → 如果有，我应该先抽共享组件/Hook/服务，而不是往里加

问题 3: 我写的这段 UI/逻辑，在项目里其他地方也有吗？
         → 如果有，停下来，先抽共享组件
```

---

## 🚫 硬性红线（碰了就重写）

| 规则 | 说明 |
|------|------|
| **文件 >800 行禁止写入** | 目标文件超过 800 行，绝不允许往里加代码，必须新建文件 |
| **重复 2 次 = 抽共享** | 同一段 JSX 或逻辑出现在 2+ 个地方，必须抽成共享组件/Hook |
| **禁止内联定义组件** | 不可以在一个组件 function 内部定义另一个组件 |
| **新文件 ≤400 行** | 新建的文件不能超过 400 行，200-300 行最合适 |
| **一个文件一个组件** | 一个 .tsx 文件只能有一个组件（共享工具文件除外） |

---

## 🌲 新建文件的决策树

按这个顺序判断，走到叶子节点就执行：

```
你要做什么？
│
├─ 加新功能模块
│   └─ 新建 components/新功能名/新功能名.tsx
│      如果有子组件 → components/新功能名/子组件名.tsx
│      如果有业务逻辑 → hooks/use新功能名.ts
│      如果有 API 调用 → services/新功能名Service.ts
│
├─ 加新 UI 控件（按钮、选择器等通用组件）
│   └─ 新建 components/shared/组件名.tsx
│      或者 components/PebblingCanvas/shared/组件名.tsx（画布专用）
│
├─ 加新业务逻辑
│   └─ 新建 hooks/use逻辑名.ts
│
├─ 加新 API 调用
│   └─ 新建 services/api/功能名.ts
│      或者在已有的 services/xxxService.ts 里加（仅当该文件 ≤400 行）
│
├─ 修 Bug / 改已有逻辑
│   └─ 直接改对应文件（仅当该文件 ≤800 行，否则先拆分再改）
│
└─ 加类型定义
    └─ 追加到 types.ts 末尾（只增不改）
```

---

## 🗺️ 目标文件 >500 行时的处理策略

| 目标文件 | 当前行数 | 处理策略 |
|----------|:------:|----------|
| `App.tsx` | 4111 | 🔴 **绝对禁止写入**，新功能独立文件 |
| `PebblingCanvas/index.tsx` | 5217 | 🔴 **绝对禁止写入**，新逻辑抽 Hook |
| `PebblingCanvas/CanvasNode.tsx` | 4366 | 🔴 **绝对禁止写入**，新节点类型独立文件 |
| `Desktop.tsx` | 3275 | 🔴 **绝对禁止写入**，新交互抽 Hook |
| `storyLibrary.ts` | 1216 | 🟡 只追加末尾，不改已有数据结构 |
| `SettingsModal.tsx` | 965 | 🟡 新设置项独立组件，在 SettingsModal 中引用 |
| `CreativeLibrary.tsx` | 1127 | 🟡 新功能独立子组件 |

---

## 🔁 共享组件优先原则

**在你写任何 UI 之前，先用 grep 搜索这段 JSX 是否已经存在。**

```bash
# 例：你要写一个模型选择下拉框
grep -r "ModelSelect\|model.*select" components/ --include="*.tsx"
# 找到了 → 用已有的，或者改进已有的
# 没找到 → 写新的，记得放 shared/ 目录
```

### 已知可复用的共享组件位置

| 目录 | 放什么 |
|------|--------|
| `components/shared/` | 全局通用组件 |
| `components/PebblingCanvas/shared/` | 画布节点专用共享组件 |
| `hooks/` | 通用业务逻辑 Hook |
| `services/` | API 调用封装 |

---

## ✅ 写完后：六项自检

提交代码前，逐条对照：

```
□ 1. 新增文件 ≤400 行？（超过就再拆）
□ 2. 没有往 800+ 行的文件加代码？
□ 3. 没有复制粘贴已有 UI？（grep 确认过）
□ 4. 新组件 ≤1 个 export default？
□ 5. 没有在组件内部定义另一个组件？
□ 6. 新功能支持了暗色模式（dark: 前缀）？
```

**如果任何一条不通过 → 不要提交，先修。**

---

## 🧩 画布节点渲染器规则（CRITICAL）

**CanvasNode.tsx 包含 16 种节点类型，每种必须独立文件。**

```
新增节点类型的标准流程：
1. 新建 components/PebblingCanvas/nodes/新节点名Node.tsx
2. 从 CanvasNode.tsx 参考已有节点渲染器，移植 props 接口
3. 在新文件里写渲染逻辑，共享组件从 shared/ 导入
4. CanvasNode.tsx 只加一行 import + 一行 dispatch 调用
5. 绝不新增内联渲染函数

目录结构：
  components/PebblingCanvas/nodes/
    ├── LlmNode.tsx
    ├── BpNode.tsx
    ├── IdeaNode.tsx
    ├── ImageNode.tsx
    ├── VideoNode.tsx
    ├── VideoOutputNode.tsx
    ├── FrameExtractorNode.tsx
    ├── DrawingBoardNode.tsx
    ├── ResizeNode.tsx
    ├── RunningHubNode.tsx
    ├── RhMainNode.tsx
    ├── RhParamNode.tsx
    ├── RhConfigNode.tsx
    ├── EditNode.tsx
    ├── UpscaleNode.tsx
    └── RemoveBgNode.tsx

❌ 禁止：在 CanvasNode.tsx 里写新的 if (node.type === 'xxx') 分支
❌ 禁止：在新节点文件里重新定义 shared/ 已有的组件
✅ 必须：所有节点 import { NodeRendererProps } from './nodes/NodeRendererProps'
```

---

## 🔒 Edit 安全规范（防止改坏已有代码）

```
大文件（>800行）中使用 Edit 必须遵守：

1. 改前 git commit:  git add -A && git commit -m "checkpoint: xxx"
   改坏了可以:      git checkout .

2. old_string 必须够长够唯一：
   ❌ "bg-blue-500"           → 可能匹配几十处
   ✅ 前后各带 3-5 行上下文   → 确保唯一匹配

3. 慎用 replace_all: true：
   只有 100% 确定所有出现都要改时才用
   不确定就逐个替换

4. 改完立刻构建:  npm run build
   出错第一时间定位，不等堆到后面
```

---

## 🎯 这样做的理由

1. **为什么文件不能超过 800 行？** → 人类开发者一次能理解的代码量大约 400-600 行。800 行已经是极限。
2. **为什么新文件 ≤400 行？** → 从源头防止膨胀。一个小文件变 800 行很容易，一个 400 行的文件变 800 行需要刻意为之。
3. **为什么重复 2 次就抽？** → 复制粘贴是技术债的起点。第 1 次复制也许能接受，第 2 次就是故意的重复。
4. **为什么禁内联组件？** → 每次渲染都重新创建组件实例，这是性能 bug 也是结构债。
