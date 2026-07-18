/**
 * 协议注册表 — 根据 API 文档 + 灵感魔盒 openai_image.py 精确匹配
 *
 * 三种请求格式:
 * - "openai-image":  size + n + quality + response_format=b64_json
 * - "openai-chat":   messages[{role,content}]  (gemini/grok 图像走 chat 兼容)
 * - "gemini-native": /v1beta/models/{model}:generateContent
 */

// ========== OpenAI Image 标准格式 (gpt-image / dall-e / flux 等) ==========
const OPENAI_IMAGE_MODELS = /^gpt-image|^dall-e|^flux|^seedream|^doubao-seedream|^qwen-image|^z-image|^wan2?\.?7?-?image|^sdxl|^stable-diffusion/;

// ========== Gemini 原生格式 (/v1beta/models/{model}:generateContent) ==========
const GEMINI_NATIVE_MODELS = /^gemini.*image|^gemini.*flash.*image/;

// ========== Chat 兼容格式 (grok 图像等) ==========
const CHAT_IMAGE_MODELS = /^grok.*image/;

// ========== 比例 × 分辨率 → 像素尺寸 (来自 灵感魔盒 api/openai_image.py) ==========
export const ASPECT_SIZE_MAP: Record<string, Record<string, string>> = {
  "1:1":  { "1K": "1024x1024",  "2K": "2048x2048",  "4K": "2880x2880" },
  "4:3":  { "1K": "1024x768",   "2K": "2048x1536",  "4K": "3264x2448" },
  "3:4":  { "1K": "768x1024",   "2K": "1536x2048",  "4K": "2448x3264" },
  "3:2":  { "1K": "1536x1024",  "2K": "3072x2048",  "4K": "3504x2336" },
  "2:3":  { "1K": "1024x1536",  "2K": "2048x3072",  "4K": "2336x3504" },
  "16:9": { "1K": "1792x1024",  "2K": "3584x2048",  "4K": "3840x2160" },
  "9:16": { "1K": "1024x1792",  "2K": "2048x3584",  "4K": "2160x3840" },
  "3:5":  { "1K": "768x1280",   "2K": "1536x2560",  "4K": "2304x3840" },
  "5:3":  { "1K": "1280x768",   "2K": "2560x1536",  "4K": "3840x2304" },
  "4:5":  { "1K": "1024x1280",  "2K": "2048x2560",  "4K": "3072x3840" },
  "5:4":  { "1K": "1280x1024",  "2K": "2560x2048",  "4K": "3840x3072" },
  "21:9": { "1K": "1792x768",   "2K": "3584x1536",  "4K": "3840x1646" },
};

/** 根据比例和分辨率获取像素尺寸 */
export function getOpenAIImageSize(aspectRatio: string, resolution: string): string {
  if (ASPECT_SIZE_MAP[aspectRatio]) {
    return ASPECT_SIZE_MAP[aspectRatio][resolution] || ASPECT_SIZE_MAP[aspectRatio]["2K"] || "2048x2048";
  }
  // fallback: 正方形
  const fallback: Record<string, string> = { "1K": "1024x1024", "2K": "2048x2048", "4K": "2880x2880" };
  return fallback[resolution] || "2048x2048";
}

// ========== 协议类型 ==========
export type ImageProtocolFormat = 'openai-image' | 'openai-chat' | 'gemini-native';

export interface ImageProtocol {
  format: ImageProtocolFormat;
  endpoint: string;       // API 路径
}

/** 根据模型名返回协议信息 */
export function getImageProtocol(modelId: string): ImageProtocol | null {
  const m = modelId.toLowerCase();

  // OpenAI Image 标准格式
  if (OPENAI_IMAGE_MODELS.test(m)) {
    return { format: 'openai-image', endpoint: '/v1/images/generations' };
  }

  // Gemini 原生格式 (支持 imageConfig: aspectRatio + imageSize)
  if (GEMINI_NATIVE_MODELS.test(m)) {
    return { format: 'gemini-native', endpoint: '/v1beta/models/{model}:generateContent' };
  }

  // Chat 兼容格式 (grok 等)
  if (CHAT_IMAGE_MODELS.test(m)) {
    return { format: 'openai-chat', endpoint: '/v1/chat/completions' };
  }

  // 不支持的模型
  if (/^imagen/.test(m)) return null;  // 需要 Gemini Imagen 原生端点
  if (/^midjourney/.test(m)) return null;
  if (/^ideogram/.test(m)) return null;
  if (/^kling/.test(m)) return null;

  // 默认尝试 OpenAI Image 格式
  return { format: 'openai-image', endpoint: '/v1/images/generations' };
}

export function supportsImageGeneration(modelId: string): boolean {
  return getImageProtocol(modelId) !== null;
}

// ================================================================
// 视频模型协议注册表
// ================================================================

/** 视频协议格式 */
export type VideoProtocolFormat = 'video-unified' | 'video-veo' | 'video-luma';

export interface VideoProtocol {
  format: VideoProtocolFormat;
  createPath: string;     // 创建任务端点
  queryPath: string;      // 查询任务端点（含 {id} 占位符）
  taskIdField: string;    // 响应中 task_id 的字段名
  videoUrlField: string;  // 轮询响应中 video_url 的字段路径
}

// ========== 统一格式 (/v1/video/create) — sora, grok, kling, seedance, runway, wan 等 ==========
const UNIFIED_VIDEO_MODELS = /^sora|^grok|^kling|^seedance|^runway|^wan|^happyhorse|^vidu|^jimeng|^minimax|^doubao|^hunyuan/i;

// ========== Veo 格式 (/v1/video/generations) — veo 系列 ==========
const VEO_VIDEO_MODELS = /^veo/i;

// ========== Luma 格式 (/luma/generations) — luma 系列 ==========
const LUMA_VIDEO_MODELS = /^luma/i;

/** 根据模型名返回视频协议 */
export function getVideoProtocol(modelId: string): VideoProtocol | null {
  const m = modelId.toLowerCase();

  if (VEO_VIDEO_MODELS.test(m)) {
    return {
      format: 'video-veo',
      createPath: '/v1/video/generations',
      queryPath: '/v1/videos/{id}',
      taskIdField: 'task_id',
      videoUrlField: 'data.output',
    };
  }

  if (LUMA_VIDEO_MODELS.test(m)) {
    return {
      format: 'video-luma',
      createPath: '/luma/generations',
      queryPath: '/luma/generations/{task_id}',
      taskIdField: 'id',
      videoUrlField: 'assets.video',
    };
  }

  // 默认：统一格式（sora, grok, kling 等都用这个）
  if (UNIFIED_VIDEO_MODELS.test(m)) {
    return {
      format: 'video-unified',
      createPath: '/v1/video/create',
      queryPath: '/v1/video/query?id={id}',
      taskIdField: 'id',
      videoUrlField: 'video_url',
    };
  }

  // 未知模型：默认尝试统一格式
  return {
    format: 'video-unified',
    createPath: '/v1/video/create',
    queryPath: '/v1/video/query?id={id}',
    taskIdField: 'id',
    videoUrlField: 'video_url',
  };
}

export function supportsVideoGeneration(modelId: string): boolean {
  return getVideoProtocol(modelId) !== null;
}
