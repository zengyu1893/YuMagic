# Video Provider Routing Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all canvas video generation requests through the provider profile selected on the video node and expose useful HTTP errors from the remote API.

**Architecture:** Keep the existing video batch execution entry point because the canvas shell is a protected oversized file. Resolve the selected provider once before launching output tasks, use that provider's URL, key, and resolved video model for every task, and move response parsing into the video-generation feature so it can be tested independently.

**Tech Stack:** TypeScript, browser Fetch API, Node.js built-in test runner.

---

### Task 1: Add Regression Coverage

**Files:**
- Create: `components/PebblingCanvas/execution/videoBatchProviderUsage.test.mjs`
- Create: `src/features/video-generation/services/videoApiResponse.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write a source-wiring regression test**

Assert that `batchHandlers2.ts` imports and awaits `loadCanvasNodeThirdPartyConfig`, passes `sourceNode.data` with kind `video`, and no longer assigns the execution config directly from `getThirdPartyConfig()`.

- [ ] **Step 2: Write response parser behavior tests**

Import `readVideoApiJson` and assert that a successful JSON response is returned and a `503` response throws an error containing both `HTTP 503` and the remote message.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
node --experimental-strip-types --test components/PebblingCanvas/execution/videoBatchProviderUsage.test.mjs src/features/video-generation/services/videoApiResponse.test.mjs
```

Expected: FAIL because the batch handler still uses global configuration and the response parser does not exist.

### Task 2: Route Through the Selected Provider

**Files:**
- Modify: `components/PebblingCanvas/execution/batchHandlers2.ts`

- [ ] **Step 1: Resolve provider configuration once**

Call:

```typescript
const config = await loadCanvasNodeThirdPartyConfig(
  sourceNode.data,
  'video',
  getThirdPartyConfig(),
);
```

Reject missing configuration or video model before launching remote tasks. Normalize the provider base URL by removing trailing slashes and an optional terminal `/v1`.

- [ ] **Step 2: Use the resolved model and credentials**

Build every create and poll request from `config.baseUrl`, `config.apiKey`, and `sourceNode.data?.videoModel || config.videoModel`.

### Task 3: Preserve Remote HTTP Errors

**Files:**
- Create: `src/features/video-generation/services/videoApiResponse.ts`
- Modify: `components/PebblingCanvas/execution/batchHandlers2.ts`

- [ ] **Step 1: Implement the JSON response parser**

Parse JSON when possible. For a non-2xx response, throw an error containing the action, HTTP status, and `error`, `message`, or `detail` supplied by the remote server.

- [ ] **Step 2: Apply it to create and polling calls**

Replace direct `response.json()` calls for video create and poll requests with `readVideoApiJson`.

- [ ] **Step 3: Run focused tests and verify GREEN**

Run the Task 1 command and expect all tests to pass.

### Task 4: Project Verification

**Files:**
- Modify: `docs/file-index.md`
- Modify: `.claude/rules/ecc/penguin/file-map.md`

- [ ] **Step 1: Register new files in both indexes**

Add the plan, response parser, and regression test files.

- [ ] **Step 2: Run the full test suite**

Run `npm test` and expect all tests to pass.

- [ ] **Step 3: Build the frontend**

Run `npm run build` and expect Vite to complete without TypeScript or bundling errors.
