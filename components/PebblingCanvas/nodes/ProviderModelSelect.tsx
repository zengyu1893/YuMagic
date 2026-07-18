import React, { useEffect, useMemo, useState } from 'react';
import type { CanvasNode } from '../../../types/pebblingTypes';
import {
  API_PROVIDER_SETTINGS_CHANGED_EVENT,
  EMPTY_API_PROVIDER_SETTINGS,
  loadApiProviderSettings,
} from '../../../src/features/provider-settings/services/apiProviderSettingsClient.ts';
import {
  getSelectableProviderModels,
  getSelectableProviderProfiles,
  type CanvasProviderModelKind,
} from '../../../src/features/provider-settings/services/apiProviderRuntimeResolver.ts';
import type { ApiProviderSettings } from '../../../src/features/provider-settings/types/providerSettings.types';

interface ProviderModelSelectProps {
  node: CanvasNode;
  kind: CanvasProviderModelKind;
  onUpdate: (id: string, updates: Partial<CanvasNode>) => void;
  isLightCanvas: boolean;
}

const MODEL_FIELD_BY_KIND: Record<CanvasProviderModelKind, 'imageModel' | 'chatModel' | 'videoModel'> = {
  image: 'imageModel',
  chat: 'chatModel',
  video: 'videoModel',
};

export const ProviderModelSelect = React.memo(function ProviderModelSelect({
  node,
  kind,
  onUpdate,
  isLightCanvas,
}: ProviderModelSelectProps) {
  const [settings, setSettings] = useState<ApiProviderSettings>(EMPTY_API_PROVIDER_SETTINGS);

  useEffect(() => {
    let alive = true;
    const load = () => {
      loadApiProviderSettings()
        .then(result => { if (alive) setSettings(result.settings); })
        .catch(() => { if (alive) setSettings(EMPTY_API_PROVIDER_SETTINGS); });
    };

    load();
    window.addEventListener(API_PROVIDER_SETTINGS_CHANGED_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(API_PROVIDER_SETTINGS_CHANGED_EVENT, load);
    };
  }, []);

  const providerOptions = useMemo(
    () => getSelectableProviderProfiles(settings, kind),
    [settings, kind],
  );

  const selectedProviderId = node.data?.apiProviderProfileId || '';
  const modelOptions = getSelectableProviderModels(settings, selectedProviderId, kind);
  const modelField = MODEL_FIELD_BY_KIND[kind];
  const savedModel = (node.data?.[modelField] as string | undefined) || '';
  const selectedModel = modelOptions.includes(savedModel) ? savedModel : '';

  const updateProvider = (profileId: string) => {
    const nextModels = getSelectableProviderModels(settings, profileId, kind);
    onUpdate(node.id, {
      data: {
        ...node.data,
        apiProviderProfileId: profileId || undefined,
        [modelField]: profileId ? (nextModels[0] || '') : undefined,
      },
    });
  };

  const updateModel = (model: string) => {
    onUpdate(node.id, {
      data: {
        ...node.data,
        apiProviderProfileId: selectedProviderId || undefined,
        [modelField]: model,
      },
    });
  };

  if (providerOptions.length === 0) {
    return null;
  }

  const selectClass = `min-w-0 rounded-md px-1.5 py-1 text-[9px] outline-none border ${
    isLightCanvas
      ? 'bg-white text-gray-700 border-gray-200'
      : 'bg-zinc-800 text-zinc-200 border-white/10'
  }`;

  return (
    <div className="flex items-center gap-1" onMouseDown={(event) => event.stopPropagation()}>
      <select
        value={selectedProviderId}
        onChange={(event) => updateProvider(event.target.value)}
        className={`${selectClass} w-[42%]`}
        title="API provider"
      >
        <option value="">全局配置</option>
        {providerOptions.map(option => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
      <select
        value={selectedModel}
        onChange={(event) => updateModel(event.target.value)}
        className={`${selectClass} flex-1`}
        title="Model"
        disabled={!selectedProviderId || modelOptions.length === 0}
      >
        <option value="">{selectedProviderId ? '选择模型' : '使用全局模型'}</option>
        {modelOptions.map(model => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
    </div>
  );
});
