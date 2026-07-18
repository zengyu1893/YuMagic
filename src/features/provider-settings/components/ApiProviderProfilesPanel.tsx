import React, { useState } from 'react';
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Server,
  Trash2,
  X,
} from 'lucide-react';
import {
  API_PROVIDER_TEMPLATES,
  YULI_RECOMMENDED_APIS,
  YULI_RECOMMENDED_BASE_URLS,
} from '../config/apiProviderTemplates.ts';
import {
  createApiProviderProfile,
  removeApiProviderProfile,
  upsertApiProviderProfile,
} from '../services/apiProviderSettingsClient.ts';
import type {
  ApiProviderProfile,
  ApiProviderSettings,
  ApiProviderTemplateId,
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

interface ApiProviderProfilesPanelProps {
  settings: ApiProviderSettings;
  colors: SettingsColors;
  isDark: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (settings: ApiProviderSettings) => void;
}

export const ApiProviderProfilesPanel: React.FC<ApiProviderProfilesPanelProps> = ({
  settings,
  colors: C,
  isDark,
  isLoading,
  isSaving,
  onChange,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<ApiProviderTemplateId | null>(null);
  const [editingProfile, setEditingProfile] = useState<ApiProviderProfile | null>(null);
  const [formName, setFormName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const resetForm = () => {
    setPickerOpen(false);
    setSelectedTemplateId(null);
    setEditingProfile(null);
    setFormName('');
    setFormBaseUrl('');
    setFormApiKey('');
    setShowKey(false);
  };

  const openTemplatePicker = () => {
    setPickerOpen(true);
    setSelectedTemplateId(null);
    setEditingProfile(null);
    setFormName('');
    setFormBaseUrl('');
    setFormApiKey('');
  };

  const openNewForm = (templateId: ApiProviderTemplateId) => {
    const profile = createApiProviderProfile(templateId);
    setSelectedTemplateId(templateId);
    setEditingProfile(null);
    setFormName(profile.name);
    setFormBaseUrl(profile.baseUrl);
    setFormApiKey('');
  };

  const openEditForm = (profile: ApiProviderProfile) => {
    setPickerOpen(true);
    setSelectedTemplateId(profile.templateId);
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormBaseUrl(profile.baseUrl);
    setFormApiKey('');
  };

  const handleSubmit = () => {
    if (!selectedTemplateId || !formName.trim() || !formBaseUrl.trim()) return;

    const now = new Date().toISOString();
    const profile = editingProfile
      ? {
          ...editingProfile,
          name: formName.trim(),
          baseUrl: formBaseUrl.trim(),
          apiKey: formApiKey.trim() || editingProfile.apiKey,
          updatedAt: now,
        }
      : createApiProviderProfile(selectedTemplateId, {
          name: formName.trim(),
          baseUrl: formBaseUrl.trim(),
          apiKey: formApiKey.trim(),
        });

    onChange(upsertApiProviderProfile(settings, profile, false));
    resetForm();
  };

  const handleDelete = (profile: ApiProviderProfile) => {
    const confirmed = window.confirm(`删除 API 配置“${profile.name}”？`);
    if (!confirmed) return;
    onChange(removeApiProviderProfile(settings, profile.id));
  };

  const selectedTemplate = API_PROVIDER_TEMPLATES.find(template => template.id === selectedTemplateId);
  const recommendedBaseUrls = selectedTemplate?.recommendedBaseUrls ?? YULI_RECOMMENDED_BASE_URLS;

  return (
    <section className="rounded-2xl p-6 space-y-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold">API 配置</h3>
          <p className="text-sm mt-0.5" style={{ color: C.textDim }}>
            添加多个兼容接口，生图时再选择要使用的 API 渠道。
          </p>
        </div>
        <button
          onClick={openTemplatePicker}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          style={{ background: C.accent, color: 'white' }}
          disabled={isLoading || isSaving}
        >
          <Plus size={15} /> 添加 API
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl p-4 text-sm" style={{ background: C.inputBg, color: C.textDim }}>
          正在读取 API 配置...
        </div>
      ) : settings.profiles.length === 0 ? (
        <div className="rounded-xl p-5 text-center border" style={{ borderColor: C.border, color: C.textDim }}>
          暂无 API 配置，点击“添加 API”创建第一组渠道。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {settings.profiles.map(profile => {
            const template = API_PROVIDER_TEMPLATES.find(item => item.id === profile.templateId);
            return (
              <div
                key={profile.id}
                className="rounded-xl p-4 border transition-colors"
                style={{
                  borderColor: C.border,
                  background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.inputBg, color: C.accent }}>
                    <Server size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm truncate">{profile.name}</h4>
                    <p className="text-xs mt-1 truncate" style={{ color: C.textDim }}>{template?.name || '兼容接口'}</p>
                    <p className="text-xs mt-1 truncate font-mono" style={{ color: C.textDim }}>{profile.baseUrl}</p>
                    <p className="text-xs mt-1" style={{ color: profile.apiKey ? '#22c55e' : '#f59e0b' }}>
                      {profile.apiKey ? 'Key 已保存' : '未填写 Key'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => openEditForm(profile)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: C.border, color: C.textDim }}
                    title="编辑"
                    disabled={isSaving}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(profile)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: C.border, color: '#f87171' }}
                    title="删除"
                    disabled={isSaving}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={resetForm}>
          <div
            className="rounded-2xl w-full max-w-xl max-h-[82vh] overflow-y-auto shadow-2xl"
            style={{ background: isDark ? '#111' : '#fff', border: `1px solid ${C.border}` }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.border }}>
              <div>
                <h3 className="text-base font-bold">{selectedTemplate ? (editingProfile ? '编辑 API 配置' : '填写 API 配置') : '选择供应商模板'}</h3>
                <p className="text-sm" style={{ color: C.textDim }}>{selectedTemplate?.name || '选择一个模板后填写连接信息'}</p>
              </div>
              <button onClick={resetForm} className="p-2 rounded-lg hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            {!selectedTemplate ? (
              <div className="p-6 space-y-3">
                {API_PROVIDER_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => openNewForm(template.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-colors"
                    style={{ borderColor: C.border, background: C.inputBg }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.accentBg, color: C.accent }}>
                      <Server size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{template.name}</div>
                      <div className="text-xs mt-1" style={{ color: C.textDim }}>{template.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium" style={{ color: C.textDim }}>配置名称</span>
                  <input
                    type="text"
                    value={formName}
                    onChange={event => setFormName(event.target.value)}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm border focus:outline-none"
                    style={{ background: C.inputBg, borderColor: C.border, color: C.text }}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium" style={{ color: C.textDim }}>API 地址</span>
                  <input
                    type="text"
                    value={formBaseUrl}
                    onChange={event => setFormBaseUrl(event.target.value)}
                    placeholder="https://api.example.com"
                    className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm border focus:outline-none"
                    style={{ background: C.inputBg, borderColor: C.border, color: C.text }}
                  />
                  {recommendedBaseUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs py-1" style={{ color: C.textDim }}>推荐接口</span>
                      {recommendedBaseUrls.map(url => {
                        const recommendedApi = YULI_RECOMMENDED_APIS.find(api => api.baseUrl === url);
                        return (
                          <div key={url} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setFormBaseUrl(url)}
                              className="px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors"
                              style={{
                                borderColor: formBaseUrl === url ? C.accent : C.border,
                                background: formBaseUrl === url ? C.accentBg : C.inputBg,
                                color: formBaseUrl === url ? C.accent : C.textDim,
                              }}
                            >
                              {url}
                            </button>
                            {recommendedApi && (
                              <a
                                href={recommendedApi.keyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`获取 ${recommendedApi.label} Key`}
                                className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                                style={{ color: C.accent }}
                              >
                                <ExternalLink size={12} /> 获取 Key
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </label>
                <label className="block">
                  <span className="text-sm font-medium" style={{ color: C.textDim }}>API Key</span>
                  <div className="flex gap-3 mt-1.5">
                    <div className="flex-1 relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={formApiKey}
                        onChange={event => setFormApiKey(event.target.value)}
                        placeholder={editingProfile?.apiKey ? '输入新 Key 更新' : 'sk-...'}
                        className="w-full px-4 py-3 pr-10 rounded-xl text-sm border focus:outline-none"
                        style={{ background: C.inputBg, borderColor: C.border, color: C.text }}
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                        style={{ color: C.textDim }}
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </label>

                <div className="flex items-center justify-between pt-2">
                  {!editingProfile && (
                    <button onClick={() => setSelectedTemplateId(null)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: C.border, color: C.textDim }}>
                      返回模板
                    </button>
                  )}
                  {editingProfile && <span />}
                  <button
                    onClick={handleSubmit}
                    disabled={!formName.trim() || !formBaseUrl.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                    style={{ background: C.accent, color: 'white' }}
                  >
                    <Check size={15} /> 保存配置
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
