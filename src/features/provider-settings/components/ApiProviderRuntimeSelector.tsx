import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Server } from 'lucide-react';
import { useModelContext } from '../../../../contexts/ModelContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { ThirdPartyApiConfig } from '../../../../types';
import {
  API_PROVIDER_SETTINGS_CHANGED_EVENT,
  EMPTY_API_PROVIDER_SETTINGS,
  RUNTIME_IMAGE_API_PROVIDER_STORAGE_KEY,
  loadApiProviderSettings,
  resolveGenerationApiProviderProfile,
  saveApiProviderSettings,
  toThirdPartyApiConfig,
} from '../services/apiProviderSettingsClient.ts';
import type { ApiProviderSettings } from '../types/providerSettings.types';

interface ApiProviderRuntimeSelectorProps {
  onProviderConfigChange: (config: ThirdPartyApiConfig) => void;
}

export const ApiProviderRuntimeSelector: React.FC<ApiProviderRuntimeSelectorProps> = ({
  onProviderConfigChange,
}) => {
  const { isDark } = useTheme();
  const modelCtx = useModelContext();
  const [settings, setSettings] = useState<ApiProviderSettings>(EMPTY_API_PROVIDER_SETTINGS);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(RUNTIME_IMAGE_API_PROVIDER_STORAGE_KEY);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const onProviderConfigChangeRef = useRef(onProviderConfigChange);

  useEffect(() => {
    onProviderConfigChangeRef.current = onProviderConfigChange;
  }, [onProviderConfigChange]);

  const usableProfiles = useMemo(() => settings.profiles.filter(profile => (
    profile.enabled !== false && !!profile.baseUrl.trim() && !!profile.apiKey.trim()
  )), [settings.profiles]);

  const selectedProfile = useMemo(
    () => resolveGenerationApiProviderProfile(settings, selectedProfileId),
    [settings, selectedProfileId],
  );

  const loadProfiles = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await loadApiProviderSettings();
      setSettings(result.settings);
      if (result.source === 'legacy' && result.settings.profiles.length > 0) {
        await saveApiProviderSettings(result.settings);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'API 配置读取失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    const handleSettingsChanged = () => loadProfiles();
    window.addEventListener(API_PROVIDER_SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    return () => window.removeEventListener(API_PROVIDER_SETTINGS_CHANGED_EVENT, handleSettingsChanged);
  }, []);

  useEffect(() => {
    if (selectedProfile && selectedProfile.id !== selectedProfileId) {
      setSelectedProfileId(selectedProfile.id);
      return;
    }

    if (typeof window !== 'undefined') {
      if (selectedProfile) {
        window.localStorage.setItem(RUNTIME_IMAGE_API_PROVIDER_STORAGE_KEY, selectedProfile.id);
      } else {
        window.localStorage.removeItem(RUNTIME_IMAGE_API_PROVIDER_STORAGE_KEY);
      }
    }

    onProviderConfigChangeRef.current(toThirdPartyApiConfig(selectedProfile, {
      activeImageModel: modelCtx.activeImageModel,
      activeChatModel: modelCtx.activeChatModel,
      activeVideoModel: modelCtx.activeVideoModel,
    }));
  }, [
    selectedProfile,
    selectedProfileId,
    modelCtx.activeImageModel,
    modelCtx.activeChatModel,
    modelCtx.activeVideoModel,
  ]);

  useEffect(() => {
    const modelSettings = selectedProfile?.modelSettings;
    if (!modelSettings) return;

    modelCtx.setAllModelsDirect(modelSettings.allModels);
    modelCtx.setSelectedModels('image', modelSettings.imageModels);
    modelCtx.setSelectedModels('chat', modelSettings.chatModels);
    modelCtx.setSelectedModels('video', modelSettings.videoModels);
    if (modelSettings.activeImageModel) modelCtx.setActiveImageModel(modelSettings.activeImageModel);
    if (modelSettings.activeChatModel) modelCtx.setActiveChatModel(modelSettings.activeChatModel);
    if (modelSettings.activeVideoModel) modelCtx.setActiveVideoModel(modelSettings.activeVideoModel);
  }, [selectedProfile?.id, selectedProfile?.modelSettings?.updatedAt]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Server size={14} style={{ color: isDark ? '#93c5fd' : '#2563eb' }} />
        <span className="text-[10px] font-medium" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          生图 API 渠道
        </span>
      </div>
      <select
        value={selectedProfile?.id || ''}
        onChange={event => setSelectedProfileId(event.target.value || null)}
        disabled={isLoading || usableProfiles.length === 0}
        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none"
        style={{
          background: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.03)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          color: isDark ? '#e5e5e5' : '#1f2937',
        }}
        title="选择本次生图使用的 API 渠道"
      >
        {usableProfiles.length === 0 ? (
          <option value="">{isLoading ? '正在读取 API...' : '未配置可用 API'}</option>
        ) : (
          usableProfiles.map(profile => (
            <option key={profile.id} value={profile.id}>{profile.name}</option>
          ))
        )}
      </select>
      {loadError && (
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#f87171' }}>
          <AlertCircle size={12} />
          <span className="truncate">{loadError}</span>
        </div>
      )}
    </div>
  );
};

export default ApiProviderRuntimeSelector;
