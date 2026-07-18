# GitHub 公开发布实施计划

> **面向执行代理：** 必须按步骤执行；每个复选框完成后再进入下一步。此任务采用当前会话内联执行，不修改或撤销工作区中已有的其他用户修改。

**目标：** 清理当前 Penguin Magic 工作区中的敏感信息和本地数据，生成无旧历史的干净公开快照，创建 `zengyu1893/Penguin-Magic` 并推送到 GitHub。

**架构：** 先修改发布规则和公开说明，再使用 Git 备用索引从当前工作区生成单个根提交。当前开发分支、已有提交和未提交修改保持原样；只把干净快照推送为远程 `main`。

**技术栈：** Git、PowerShell、Vite、Node.js 测试运行器、Chrome GitHub 会话。

---

### 任务 1：发布前状态保护

**文件：** 无文件修改。

- [ ] **步骤 1：记录当前分支和工作区状态**

运行：

```powershell
git status --short --branch
git log -1 --oneline --decorate
git remote -v
```

预期：当前分支为 `codex-provider-api-profiles`；存在大量既有修改；没有需要覆盖的远程地址。

- [ ] **步骤 2：确认 Git 用户信息不进入公开提交**

运行：

```powershell
git config --get user.name
git config --get user.email
git config --get credential.helper
```

执行公开提交时强制使用 `Penguin Magic` 和 `noreply@penguin-magic.local`，不使用本机个人邮箱。

### 任务 2：清理发布源文件和忽略规则

**文件：**
- 修改：`.gitignore`
- 修改：`components/PebblingCanvas/ApiSettings.tsx`
- 修改：`README.md`
- 创建：`SECURITY.md`
- 创建：`backend-nodejs/data/.gitkeep`

- [ ] **步骤 1：移除 API Key 格式占位符**

在 `components/PebblingCanvas/ApiSettings.tsx` 中，将两个真实密钥格式的 placeholder 替换为不带真实供应商前缀的中性文本，例如 `在此输入 API Key`；不得保留 `AIza`、`sk-` 或其他可被误认为凭据的字符串。

- [ ] **步骤 2：扩展 `.gitignore`**

在现有用户数据和环境变量规则后追加：

```gitignore
# Local runtime data and credentials
backend-nodejs/data/*.json
backend-nodejs/data/*
!backend-nodejs/data/.gitkeep
temp_uploads/*
!temp_uploads/.gitkeep
生图记录/*
!生图记录/.gitkeep
.backend.pid
services/authToken
.claude/worktrees/
.claude/settings.local.json
.agents/
.qoder/
release-uploader/config.json
```

如果对应目录没有 `.gitkeep`，仅创建项目内的 `.gitkeep`，不把目录移出项目。

- [ ] **步骤 3：写入中文安全说明**

在 `README.md` 增加“API 接口与安全”小节，明确以下内容：

```markdown
### API 接口与安全

推荐的两个 API 基础地址：

- `https://yuli.host`，Key 注册：`https://yuli.host/register?aff=64350e39653`
- `https://ai.yuliapi.com`，Key 注册：`https://ai.yuliapi.com/register`

API Key 只保存在本机设置或环境变量中，不要提交 `.env`、设置 JSON、日志、上传文件或任何真实凭据。
```

创建 `SECURITY.md`，说明不要公开提交密钥、发现泄露时先撤销密钥并通过私密渠道反馈；不要在文档中写入真实邮箱、Token 或内部地址。

### 任务 3：同步项目索引

**文件：**
- 修改：`docs/file-index.md`
- 修改：`.claude/rules/ecc/penguin/file-map.md`

- [ ] **步骤 1：登记新增文件**

在两个文件的新增文件表中登记：

```text
SECURITY.md — 公开仓库安全和凭据处理说明
docs/superpowers/specs/2026-07-18-github-public-release-design.md — GitHub 公开发布清理与安全设计
docs/superpowers/plans/2026-07-18-github-public-release.md — GitHub 公开发布实施计划
```

- [ ] **步骤 2：检查索引变更范围**

运行 `git diff --check -- docs/file-index.md .claude/rules/ecc/penguin/file-map.md`，预期无空白错误；不撤销文件中原有的用户修改。

### 任务 4：运行构建和测试

**文件：** 无新增测试文件；验证当前工作区。

- [ ] **步骤 1：运行完整测试**

运行 `npm test`，预期所有列出的 Node 测试通过；若失败，记录失败测试并先修复与本次清理直接相关的错误。

- [ ] **步骤 2：运行生产构建**

运行 `npm run build`，预期 Vite 输出 `dist/` 且命令退出码为 0。

### 任务 5：生成并扫描干净公开快照

**文件：** Git 元数据中的临时备用索引和 `refs/heads/github-public`；不切换当前工作分支。

- [ ] **步骤 1：创建空备用索引并加入当前工作树**

在 PowerShell 中执行：

```powershell
$env:GIT_INDEX_FILE = "$PWD\.git\github-public-index"
Remove-Item -Force -ErrorAction SilentlyContinue $env:GIT_INDEX_FILE, "$env:GIT_INDEX_FILE.lock"
git read-tree --empty
git add -A
```

`.gitignore` 生效后，`git add -A` 不得把 `temp_uploads/`、`生图记录/`、后端 JSON、`.backend.pid`、`services/authToken`、`.claude/worktrees/`、`.claude/settings.local.json`、`.agents/` 或 `.qoder/` 加入备用索引。

- [ ] **步骤 2：创建非个人身份的单根提交**

执行：

```powershell
$env:GIT_AUTHOR_NAME = 'Penguin Magic'
$env:GIT_AUTHOR_EMAIL = 'noreply@penguin-magic.local'
$env:GIT_COMMITTER_NAME = 'Penguin Magic'
$env:GIT_COMMITTER_EMAIL = 'noreply@penguin-magic.local'
$tree = git write-tree
$commit = git commit-tree $tree -m 'chore: publish sanitized public snapshot'
git update-ref refs/heads/github-public $commit
Remove-Item -Force $env:GIT_INDEX_FILE
Remove-Item Env:GIT_INDEX_FILE,Env:GIT_AUTHOR_NAME,Env:GIT_AUTHOR_EMAIL,Env:GIT_COMMITTER_NAME,Env:GIT_COMMITTER_EMAIL
```

预期：`git rev-list --count refs/heads/github-public` 输出 `1`。

- [ ] **步骤 3：扫描候选树**

运行以下检查，任何命中都必须在推送前处理：

```powershell
git ls-tree -r --name-only refs/heads/github-public | Where-Object { ($_ -match '(^|/)(temp_uploads|生图记录|backend-nodejs/data/.*\.json|\.backend\.pid|services/authToken)(/|$)') -and ($_ -notmatch '(^|/)\.gitkeep$') }
git grep -n -I -E 'AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{16,}|github_pat_[0-9A-Za-z_]{20,}|gh[pousr]_[0-9A-Za-z]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' refs/heads/github-public
```

预期：两条命令都无输出并以无匹配状态结束；`git show refs/heads/github-public:README.md` 能看到两个中文 API 地址。

### 任务 6：创建 GitHub 公开仓库

**文件：** GitHub 远程仓库外部状态。

- [ ] **步骤 1：使用已登录的 Chrome GitHub 会话打开 `https://github.com/new`**

填写仓库名 `Penguin-Magic`，保持 Owner 为 `zengyu1893`、Visibility 为 Public，描述填写 `Penguin Magic AI 创作工作台`，保持 Add README、Add .gitignore、Add license 均关闭。

- [ ] **步骤 2：提交创建表单并验证结果**

点击 “Create repository”，确认页面进入 `https://github.com/zengyu1893/Penguin-Magic` 且显示空仓库的推送提示。若 GitHub 出现 CAPTCHA，停止并请求用户处理，不尝试绕过。

### 任务 7：推送干净 `main`

**文件：** `.git/config` 中的 `origin`；GitHub 远程 `main`。

- [ ] **步骤 1：配置仓库远程地址**

运行：

```powershell
git remote add origin https://github.com/zengyu1893/Penguin-Magic.git
```

若 `origin` 已存在，先用 `git remote set-url origin https://github.com/zengyu1893/Penguin-Magic.git`，不新增第二个同名远程。

- [ ] **步骤 2：只推送干净引用**

运行：

```powershell
git push origin refs/heads/github-public:refs/heads/main
```

预期远程 `main` 创建成功；不得执行 `git push --all` 或推送当前含旧历史的分支。

### 任务 8：发布后验证和交付

**文件：** 无源文件修改；验证远程状态。

- [ ] **步骤 1：验证远程提交和树内容**

运行：

```powershell
git ls-remote --heads origin main
git ls-tree -r --name-only origin/main | Where-Object { ($_ -match '(^|/)(temp_uploads|生图记录|backend-nodejs/data/.*\.json|\.backend\.pid|services/authToken)(/|$)') -and ($_ -notmatch '(^|/)\.gitkeep$') }
git grep -n -I -E 'AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{16,}|github_pat_[0-9A-Za-z_]{20,}|gh[pousr]_[0-9A-Za-z]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' origin/main
```

预期：远程 `main` 有一个提交，敏感路径和凭据模式均无匹配。

- [ ] **步骤 2：在 GitHub 页面确认公开状态**

确认仓库可公开访问、默认分支为 `main`、README 显示两个 API 地址，之后保留本地 `github-public` 引用作为可重复验证的快照。

### 任务 9：最终工作区检查

- [ ] **步骤 1：确认当前开发分支未被切换或重置**

运行 `git branch --show-current` 和 `git status --short --branch`；预期仍在 `codex-provider-api-profiles`，既有用户修改没有被删除。

- [ ] **步骤 2：清理备用索引残留**

运行 `Test-Path .git\\github-public-index`，预期输出 `False`；保留 `refs/heads/github-public` 和 `origin`，便于后续复核。

