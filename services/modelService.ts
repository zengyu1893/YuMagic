import type {
  ModelInfo,
  ModelCategory,
  ModelCache,
} from '../types';
import {
  MODEL_CLASSIFICATION_RULES,
} from '../types';

const CACHE_KEY = 'yuli_model_cache';
const CACHE_TTL = 60 * 60 * 1000;

export interface ProviderModelsResponse {
  allModels: ModelInfo[];
  categories: Record<string, ModelCategory>;
  imageModels: string[];
  chatModels: string[];
  videoModels: string[];
  message?: string;
}

const normalizeProviderModelsResponse = (data: Partial<ProviderModelsResponse>): ProviderModelsResponse => {
  const allModels = Array.isArray(data.allModels) ? data.allModels : [];
  return {
    allModels,
    categories: data.categories || {},
    imageModels: Array.isArray(data.imageModels) ? data.imageModels : [],
    chatModels: Array.isArray(data.chatModels) ? data.chatModels : [],
    videoModels: Array.isArray(data.videoModels) ? data.videoModels : [],
    message: data.message,
  };
};

export async function fetchProviderModels(
  baseUrl: string,
  apiKey: string,
  templateId?: string
): Promise<ProviderModelsResponse> {
  const response = await fetch('/api/provider-models/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl, apiKey, templateId }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    if (response.status === 404 && !payload) {
      throw new Error('本地后端模型接口未加载，请重启应用或后端服务后再拉取模型');
    }
    throw new Error(payload?.message || payload?.error || `Failed to fetch models (${response.status})`);
  }

  return normalizeProviderModelsResponse(payload?.data || payload || {});
}

export async function fetchModels(
  baseUrl: string,
  apiKey: string,
  templateId?: string
): Promise<ModelInfo[]> {
  const data = await fetchProviderModels(baseUrl, apiKey, templateId);
  const models = data.allModels;

  const cache: ModelCache = {
    models,
    fetchedAt: Date.now(),
    baseUrl,
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage may be unavailable or full.
  }

  return models;
}

export function getCachedModels(baseUrl?: string): ModelInfo[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cache: ModelCache = JSON.parse(raw);
    if (Date.now() - cache.fetchedAt > CACHE_TTL) return null;
    if (baseUrl && cache.baseUrl !== baseUrl) return null;

    return cache.models;
  } catch {
    return null;
  }
}

export function clearModelCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export function categorizeModel(modelId: string): ModelCategory {
  for (const [pattern, category] of MODEL_CLASSIFICATION_RULES) {
    if (pattern.test(modelId)) return category;
  }
  return 'chat';
}

export function getModelsByCategory(
  models: ModelInfo[],
  category: ModelCategory
): ModelInfo[] {
  return models.filter((m) => categorizeModel(m.id) === category);
}

export function searchModels(
  models: ModelInfo[],
  query: string
): ModelInfo[] {
  const q = query.toLowerCase();
  return models.filter(
    (m) =>
      m.id.toLowerCase().includes(q) ||
      (m.owned_by && m.owned_by.toLowerCase().includes(q))
  );
}

export async function getOrFetchModels(
  baseUrl: string,
  apiKey: string
): Promise<ModelInfo[]> {
  const cached = getCachedModels(baseUrl);
  if (cached && cached.length > 0) return cached;

  return fetchModels(baseUrl, apiKey);
}

export async function getModelsForCategory(
  baseUrl: string,
  apiKey: string,
  category: ModelCategory
): Promise<ModelInfo[]> {
  const all = await getOrFetchModels(baseUrl, apiKey);
  return getModelsByCategory(all, category);
}
