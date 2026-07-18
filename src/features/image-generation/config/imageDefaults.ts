/**
 * AI 图像生成默认参数。
 * 从 services/geminiService.ts 和 constants/ 中逐步迁移到这里。
 *
 * 当前状态：迁移目标。
 */

/** 默认图像生成参数 */
export const DEFAULT_IMAGE_GENERATION_PARAMS = {
  aspectRatio: '1:1',
  resolution: '2K',
  maxPollingSeconds: 1200,
  pollingInterval: 3,
  requestTimeout: 300,
  concurrentCount: 1,
  minConcurrentCount: 1,
  maxConcurrentCount: 20,
} as const;

/** 支持的宽高比列表 */
export const SUPPORTED_ASPECT_RATIOS = [
  '1:1',
  '3:2', '2:3',
  '4:3', '3:4',
  '16:9', '9:16',
  '21:9',
] as const;

/** 支持的分辨率列表 */
export const SUPPORTED_RESOLUTIONS = ['1K', '2K', '4K'] as const;
