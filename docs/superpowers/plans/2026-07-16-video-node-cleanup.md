# Video Node Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove obsolete video API code, consolidate single and batch video execution, and make every failure terminate the output node correctly.

**Architecture:** `src/features/video-generation/services/videoTaskRunner.ts` owns provider create/poll behavior and `videoDownload.ts` owns backend download validation. Canvas execution files retain node orchestration only, while legacy service files retain configuration compatibility only.

**Tech Stack:** TypeScript, browser Fetch API, React, Node.js built-in test runner, Vite.

---

**Execution constraint:** Do not create commits because the shared worktree contains unrelated user changes, including overlapping index files.

### Task 1: Shared Provider Task Runner

**Files:**
- Create: `src/features/video-generation/services/videoTaskRunner.test.mjs`
- Create: `src/features/video-generation/services/videoTaskRunner.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Test `runVideoProviderTask` with injected `fetchImpl` and `waitImpl`. Cover successful create/poll, remote failure, completed response without a URL, and task ID normalization. The desired API is:

```typescript
await runVideoProviderTask({
  baseUrl,
  apiKey,
  protocol,
  payload,
  signal,
  fetchImpl,
  waitImpl,
  onUpdate,
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --experimental-strip-types --test src/features/video-generation/services/videoTaskRunner.test.mjs
```

Expected: failure because `videoTaskRunner.ts` does not exist.

- [ ] **Step 3: Implement the runner**

Create focused helpers that validate task IDs, safely read nested output URL fields, preserve remote error messages through `readVideoApiJson`, and return:

```typescript
interface VideoTaskResult {
  taskId: string;
  videoUrl: string;
}
```

Use `/api/video-proxy/create` and `/api/video-proxy/query`, pass the abort signal to both requests, and throw on failed, malformed, or timed-out tasks.

- [ ] **Step 4: Verify GREEN**

Run the focused test and expect all cases to pass.

### Task 2: Shared Download Validation

**Files:**
- Create: `src/features/video-generation/services/videoDownload.test.mjs`
- Create: `src/features/video-generation/services/videoDownload.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Cover a valid local URL, a non-2xx backend response, and a 2xx malformed response. The desired API is:

```typescript
const localUrl = await downloadGeneratedVideo(remoteUrl, signal, fetchImpl);
```

- [ ] **Step 2: Verify RED**

Run the focused test and expect module-not-found failure.

- [ ] **Step 3: Implement download validation**

POST to `/api/files/download-remote-video`, pass `signal`, preserve backend error text, require `success === true`, and require a non-empty `data.url` string.

- [ ] **Step 4: Verify GREEN**

Run the focused test and expect all cases to pass.

### Task 3: Rewire Single and Batch Execution

**Files:**
- Modify: `components/PebblingCanvas/execution/videoBatchProviderUsage.test.mjs`
- Modify: `components/PebblingCanvas/execution/executeVideoNode.ts`
- Modify: `components/PebblingCanvas/execution/batchHandlers2.ts`

- [ ] **Step 1: Extend source-wiring tests**

Require both executors to import `runVideoProviderTask` and `downloadGeneratedVideo`. Require batch execution to use `Promise.all`, and forbid direct `/api/video-proxy` calls in both executor files.

- [ ] **Step 2: Verify RED**

Run the source-wiring test and expect failures on duplicated request logic.

- [ ] **Step 3: Rewire the single executor**

Keep provider/model resolution and output-node updates in `executeVideoNode.ts`. Make `downloadAndSaveVideo` return the local URL and allow failures to reach the outer catch. Resolve pending output only after local download succeeds.

- [ ] **Step 4: Rewire the batch executor**

Replace `forEach(async ...)` with `await Promise.all(resultNodeIds.map(...))`. Use the shared runner/download services, update final node status in every path, call persistence after completion, and retain abort-controller cleanup.

- [ ] **Step 5: Verify GREEN**

Run the runner, download, and source-wiring tests together and expect all cases to pass.

### Task 4: Delete Obsolete Compatibility Code and UI Noise

**Files:**
- Modify: `services/soraService.ts`
- Modify: `services/veoService.ts`
- Modify: `components/PebblingCanvas/nodes/VideoNode.tsx`
- Modify: `components/PebblingCanvas/nodes/VideoOutputNode.tsx`
- Modify: `components/PebblingCanvas/execution/videoBatchProviderUsage.test.mjs`

- [ ] **Step 1: Add cleanup assertions**

Assert that the renderer does not hardcode `http://localhost:8765`, the source node does not render a running overlay, and legacy services do not export create/poll APIs.

- [ ] **Step 2: Verify RED**

Run the source cleanup test and confirm each assertion detects current code.

- [ ] **Step 3: Remove obsolete code**

Reduce both legacy services to configuration types plus get/save functions. Remove unused renderer prop destructuring, remove the source-node spinner, type the video setting values as `string`, and use the relative `/files/` URL directly.

- [ ] **Step 4: Verify GREEN**

Run focused tests and Vite build.

### Task 5: Indexes and Full Verification

**Files:**
- Modify: `docs/file-index.md`
- Modify: `.claude/rules/ecc/penguin/file-map.md`

- [ ] **Step 1: Register new files**

Add the cleanup design, implementation plan, runner, downloader, and their tests to both indexes.

- [ ] **Step 2: Run full tests**

```powershell
npm.cmd test
```

Expected: zero failed tests.

- [ ] **Step 3: Run production build**

```powershell
npm.cmd run build
```

Expected: Vite exits with code 0.

- [ ] **Step 4: Inspect final diff**

Confirm no unrelated files were changed and no new `console.log`, `any`, hardcoded provider domain, or hardcoded localhost URL remains in the video-node scope.

