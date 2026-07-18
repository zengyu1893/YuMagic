import React, { useMemo, useState } from 'react';
import { Check, Download, RefreshCw, X } from 'lucide-react';
import type { ModelCategory } from '../../../../types';
import { clearModelCache, fetchProviderModels } from '../../../../services/modelService';
import {
  createApiProviderProfileModelSettings,
  resolveFetchedProviderSelectedModelIds,
  updateApiProviderProfileModelSettings,
} from '../services/apiProviderSettingsClient.ts';
import type {
  ApiProviderProfile,
  ApiProviderProfileModelSettings,
  ApiProviderSettings,
} from '../types/providerSettings.types';

interface SettingsColors {
  bg: string;
  card: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  accentBg: string;
  inputBg: string;
}

interface ApiProviderModelProfilesPanelProps {
  settings: ApiProviderSettings;
  colors: SettingsColors;
  isDark: boolean;
  isSaving: boolean;
  onChange: (settings: ApiProviderSettings) => void;
  onToast?: (message: string) => void;
}

export const ApiProviderModelProfilesPanel: React.FC<ApiProviderModelProfilesPanelProps> = ({
  settings,
  colors: C,
  isDark,
  isSaving,
  onChange,
  onToast,
}) => {
  const [fetchingProfileId, setFetchingProfileId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<Record<string, string>>({});
  const [pickerProfileId, setPickerProfileId] = useState<string | null>(null);
  const [pickerTab, setPickerTab] = useState<ModelCategory | 'all'>('all');
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const usableProfiles = useMemo(() => settings.profiles.filter(profile => (
    profile.enabled !== false && !!profile.baseUrl.trim() && !!profile.apiKey.trim()
  )), [settings.profiles]);

  const pickerProfile = settings.profiles.find(profile => profile.id === pickerProfileId) || null;
  const pickerModels = pickerProfile?.modelSettings?.allModels || [];
  const pickerCategories = pickerProfile?.modelSettings?.categories || {};

  const openPicker = (profile: ApiProviderProfile) => {
    const modelSettings = profile.modelSettings;
    if (!modelSettings || modelSettings.allModels.length === 0) return;
    setPickerProfileId(profile.id);
    setPickerTab('all');
    setPickerSearch('');
    setSelectedIds(new Set([
      ...modelSettings.imageModels,
      ...modelSettings.chatModels,
      ...modelSettings.videoModels,
    ]));
  };

  const handleFetch = async (profile: ApiProviderProfile) => {
    setFetchingProfileId(profile.id);
    setFetchError(prev => ({ ...prev, [profile.id]: '' }));
    clearModelCache();

    try {
      const fetched = await fetchProviderModels(profile.baseUrl.trim(), profile.apiKey, profile.templateId);
      const models = fetched.allModels;
      const categories = fetched.categories;

      const previous = profile.modelSettings;
      const selected = resolveFetchedProviderSelectedModelIds(models, previous);

      const modelSettings = createApiProviderProfileModelSettings({
        allModels: models,
        categories,
        selectedIds: selected,
        previous,
      });

      onChange(updateApiProviderProfileModelSettings(settings, profile.id, modelSettings));
      onToast?.(`${profile.name} 已拉取 ${models.length} 个模型`);
    } catch (error) {
      setFetchError(prev => ({
        ...prev,
        [profile.id]: error instanceof Error ? error.message : '拉取失败',
      }));
    } finally {
      setFetchingProfileId(null);
    }
  };

  const updateActiveModel = (
    profile: ApiProviderProfile,
    category: 'image' | 'chat' | 'video',
    modelId: string,
  ) => {
    if (!profile.modelSettings) return;
    const next: ApiProviderProfileModelSettings = {
      ...profile.modelSettings,
      activeImageModel: category === 'image' ? modelId : profile.modelSettings.activeImageModel,
      activeChatModel: category === 'chat' ? modelId : profile.modelSettings.activeChatModel,
      activeVideoModel: category === 'video' ? modelId : profile.modelSettings.activeVideoModel,
      updatedAt: new Date().toISOString(),
    };
    onChange(updateApiProviderProfileModelSettings(settings, profile.id, next));
  };

  const handleApplyPicker = () => {
    if (!pickerProfile?.modelSettings) return;
    const modelSettings = createApiProviderProfileModelSettings({
      allModels: pickerProfile.modelSettings.allModels,
      categories: pickerProfile.modelSettings.categories,
      selectedIds: [...selectedIds],
      previous: pickerProfile.modelSettings,
    });
    onChange(updateApiProviderProfileModelSettings(settings, pickerProfile.id, modelSettings));
    setPickerProfileId(null);
    onToast?.(`${pickerProfile.name} 模型已保存`);
  };

  return (
    <section className="rounded-2xl p-6 space-y-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div>
        <h3 className="text-base font-bold">模型管理</h3>
        <p className="text-sm mt-0.5" style={{ color: C.textDim }}>
          每个 API 渠道单独拉取和保存模型，生图时只显示所选渠道的模型。
        </p>
      </div>

      {usableProfiles.length === 0 ? (
        <div className="rounded-xl p-5 text-center border" style={{ borderColor: C.border, color: C.textDim }}>
          请先添加带 Key 的 API 配置。
        </div>
      ) : (
        <div className="space-y-4">
          {usableProfiles.map(profile => (
            <div key={profile.id} className="rounded-xl border p-4 space-y-4" style={{ borderColor: C.border, background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)' }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-sm font-bold">{profile.name}</h4>
                  <p className="text-xs mt-0.5 font-mono truncate max-w-xl" style={{ color: C.textDim }}>{profile.baseUrl}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFetch(profile)}
                    disabled={isSaving || fetchingProfileId === profile.id}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                    style={{ background: C.accent, color: 'white' }}
                  >
                    <RefreshCw size={15} className={fetchingProfileId === profile.id ? 'animate-spin' : ''} />
                    {fetchingProfileId === profile.id ? '拉取中...' : '拉取模型'}
                  </button>
                  <button
                    onClick={() => openPicker(profile)}
                    disabled={!profile.modelSettings?.allModels.length}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50"
                    style={{ borderColor: C.border, color: C.text }}
                  >
                    <Download size={15} /> 选择模型
                  </button>
                </div>
              </div>

              {fetchError[profile.id] && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                  {fetchError[profile.id]}
                </div>
              )}

              {profile.modelSettings ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {([
                    { key: 'image' as const, label: '图像模型', desc: '生图和画布使用', ids: profile.modelSettings.imageModels, active: profile.modelSettings.activeImageModel },
                    { key: 'chat' as const, label: '聊天模型', desc: 'BP智能体 / 提示词优化', ids: profile.modelSettings.chatModels, active: profile.modelSettings.activeChatModel },
                    { key: 'video' as const, label: '视频模型', desc: '视频生成使用', ids: profile.modelSettings.videoModels, active: profile.modelSettings.activeVideoModel },
                  ]).map(col => (
                    <div key={col.key} className="rounded-xl p-4 border" style={{ borderColor: C.border, background: isDark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.55)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-sm font-semibold">{col.label}</span>
                          <p className="text-xs mt-0.5" style={{ color: C.textDim }}>{col.desc}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: C.accentBg, color: C.accent }}>{col.ids.length}</span>
                      </div>
                      <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar">
                        {col.ids.length === 0 && (
                          <p className="text-sm py-4 text-center" style={{ color: C.textDim }}>暂无模型</p>
                        )}
                        {col.ids.map(id => (
                          <button
                            key={id}
                            onClick={() => updateActiveModel(profile, col.key, id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors flex items-center justify-between ${id === col.active ? 'font-semibold' : ''}`}
                            style={{
                              background: id === col.active ? C.accentBg : 'transparent',
                              color: id === col.active ? C.accent : C.textDim,
                            }}
                          >
                            <span className="truncate">{id}</span>
                            {id === col.active && <span className="text-xs shrink-0 ml-2" style={{ color: C.accent }}>当前</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl p-5 text-center border" style={{ borderColor: C.border, color: C.textDim }}>
                  还没有拉取模型。
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pickerProfile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPickerProfileId(null)}>
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col shadow-2xl"
            style={{ background: isDark ? '#111' : '#fff', border: `1px solid ${C.border}` }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.border }}>
              <div>
                <h3 className="text-base font-bold">选择模型</h3>
                <p className="text-sm" style={{ color: C.textDim }}>{pickerProfile.name} · 共 {pickerModels.length} 个 · 已选 {selectedIds.size} 个</p>
              </div>
              <button onClick={() => setPickerProfileId(null)} className="p-2 rounded-lg hover:bg-white/10"><X size={18} /></button>
            </div>
            <div className="flex gap-2 px-6 py-3 border-b" style={{ borderColor: C.border }}>
              {(['all', 'image', 'chat', 'video'] as const).map(tab => {
                const count = tab === 'all' ? pickerModels.length : pickerModels.filter(model => (pickerCategories[model.id] || 'chat') === tab).length;
                const labels = { all: '全部', image: '图像', chat: '聊天', video: '视频' };
                return (
                  <button
                    key={tab}
                    onClick={() => setPickerTab(tab)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ background: pickerTab === tab ? C.accentBg : 'transparent', color: pickerTab === tab ? C.accent : C.textDim }}
                  >
                    {labels[tab]} ({count})
                  </button>
                );
              })}
              <input
                type="text"
                placeholder="搜索模型..."
                value={pickerSearch}
                onChange={event => setPickerSearch(event.target.value)}
                className="ml-auto px-3 py-1.5 rounded-lg text-sm border focus:outline-none"
                style={{ background: C.inputBg, borderColor: C.border, color: C.text }}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-1 custom-scrollbar">
              {pickerModels.filter(model => {
                if (pickerTab !== 'all' && (pickerCategories[model.id] || 'chat') !== pickerTab) return false;
                if (pickerSearch && !model.id.toLowerCase().includes(pickerSearch.toLowerCase())) return false;
                return true;
              }).map(model => {
                const category = pickerCategories[model.id] || 'chat';
                const categoryColor = category === 'image' ? '#3b82f6' : category === 'video' ? '#f59e0b' : '#10b981';
                const isSelected = selectedIds.has(model.id);
                return (
                  <label key={model.id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer" style={{ background: isSelected ? C.accentBg : 'transparent' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={event => {
                        const next = new Set(selectedIds);
                        if (event.target.checked) next.add(model.id);
                        else next.delete(model.id);
                        setSelectedIds(next);
                      }}
                    />
                    <span className="flex-1 text-sm font-mono truncate">{model.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${categoryColor}20`, color: categoryColor }}>{category}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={() => setPickerProfileId(null)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: C.border, color: C.textDim }}>取消</button>
              <button onClick={handleApplyPicker} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold" style={{ background: C.accent, color: 'white' }}>
                <Check size={15} /> 应用选择
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
