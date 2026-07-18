import type { ThirdPartyApiConfig } from '../../../../types';
import { getApiProviderTemplate } from '../config/apiProviderTemplates.ts';
import type {
  ApiProviderModelCategory,
  ApiProviderProfile,
  ApiProviderProfileModelSettings,
  ApiProviderSettings,
  ApiProviderStoredModel,
  ApiProviderTemplateId,
} from '../types/providerSettings.types';

export const EMPTY_API_PROVIDER_SETTINGS: ApiProviderSettings = {
  version: 1,
  activeProfileId: null,
  profiles: [],
};

export const RUNTIME_IMAGE_API_PROVIDER_STORAGE_KEY = 'selected_image_api_provider_id';
export const API_PROVIDER_SETTINGS_CHANGED_EVENT = 'api-provider-settings-changed';

export interface ApiProviderModelSelection {
  activeImageModel: string;
  activeChatModel: string;
  activeVideoModel?: string;
}

export type AppSettingsRecord = Record<string, unknown>;

const fetchAppSettings = async (): Promise<AppSettingsRecord> => {
  const response = await fetch('/api/settings');
  if (!response.ok) {
    throw new Error(`读取设置失败 (${response.status})`);
  }
  const payload = await response.json();
  return (payload?.data || {}) as AppSettingsRecord;
};

const postAppSettings = async (settings: AppSettingsRecord): Promise<void> => {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error(`保存设置失败 (${response.status})`);
  }
};

export const createApiProviderProfile = (
  templateId: ApiProviderTemplateId,
  overrides: Partial<ApiProviderProfile> = {},
): ApiProviderProfile => {
  const template = getApiProviderTemplate(templateId);
  const now = new Date().toISOString();
  const id = overrides.id || `api-${templateId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    templateId,
    name: overrides.name ?? template.name,
    baseUrl: overrides.baseUrl ?? template.defaultBaseUrl,
    apiKey: overrides.apiKey ?? '',
    enabled: overrides.enabled ?? true,
    modelSettings: overrides.modelSettings,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
};

export const normalizeApiProviderSettings = (settings?: Partial<ApiProviderSettings> | null): ApiProviderSettings => {
  if (!settings || !Array.isArray(settings.profiles)) {
    return { ...EMPTY_API_PROVIDER_SETTINGS, profiles: [] };
  }

  const profiles = settings.profiles.filter(Boolean).map(profile => ({
    ...profile,
    enabled: profile.enabled !== false,
  })) as ApiProviderProfile[];

  const requestedActiveId = settings.activeProfileId ?? null;
  const activeProfileId = requestedActiveId && profiles.some(profile => profile.id === requestedActiveId)
    ? requestedActiveId
    : null;

  return {
    version: 1,
    activeProfileId,
    profiles,
  };
};

export const getActiveApiProviderProfile = (settings: ApiProviderSettings): ApiProviderProfile | null => {
  return settings.profiles.find(profile => profile.id === settings.activeProfileId) || null;
};

export const upsertApiProviderProfile = (
  settings: ApiProviderSettings,
  profile: ApiProviderProfile,
  makeActive = true,
): ApiProviderSettings => {
  const exists = settings.profiles.some(item => item.id === profile.id);
  const profiles = exists
    ? settings.profiles.map(item => item.id === profile.id ? profile : item)
    : [...settings.profiles, profile];

  return normalizeApiProviderSettings({
    version: 1,
    activeProfileId: makeActive ? profile.id : settings.activeProfileId,
    profiles,
  });
};

export const removeApiProviderProfile = (
  settings: ApiProviderSettings,
  profileId: string,
): ApiProviderSettings => {
  const profiles = settings.profiles.filter(profile => profile.id !== profileId);
  const activeProfileId = settings.activeProfileId === profileId
    ? null
    : settings.activeProfileId;

  return normalizeApiProviderSettings({
    version: 1,
    activeProfileId,
    profiles,
  });
};

const isUsableGenerationProfile = (profile: ApiProviderProfile): boolean => {
  return profile.enabled !== false && !!profile.baseUrl.trim() && !!profile.apiKey.trim();
};

export const resolveGenerationApiProviderProfile = (
  settings: ApiProviderSettings,
  selectedProfileId?: string | null,
): ApiProviderProfile | null => {
  const normalized = normalizeApiProviderSettings(settings);
  const selectedProfile = selectedProfileId
    ? normalized.profiles.find(profile => profile.id === selectedProfileId)
    : null;

  if (selectedProfile && isUsableGenerationProfile(selectedProfile)) {
    return selectedProfile;
  }

  return normalized.profiles.find(isUsableGenerationProfile) || null;
};

export interface CreateApiProviderModelSettingsInput {
  allModels: ApiProviderStoredModel[];
  categories: Record<string, ApiProviderModelCategory>;
  selectedIds: string[];
  previous?: Partial<ApiProviderProfileModelSettings> | null;
}

const resolveActiveModel = (models: string[], previousActive?: string): string => {
  if (previousActive && models.includes(previousActive)) return previousActive;
  return models[0] || '';
};

export const createApiProviderProfileModelSettings = ({
  allModels,
  categories,
  selectedIds,
  previous,
}: CreateApiProviderModelSettingsInput): ApiProviderProfileModelSettings => {
  const imageModels: string[] = [];
  const chatModels: string[] = [];
  const videoModels: string[] = [];

  for (const id of selectedIds) {
    const category = categories[id] || 'chat';
    if (category === 'image') imageModels.push(id);
    else if (category === 'video') videoModels.push(id);
    else chatModels.push(id);
  }

  return {
    allModels,
    categories,
    imageModels,
    chatModels,
    videoModels,
    activeImageModel: resolveActiveModel(imageModels, previous?.activeImageModel),
    activeChatModel: resolveActiveModel(chatModels, previous?.activeChatModel),
    activeVideoModel: resolveActiveModel(videoModels, previous?.activeVideoModel),
    updatedAt: new Date().toISOString(),
  };
};

export const resolveFetchedProviderSelectedModelIds = (
  fetchedModels: ApiProviderStoredModel[],
  previous?: Partial<ApiProviderProfileModelSettings> | null,
): string[] => {
  const fetchedIds = new Set(fetchedModels.map(model => model.id));
  const previousIds = [
    ...(previous?.imageModels || []),
    ...(previous?.chatModels || []),
    ...(previous?.videoModels || []),
  ];
  return previousIds.filter(id => fetchedIds.has(id));
};

export const updateApiProviderProfileModelSettings = (
  settings: ApiProviderSettings,
  profileId: string,
  modelSettings: ApiProviderProfileModelSettings,
): ApiProviderSettings => normalizeApiProviderSettings({
  ...settings,
  profiles: settings.profiles.map(profile => (
    profile.id === profileId
      ? { ...profile, modelSettings, updatedAt: new Date().toISOString() }
      : profile
  )),
});

export const migrateLegacyThirdPartyConfig = (legacyConfig?: Partial<ThirdPartyApiConfig> | null): ApiProviderSettings => {
  if (!legacyConfig || (!legacyConfig.baseUrl && !legacyConfig.apiKey)) {
    return { ...EMPTY_API_PROVIDER_SETTINGS, profiles: [] };
  }

  const profile = createApiProviderProfile('yuli', {
    id: 'legacy-yuli-api',
    name: '玉玉 API',
    baseUrl: legacyConfig.baseUrl || 'https://yuli.host',
    apiKey: legacyConfig.apiKey || '',
    enabled: legacyConfig.enabled !== false,
  });

  return {
    version: 1,
    activeProfileId: profile.id,
    profiles: [profile],
  };
};

const loadLegacyThirdPartyConfigFromStorage = (): Partial<ThirdPartyApiConfig> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('third_party_api_config');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const resolveLegacyThirdPartyConfig = (legacyConfig?: Partial<ThirdPartyApiConfig> | null): Partial<ThirdPartyApiConfig> | null => {
  if (legacyConfig?.baseUrl || legacyConfig?.apiKey) return legacyConfig;
  return loadLegacyThirdPartyConfigFromStorage();
};

export const toThirdPartyApiConfig = (
  activeProfile: ApiProviderProfile | null,
  models: ApiProviderModelSelection,
): ThirdPartyApiConfig => ({
  enabled: !!activeProfile && activeProfile.enabled !== false,
  baseUrl: activeProfile?.baseUrl || '',
  apiKey: activeProfile?.apiKey || '',
  model: activeProfile?.modelSettings?.activeImageModel || models.activeImageModel || 'nano-banana-2',
  chatModel: activeProfile?.modelSettings?.activeChatModel || models.activeChatModel || 'gemini-2.5-pro',
  videoModel: activeProfile?.modelSettings?.activeVideoModel || models.activeVideoModel,
});

export const mergeApiProviderSettingsIntoAppSettings = (
  appSettings: AppSettingsRecord,
  apiProviderSettings: ApiProviderSettings,
): AppSettingsRecord => ({
  ...appSettings,
  apiProviderSettings,
});

export const loadApiProviderSettings = async (
  legacyConfig?: Partial<ThirdPartyApiConfig> | null,
): Promise<{ settings: ApiProviderSettings; source: 'server' | 'legacy' | 'fallback' }> => {
  try {
    const appSettings = await fetchAppSettings();
    const serverSettings = appSettings.apiProviderSettings as Partial<ApiProviderSettings> | undefined;
    const normalized = normalizeApiProviderSettings(serverSettings);
    if (normalized.profiles.length > 0) {
      return { settings: normalized, source: 'server' };
    }

    const migrated = migrateLegacyThirdPartyConfig(resolveLegacyThirdPartyConfig(legacyConfig));
    return {
      settings: migrated,
      source: migrated.profiles.length > 0 ? 'legacy' : 'fallback',
    };
  } catch {
    const migrated = migrateLegacyThirdPartyConfig(resolveLegacyThirdPartyConfig(legacyConfig));
    return {
      settings: migrated,
      source: migrated.profiles.length > 0 ? 'legacy' : 'fallback',
    };
  }
};

export const saveApiProviderSettings = async (settings: ApiProviderSettings): Promise<ApiProviderSettings> => {
  const normalized = normalizeApiProviderSettings(settings);
  const appSettings = await fetchAppSettings();
  const merged = mergeApiProviderSettingsIntoAppSettings(appSettings, normalized);
  await postAppSettings(merged);
  return normalized;
};
