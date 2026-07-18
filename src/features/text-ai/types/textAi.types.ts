/**
 * LLM 对话 / 文本 AI 功能类型定义。
 *
 * 当前状态：迁移目标。实际类型仍在项目根 types.ts 中。
 */

// === LLM 模型配置 ===
export interface LLMModelConfig {
  id: string;
  name: string;
  provider: string;
  supportsVision: boolean;
  maxTokens: number;
  defaultTemperature: number;
}

// === 对话消息 ===
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** 多模态素材（图片/视频/音频 URL） */
  mediaUrls?: string[];
}

// === 生成参数 ===
export interface LLMGenerationParams {
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  mediaUrls: string[];
  temperature: number;
  maxTokens: number;
  seed?: number;
  stripThinking: boolean;
}

// === 生成结果 ===
export interface LLMGenerationResult {
  text: string;
  metadata: LLMResultMetadata;
}

export interface LLMResultMetadata {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
}
