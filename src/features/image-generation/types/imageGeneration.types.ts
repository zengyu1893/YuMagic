/**
 * AI 图像生成功能类型定义。
 * 从 types.ts 和 types/pebblingTypes.ts 的相关字段逐步迁移到这里。
 *
 * 当前状态：迁移目标。实际类型仍在项目根 types.ts 中。
 */

// === 模型分组 ===
export type ImageModelGroup = 'gpt2' | 'banana2' | 'banana-pro' | 'grok' | 'mj' | 'rh';

// === 图像模型配置 ===
export interface ImageModelConfig {
  id: string;
  name: string;
  provider: string;
  group: ImageModelGroup;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  maxReferenceImages: number;
  supportsSeed: boolean;
}

// === 生成参数 ===
export interface ImageGenerationParams {
  modelId: string;
  modelGroup: ImageModelGroup;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  seed?: number;
  referenceImages: string[];  // base64 or URLs
  maxPollingSeconds: number;
  pollingInterval: number;
  requestTimeout: number;
}

// === 生成结果 ===
export interface ImageGenerationResult {
  imageUrls: string[];
  metadata: ImageResultMetadata;
}

export interface ImageResultMetadata {
  model: string;
  modelGroup: string;
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  seed?: number;
  fileSize?: string;
  width?: number;
  height?: number;
}
