# Video Node Cleanup Design

## Goal

Remove obsolete and duplicated video-generation code without changing the video node UI, provider selection, saved configuration shape, or supported provider protocols. Fix failure paths that can incorrectly complete an output node or leave it running forever.

## Considered Approaches

1. **Conservative cleanup (selected):** keep compatibility configuration APIs, delete zero-call request implementations, extract one feature-owned video task runner, and reuse it from single and batch node execution.
2. **Dead-code-only cleanup:** delete only unreferenced exports from `soraService.ts` and `veoService.ts`. This is lower risk but leaves duplicated execution and known failure-state bugs.
3. **Full video feature migration:** move the node UI, settings, protocols, execution, and persistence into `src/features/video-generation/`. This has a larger review surface and is outside the requested cleanup scope.

## Boundaries

- Keep `SoraConfig`, `VeoConfig`, `getSoraConfig`, `saveSoraConfig`, `getVeoConfig`, and `saveVeoConfig` because settings components still reference them.
- Remove the unreferenced frontend API create, query, polling, model-selection, and response types from `services/soraService.ts` and `services/veoService.ts`.
- Do not modify the oversized canvas shell files for new logic.
- Keep provider/model resolution in the node execution entry points and provider-settings feature.
- Keep remote provider requests behind `/api/video-proxy`.

## Architecture

Add a feature-owned service under `src/features/video-generation/services/` that performs one provider video task:

1. Normalize input images.
2. Create the remote task through the local proxy.
3. Poll until completion, failure, timeout, or abort.
4. Return the remote video URL and task status updates.

Add a feature-owned download helper that validates the backend response and returns the local video URL. The existing single and batch canvas executors remain responsible only for output-node creation, state updates, persistence callbacks, and abort-controller registration.

## Error Handling

- A failed create, poll, or download request throws and marks the output node `error`.
- Download failure never resolves an output as successful.
- A malformed successful response is treated as an error instead of leaving the node running.
- Abort signals are passed through create, poll, image loading, and download requests.
- Batch execution awaits all per-output tasks so its lifecycle matches other batch handlers.

## UI Cleanup

- Remove unused destructured renderer props.
- Replace `any` in the video settings update handler with the node data value type accepted by the fields.
- Use the current origin or relative `/files/` URL instead of hardcoding `http://localhost:8765`.
- Keep the source node idle; only video output nodes show running state.

## Tests

- Add unit tests for task creation, polling success/failure, invalid output, and download failure.
- Extend source-wiring regression tests to require both single and batch executors to use the shared feature service.
- Keep the existing provider routing and HTTP error tests.
- Run the full Node test suite and Vite production build.

