# 企鹅工坊 — 安全规则

> **小白先读这个！** 这些规则防止你把项目改坏。即使不懂代码，遵守这些规则也能安全地做二创。
> 参考上层规则：全局规则 `~/.claude/rules/ecc/common/security.md` `~/.claude/rules/ecc/web/security.md`

---

## 🛡️ 保命五条（零基础也能遵守）

### 1️⃣ 改之前，先确认能跑

```
双击 Start.bat → 浏览器打开 http://127.0.0.1:8765 → 能打开 = 正常
```

**每次改代码前后都做一次。** 如果打不开了，说明你改坏了，马上回滚。

### 2️⃣ 一次只改一个文件

```
✅ 改 geminiService.ts → 测试 → 正常 → 再改下一个
❌ 同时改 geminiService.ts + Desktop.tsx + App.tsx → 坏了不知道是谁导致的
```

### 3️⃣ 改之前，记下改了什么

最简单的做法：**复制原文件，加 .bak 后缀**

```
copy services\geminiService.ts services\geminiService.ts.bak
```

改坏了就用 `.bak` 文件恢复。

### 4️⃣ 不要碰这些目录

| 目录 | 原因 |
|------|------|
| `node_modules/` | npm 自动管理，手动改会被覆盖 |
| `backend-nodejs/node_modules/` | 同上 |
| `dist/` | 构建产物，自动生成 |
| `electron/` | 桌面打包，配置复杂 |
| `release/` | 发布产物 |
| `.git/` | Git 仓库数据 |

### 5️⃣ 改了 API Key 相关代码要格外小心

- **永远不要**把 API Key 写在代码里
- **永远不要**提交含 API Key 的代码到 GitHub
- API Key 只能在应用设置界面输入，存在 `data/settings.json`

---

## ⛔ 绝对禁止的操作

### 禁止 1：在超大文件里加代码

| 禁止操作 | 风险 |
|---------|------|
| 在 `App.tsx` (165KB) 里加新功能逻辑 | 文件更大、更难调试、更容易冲突 |
| 在 `Desktop.tsx` (140KB) 里加交互逻辑 | 同上 |
| 在 `storyLibrary.ts` (90KB) 中间插入数据 | 可能破坏 JSON 结构 |

**正确做法：**
- 新功能 → 新建 `components/YourFeature/YourFeature.tsx`
- 新逻辑 → 新建 `hooks/useYourFeature.ts`
- 新模板 → 追加到 `storyLibrary.ts` **末尾**

### 禁止 2：修改核心类型定义

| 文件 | 能改什么 | 不能改什么 |
|------|---------|-----------|
| `types.ts` | **追加**新字段、新类型 | **删除/重命名**已有字段 |
| `package.json` | `description`、`author` | `dependencies` 版本（除非你了解后果）|

**规则：** 类型只增不改。已有字段可能被几十个文件引用，改名会导致整个项目崩溃。

### 禁止 3：删除看起来"没用"的文件

以下文件看起来没用，但其实有用：
- `services/authToken` (0字节) — 占位文件

以下文件已确认未被任何代码引用，**可以安全删除**：
- ~~`CollapsibleSection.tsx` (0字节)~~ — 已确认无引用，可删除
- ~~`CreativeIdeasPanel.tsx` (0字节)~~ — 已确认无引用，可删除
- ~~`PromptPresetManager.tsx` (0字节)~~ — 已确认无引用，可删除

**规则：** 不确定的文件别删，先用 `grep` 搜索引用再决定。

### 禁止 4：在生产代码里 `console.log`

原项目已有大量 `console.log`（这是技术债）。你**新增**代码时不要用。

```typescript
// ❌ 禁止
console.log('调试信息', data);
console.warn('警告');
console.error('错误');

// ✅ 正确：用后端已有的日志方式
// 后端: console.log 可以接受（后端日志是需要的）
// 前端: 用专门的日志工具，或者直接不记日志
```

---

## 🔒 安全红线

### API Key 保护

```typescript
// ❌ 严重违规 — 硬编码 Key
const GEMINI_KEY = 'sk-xxxxx';
const API_KEY = 'abc123';

// ✅ 正确 — 从设置中获取
// Key 通过 ApiKeyManager 组件输入，存在 data/settings.json
// 代码中通过 ApiKeyManager 或 settings API 获取
```

**如果 Key 泄露了怎么办？**
1. 立刻去 Google AI Studio 删除这个 Key
2. 新建一个 Key
3. 在应用设置中更新

### 用户数据保护

- `data/` 下的 JSON 文件包含用户数据，**不要提交到 Git**
- `.gitignore` 已经排除了这些文件，不要修改 `.gitignore` 把它们包含进去
- 发布二创版本时，确保 `data/`、`output/`、`input/` 目录是空的

### 前端安全

- 所有用户输入的提示词要做长度限制（后端已有 50MB 请求体限制）
- 显示用户生成的图片时，确保 URL 是本地路径，不要直接嵌入外部 URL
- `dangerouslySetInnerHTML` 零容忍 — 原项目没有用这个，你也不能用

---

## 🧪 修改后验证清单

每次改完代码，按顺序检查：

```
□ 1. 能启动吗？
     双击 Start.bat，浏览器打开 http://127.0.0.1:8765

□ 2. 后端服务正常吗？
     看浏览器里红房子/黄房子指示器是否绿色

□ 3. 你的改动生效了吗？
     手动操作一遍你改的功能

□ 4. 旧功能没坏吧？
     随便试试其他功能（生成图片、打开创意库、拖拽等）

□ 5. 控制台没有红色报错吧？
     按 F12 → Console 标签页，看看有没有红色错误

□ 6. 文件没有悄悄变大吧？
     如果你改了 App.tsx 或 Desktop.tsx，确认没有多出大段代码
```

---

## 🆘 改坏了怎么办

### 情况 1：应用打不开了

```bash
# 1. 查看错误
# 启动 Start.bat 的终端窗口，看最后几行报什么错
# 浏览器按 F12 → Console，看红色报错

# 2. 恢复备份
copy services\geminiService.ts.bak services\geminiService.ts

# 3. 重新构建
npm run build

# 4. 重启
Start.bat
```

### 情况 2：某个功能不工作了

```
1. 确认你改了哪些文件（回想一下）
2. 用 .bak 文件逐个恢复
3. 每次恢复一个后测试，确定是哪个文件的问题
4. 只回滚出问题的那个文件
```

### 情况 3：完全乱了

```bash
# 如果你用了 Git
git diff          # 看所有改动
git checkout .    # 回滚所有改动（小心！不可逆）

# 如果没用 Git
# 把整个项目文件夹复制一份作为备份，然后重新解压原始版本
```

---

## 📋 提交代码前检查（如果你要发布二创）

```
□ 没有硬编码的 API Key
□ data/ 目录没有用户数据
□ output/ input/ creative_images/ 没有残留图片
□ .env 文件没有包含真实 Key
□ package.json 里的版本号/名字已修改以区别于原版
□ 署名/鸣谢信息已更新
□ 已知 Bug 在 CHANGELOG.md 中注明
```
