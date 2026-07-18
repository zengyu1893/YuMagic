import type { ApiProviderTemplateId } from '../types/providerSettings.types';

export interface ApiProviderTemplate {
  id: ApiProviderTemplateId;
  name: string;
  description: string;
  defaultBaseUrl: string;
  recommendedBaseUrls?: string[];
}

export interface RecommendedApiEndpoint {
  baseUrl: string;
  keyUrl: string;
  label: string;
}

export const YULI_RECOMMENDED_APIS: RecommendedApiEndpoint[] = [
  {
    baseUrl: 'https://yuli.host',
    keyUrl: 'https://yuli.host/register?aff=64350e39653',
    label: 'yuli.host',
  },
  {
    baseUrl: 'https://ai.yuliapi.com',
    keyUrl: 'https://ai.yuliapi.com/register',
    label: 'ai.yuliapi.com',
  },
];

export const YULI_RECOMMENDED_BASE_URLS = YULI_RECOMMENDED_APIS.map(api => api.baseUrl);

export const API_PROVIDER_TEMPLATES: ApiProviderTemplate[] = [
  {
    id: 'yuli',
    name: '玉玉 API',
    description: '推荐使用的玉玉兼容接口，支持图像、文本和视频模型。',
    defaultBaseUrl: YULI_RECOMMENDED_BASE_URLS[0],
    recommendedBaseUrls: YULI_RECOMMENDED_BASE_URLS,
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI 兼容',
    description: '适用于 OpenAI 或兼容 /v1 接口的服务。',
    defaultBaseUrl: 'https://api.openai.com',
    recommendedBaseUrls: YULI_RECOMMENDED_BASE_URLS,
  },
  {
    id: 'custom-compatible',
    name: '自定义兼容接口',
    description: '填写任意兼容 OpenAI 风格的 API 地址。',
    defaultBaseUrl: '',
    recommendedBaseUrls: YULI_RECOMMENDED_BASE_URLS,
  },
];

export const getApiProviderTemplate = (id: ApiProviderTemplateId): ApiProviderTemplate => {
  return API_PROVIDER_TEMPLATES.find(template => template.id === id) || API_PROVIDER_TEMPLATES[0];
};
