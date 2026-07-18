/**
 * 供应商/API 设置类型定义。
 * 从 types.ts 的 ThirdPartyApiConfig 和相关类型逐步迁移到这里。
 *
 * 当前状态：迁移目标。
 */

/** 供应商类型 */
export type ProviderType = 'openai' | 'gemini' | 'runninghub' | 'custom';

/** 模型类型 */
export type ProviderModelType = 'chat' | 'image' | 'video' | 'music' | 'speech';

/** 供应商配置 */
export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  models: ProviderModelConfig[];
  enabled: boolean;
}

/** 单个模型配置 */
export interface ProviderModelConfig {
  id: string;
  name: string;
  type: ProviderModelType;
  /** 是否启用 */
  enabled: boolean;
  /** 模型级 Base URL 覆盖（可选） */
  baseUrlOverride?: string;
  /** 模型级 API Key 覆盖（可选） */
  apiKeyOverride?: string;
}

/** API 设置存储格式 */
export interface ProviderSettings {
  version: number;
  providers: ProviderConfig[];
  updatedAt: string;
}

/** 可添加的 API 供应商模板 */
export type ApiProviderTemplateId = 'yuli' | 'openai-compatible' | 'custom-compatible';

export type ApiProviderModelCategory = 'image' | 'chat' | 'video' | 'audio' | 'embedding' | 'other';

export interface ApiProviderStoredModel {
  id: string;
  owned_by?: string;
  displayName?: string;
}

export interface ApiProviderProfileModelSettings {
  allModels: ApiProviderStoredModel[];
  categories: Record<string, ApiProviderModelCategory>;
  imageModels: string[];
  chatModels: string[];
  videoModels: string[];
  activeImageModel: string;
  activeChatModel: string;
  activeVideoModel: string;
  updatedAt: string;
}

/** 单个 API 配置档案 */
export interface ApiProviderProfile {
  id: string;
  templateId: ApiProviderTemplateId;
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  modelSettings?: ApiProviderProfileModelSettings;
  createdAt: string;
  updatedAt: string;
}

/** 多 API 配置存储格式 */
export interface ApiProviderSettings {
  version: 1;
  activeProfileId: string | null;
  profiles: ApiProviderProfile[];
}

/** 连接测试结果 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelsCount?: number;
}
