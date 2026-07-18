import type { ThirdPartyApiConfig } from '../../../../types';
import type { NodeData } from '../../../../types/pebblingTypes';
import type {
  ApiProviderModelCategory,
  ApiProviderProfile,
  ApiProviderSettings,
} from '../types/providerSettings.types';
import { loadApiProviderSettings, normalizeApiProviderSettings } from './apiProviderSettingsClient.ts';

export type CanvasProviderModelKind = 'image' | 'chat' | 'video';

export interface CanvasProviderModelOption {
  id: string;
  name: string;
  models: string[];
}

const isUsableProfile = (profile: ApiProviderProfile): boolean => (
  profile.enabled !== false && !!profile.baseUrl.trim() && !!profile.apiKey.trim()
);

const getProfileModelsByKind = (
  profile: ApiProviderProfile | null | undefined,
  kind: CanvasProviderModelKind,
): string[] => {
  if (!profile?.modelSettings) return [];
  if (kind === 'image') return profile.modelSettings.imageModels;
  if (kind === 'chat') return profile.modelSettings.chatModels;
  return profile.modelSettings.videoModels;
};

const getActiveModelByKind = (
  profile: ApiProviderProfile,
  kind: CanvasProviderModelKind,
): string => {
  if (!profile.modelSettings) return '';
  if (kind === 'image') return profile.modelSettings.activeImageModel;
  if (kind === 'chat') return profile.modelSettings.activeChatModel;
  return profile.modelSettings.activeVideoModel;
};

const getNodeModelByKind = (
  data: Partial<NodeData> | null | undefined,
  kind: CanvasProviderModelKind,
): string => {
  if (!data) return '';
  if (kind === 'image') return data.imageModel || '';
  if (kind === 'chat') return data.chatModel || '';
  return data.videoModel || '';
};

export const getSelectableProviderProfiles = (
  settings: ApiProviderSettings,
  kind: CanvasProviderModelKind,
): CanvasProviderModelOption[] => {
  const normalized = normalizeApiProviderSettings(settings);
  return normalized.profiles
    .filter(isUsableProfile)
    .map(profile => ({
      id: profile.id,
      name: profile.name,
      models: getProfileModelsByKind(profile, kind),
    }))
    .filter(option => option.models.length > 0);
};

export const getSelectableProviderModels = (
  settings: ApiProviderSettings,
  profileId: string | null | undefined,
  kind: CanvasProviderModelKind,
): string[] => {
  const normalized = normalizeApiProviderSettings(settings);
  const profile = normalized.profiles.find(item => item.id === profileId) || null;
  return getProfileModelsByKind(profile, kind);
};

export const resolveDefaultProviderProfileId = (
  settings: ApiProviderSettings,
  selectedProfileId: string | null | undefined,
  kind: CanvasProviderModelKind,
): string => {
  const options = getSelectableProviderProfiles(settings, kind);
  if (selectedProfileId && options.some(option => option.id === selectedProfileId)) {
    return selectedProfileId;
  }
  return options[0]?.id || '';
};

export const resolveCanvasNodeThirdPartyConfig = (
  settings: ApiProviderSettings,
  data: Partial<NodeData> | null | undefined,
  kind: CanvasProviderModelKind,
  fallbackConfig?: ThirdPartyApiConfig | null,
): ThirdPartyApiConfig | null => {
  const selectedProfileId = data?.apiProviderProfileId || '';
  if (!selectedProfileId) return fallbackConfig || null;

  const normalized = normalizeApiProviderSettings(settings);
  const profile = normalized.profiles.find(item => item.id === selectedProfileId) || null;
  if (!profile || !isUsableProfile(profile)) return null;

  const selectedModels = getProfileModelsByKind(profile, kind);
  const requestedModel = getNodeModelByKind(data, kind);
  const activeModel = getActiveModelByKind(profile, kind);
  const resolvedModel = selectedModels.includes(requestedModel)
    ? requestedModel
    : activeModel || selectedModels[0] || requestedModel;

  return {
    enabled: true,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: kind === 'image' ? resolvedModel : (profile.modelSettings?.activeImageModel || selectedModels[0] || fallbackConfig?.model || ''),
    chatModel: kind === 'chat' ? resolvedModel : (profile.modelSettings?.activeChatModel || fallbackConfig?.chatModel || ''),
    videoModel: kind === 'video' ? resolvedModel : (profile.modelSettings?.activeVideoModel || fallbackConfig?.videoModel || undefined),
  };
};

export const loadCanvasNodeThirdPartyConfig = async (
  data: Partial<NodeData> | null | undefined,
  kind: CanvasProviderModelKind,
  fallbackConfig?: ThirdPartyApiConfig | null,
): Promise<ThirdPartyApiConfig | null> => {
  const result = await loadApiProviderSettings();
  return resolveCanvasNodeThirdPartyConfig(result.settings, data, kind, fallbackConfig);
};
