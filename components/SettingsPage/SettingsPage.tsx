import React, { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Palette, Plug, Sparkles, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getRunningHubConfig, saveRunningHubConfig } from '../../services/api/runninghub';
import { ApiProviderModelProfilesPanel } from '../../src/features/provider-settings/components/ApiProviderModelProfilesPanel.tsx';
import { ApiProviderProfilesPanel } from '../../src/features/provider-settings/components/ApiProviderProfilesPanel.tsx';
import {
  API_PROVIDER_SETTINGS_CHANGED_EVENT,
  EMPTY_API_PROVIDER_SETTINGS,
  loadApiProviderSettings,
  saveApiProviderSettings,
} from '../../src/features/provider-settings/services/apiProviderSettingsClient.ts';
import type { ApiProviderSettings } from '../../src/features/provider-settings/types/providerSettings.types';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  thirdPartyConfig: {
    enabled: boolean;
    baseUrl: string;
    apiKey: string;
    model: string;
    chatModel?: string;
  };
  onThirdPartyConfigChange: (config: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isOpen,
  onClose,
  thirdPartyConfig,
}) => {
  const { themeName, setTheme, allThemes, isDark } = useTheme();

  const C = {
    bg: isDark ? '#0a0a0a' : '#f8fafc',
    card: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#e5e5e5' : '#1e293b',
    textDim: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    accent: '#3b82f6',
    accentBg: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
    inputBg: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
  };

  const [tab, setTab] = useState<'api' | 'runninghub' | 'theme'>('api');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [apiProviderSettings, setApiProviderSettings] = useState<ApiProviderSettings>(EMPTY_API_PROVIDER_SETTINGS);
  const [apiProviderLoading, setApiProviderLoading] = useState(false);
  const [apiProviderSaving, setApiProviderSaving] = useState(false);
  const [apiProviderError, setApiProviderError] = useState<string | null>(null);

  const [rhConsumerKey, setRhConsumerKey] = useState('');
  const [rhEnterpriseKey, setRhEnterpriseKey] = useState('');
  const [showRHConsumer, setShowRHConsumer] = useState(false);
  const [showRHEnterprise, setShowRHEnterprise] = useState(false);
  const [rhSaveMsg, setRhSaveMsg] = useState<string | null>(null);

  const toast = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(null), 2000);
  };

  useEffect(() => {
    setApiProviderLoading(true);
    setApiProviderError(null);
    loadApiProviderSettings(thirdPartyConfig).then(async result => {
      setApiProviderSettings(result.settings);
      if (result.source === 'legacy' && result.settings.profiles.length > 0) {
        await saveApiProviderSettings(result.settings);
        window.dispatchEvent(new CustomEvent(API_PROVIDER_SETTINGS_CHANGED_EVENT));
      }
    }).catch(error => {
      setApiProviderError(error instanceof Error ? error.message : 'API 配置读取失败');
    }).finally(() => setApiProviderLoading(false));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    getRunningHubConfig().then(result => {
      if (result.success && result.data) {
        if (result.data.consumerConfigured) setRhConsumerKey('••••••••');
        if (result.data.enterpriseConfigured) setRhEnterpriseKey('••••••••');
      }
    }).catch(() => {});
  }, [isOpen]);

  const handleApiProviderSettingsChange = async (nextSettings: ApiProviderSettings) => {
    setApiProviderSettings(nextSettings);
    setApiProviderSaving(true);
    setApiProviderError(null);
    try {
      await saveApiProviderSettings(nextSettings);
      window.dispatchEvent(new CustomEvent(API_PROVIDER_SETTINGS_CHANGED_EVENT));
      toast('API 配置已保存');
    } catch (error) {
      setApiProviderError(error instanceof Error ? error.message : 'API 配置保存失败');
    } finally {
      setApiProviderSaving(false);
    }
  };

  const handleRHSave = async () => {
    try {
      const consumerToSend = rhConsumerKey === '••••••••' ? '' : rhConsumerKey.trim();
      const enterpriseToSend = rhEnterpriseKey === '••••••••' ? '' : rhEnterpriseKey.trim();
      const result = await saveRunningHubConfig(consumerToSend, enterpriseToSend);
      if (result.success) {
        setRhSaveMsg('RunningHub API 已保存');
        getRunningHubConfig().then(next => {
          if (next.success && next.data) {
            if (next.data.consumerConfigured) setRhConsumerKey('••••••••');
            if (next.data.enterpriseConfigured) setRhEnterpriseKey('••••••••');
          }
        }).catch(() => {});
      } else {
        setRhSaveMsg(result.error || '保存失败');
      }
    } catch {
      setRhSaveMsg('保存失败');
    }
    setTimeout(() => setRhSaveMsg(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.bg, color: C.text }}>
      <header className="shrink-0 flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-bold">设置</h1>
          <nav className="flex gap-1">
            {[
              { key: 'api' as const, label: 'API & 模型', icon: Plug },
              { key: 'runninghub' as const, label: 'RunningHub', icon: KeyRound },
              { key: 'theme' as const, label: '主题', icon: Palette },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                  style={{
                    background: tab === item.key ? C.accentBg : 'transparent',
                    color: tab === item.key ? C.accent : C.textDim,
                  }}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
          {saveMsg && (
            <div className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-pulse" style={{ background: C.accentBg, color: C.accent }}>
              <Check size={16} /> {saveMsg}
            </div>
          )}

          {tab === 'api' && (
            <>
              <ApiProviderProfilesPanel
                settings={apiProviderSettings}
                colors={C}
                isDark={isDark}
                isLoading={apiProviderLoading}
                isSaving={apiProviderSaving}
                onChange={handleApiProviderSettingsChange}
              />

              {apiProviderError && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                  {apiProviderError}
                </div>
              )}

              <ApiProviderModelProfilesPanel
                settings={apiProviderSettings}
                colors={C}
                isDark={isDark}
                isSaving={apiProviderSaving}
                onChange={handleApiProviderSettingsChange}
                onToast={toast}
              />
            </>
          )}

          {tab === 'runninghub' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <section className="rounded-2xl p-6 space-y-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div>
                  <h3 className="text-base font-bold">RunningHub API 配置</h3>
                  <p className="text-sm mt-0.5" style={{ color: C.textDim }}>画布工作流使用，支持消费级和企业级 Key。</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium flex items-center gap-2" style={{ color: C.textDim }}>
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
                      消费级 API Key
                      {rhConsumerKey === '••••••••' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">已保存</span>}
                    </span>
                    <div className="flex gap-3 mt-1.5">
                      <div className="flex-1 relative">
                        <input
                          type={showRHConsumer ? 'text' : 'password'}
                          value={rhConsumerKey}
                          onChange={event => setRhConsumerKey(event.target.value)}
                          placeholder="rh-..."
                          className="w-full px-4 py-3 pr-10 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
                          style={{ background: C.inputBg, borderColor: C.border, color: C.text }}
                        />
                        <button onClick={() => setShowRHConsumer(!showRHConsumer)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: C.textDim }}>
                          {showRHConsumer ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button onClick={handleRHSave} className="px-6 py-3 rounded-xl text-sm font-bold transition-colors" style={{ background: C.accent, color: 'white' }}>
                        保存
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium flex items-center gap-2" style={{ color: C.textDim }}>
                      <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
                      企业级 API Key
                      {rhEnterpriseKey === '••••••••' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">已保存</span>}
                    </span>
                    <div className="flex gap-3 mt-1.5">
                      <div className="flex-1 relative">
                        <input
                          type={showRHEnterprise ? 'text' : 'password'}
                          value={rhEnterpriseKey}
                          onChange={event => setRhEnterpriseKey(event.target.value)}
                          placeholder="rh-ent-..."
                          className="w-full px-4 py-3 pr-10 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
                          style={{ background: C.inputBg, borderColor: C.border, color: C.text }}
                        />
                        <button onClick={() => setShowRHEnterprise(!showRHEnterprise)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: C.textDim }}>
                          {showRHEnterprise ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button onClick={handleRHSave} className="px-6 py-3 rounded-xl text-sm font-bold transition-colors" style={{ background: C.accent, color: 'white' }}>
                        保存
                      </button>
                    </div>
                  </label>
                </div>

                {rhSaveMsg && (
                  <div className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: C.accentBg, color: C.accent }}>
                    <Check size={16} /> {rhSaveMsg}
                  </div>
                )}

                <a href="https://www.runninghub.cn/?inviteCode=4d1da98c" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm hover:underline" style={{ color: C.accent }}>
                  <Sparkles size={14} /> 还没有 Key？点击注册 RunningHub
                </a>
              </section>
            </div>
          )}

          {tab === 'theme' && (
            <section className="rounded-2xl p-6 space-y-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div>
                <h3 className="text-base font-bold">界面主题</h3>
                <p className="text-sm mt-0.5" style={{ color: C.textDim }}>选择深色或浅色模式，立即生效。</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {allThemes.map(theme => {
                  const isActive = themeName === theme.name;
                  return (
                    <button
                      key={theme.name}
                      onClick={() => setTheme(theme.name)}
                      className="p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02]"
                      style={{
                        borderColor: isActive ? C.accent : C.border,
                        background: isActive ? C.accentBg : C.card,
                      }}
                    >
                      <div className="text-base font-bold" style={{ color: C.text }}>{theme.name === 'dark' ? '深色模式' : '浅色模式'}</div>
                      <div className="text-sm mt-1" style={{ color: C.textDim }}>{theme.name === 'dark' ? '护眼舒适，适合夜间使用' : '清爽明亮，适合白天使用'}</div>
                      {isActive && <div className="mt-3 text-sm font-bold" style={{ color: C.accent }}>当前使用</div>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
