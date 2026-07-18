import React, { useState, useEffect } from 'react';
import { Check, X, Folder as FolderIcon, ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getRunningHubConfig, saveRunningHubConfig } from '../../services/api/runninghub';
import { styles } from './styles';
import './SettingsModal.css';
import type { SettingsModalProps, ApiMode } from './types';
import { ApiConnectionSection } from './ApiConnectionSection';
import { RunningHubSection } from './RunningHubSection';
import { ThemeSelector } from './ThemeSelector';
import { StoryThemeSelector } from './StoryThemeSelector';
import { SettingsFooter } from './SettingsFooter';
import { getStoryThemePreference, setStoryThemePreference } from '../../services/storyThemeService';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, thirdPartyConfig, onThirdPartyConfigChange,
  geminiApiKey, onGeminiApiKeySave,
}) => {
  const { themeName, setTheme, allThemes } = useTheme();
  const activeMode: ApiMode = thirdPartyConfig.enabled ? 'local-thirdparty' : 'local-gemini';

  const [localThirdPartyUrl, setLocalThirdPartyUrl] = useState(thirdPartyConfig.baseUrl || 'https://yuli.host');
  const [localThirdPartyKey, setLocalThirdPartyKey] = useState(thirdPartyConfig.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  // 存储路径
  const [storagePath, setStoragePath] = useState<string>('');
  const [isCustomPath, setIsCustomPath] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // RunningHub
  const [runningHubConsumerKey, setRunningHubConsumerKey] = useState('');
  const [runningHubEnterpriseKey, setRunningHubEnterpriseKey] = useState('');
  const [showRHConsumerKey, setShowRHConsumerKey] = useState(false);
  const [showRHEnterpriseKey, setShowRHEnterpriseKey] = useState(false);
  const [storyTheme, setStoryTheme] = useState('auto');

  // Sync external props
  useEffect(() => {
    setLocalThirdPartyUrl(thirdPartyConfig.baseUrl || 'https://yuli.host');
    setLocalThirdPartyKey(thirdPartyConfig.apiKey || '');
  }, [thirdPartyConfig.baseUrl, thirdPartyConfig.apiKey]);

  // Load configs on open
  useEffect(() => {
    if (isOpen) {
      getRunningHubConfig().then(result => {
        if (result.success && result.data) {
          if (result.data.consumerConfigured) setRunningHubConsumerKey('••••••••');
          if (result.data.enterpriseConfigured) setRunningHubEnterpriseKey('••••••••');
        }
      }).catch(() => {});
      setStoryTheme(getStoryThemePreference());
      if (isElectron) {
        (window as any).electronAPI.getStoragePath().then((r: any) => {
          setStoragePath(r.currentPath);
          setIsCustomPath(r.isCustom);
        });
      }
    }
  }, [isOpen, isElectron]);

  if (!isOpen) return null;

  // --- handlers ---
  const showToast = (msg: string, ms = 2000) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(null), ms);
  };

  const handleModeChange = (mode: ApiMode) => {
    onThirdPartyConfigChange({ ...thirdPartyConfig, enabled: mode === 'local-thirdparty' });
  };

  const handleSaveLocalThirdParty = () => {
    onThirdPartyConfigChange({ ...thirdPartyConfig, enabled: true, apiKey: localThirdPartyKey, baseUrl: localThirdPartyUrl });
    showToast('玉玉 API 配置已保存');
  };

  const handleSaveRunningHubConfig = async () => {
    try {
      const consumerToSend = runningHubConsumerKey === '••••••••' ? '' : runningHubConsumerKey.trim();
      const enterpriseToSend = runningHubEnterpriseKey === '••••••••' ? '' : runningHubEnterpriseKey.trim();
      const result = await saveRunningHubConfig(consumerToSend, enterpriseToSend);
      if (result.success) {
        showToast('RunningHub API 已保存');
        getRunningHubConfig().then(r => {
          if (r.success && r.data) {
            if (r.data.consumerConfigured) setRunningHubConsumerKey('••••••••');
            if (r.data.enterpriseConfigured) setRunningHubEnterpriseKey('••••••••');
          }
        }).catch(() => {});
      } else { showToast(result.error || '保存失败'); }
    } catch { showToast('保存失败'); }
  };

  const handleSelectStoragePath = async () => {
    if (!isElectron) return;
    const result = await (window as any).electronAPI.selectStoragePath();
    if (!result.success) return;
    const shouldMigrate = window.confirm(`是否将现有数据迁移到新位置？\n\n新路径: ${result.path}\n\n点击"确定"迁移数据，点击"取消"仅设置新路径（新数据将存储在新位置）`);
    if (shouldMigrate) {
      setIsMigrating(true);
      const mr = await (window as any).electronAPI.migrateData(result.path);
      setIsMigrating(false);
      if (mr.success) { setStoragePath(result.path); setIsCustomPath(true); }
      showToast(mr.message, 3000);
    } else {
      const sr = await (window as any).electronAPI.setStoragePath(result.path);
      if (sr.success) { setStoragePath(result.path); setIsCustomPath(true); showToast(sr.message, 3000); }
    }
  };

  const handleResetStoragePath = async () => {
    if (!isElectron) return;
    const result = await (window as any).electronAPI.setStoragePath(null);
    if (result.success) {
      const info = await (window as any).electronAPI.getStoragePath();
      setStoragePath(info.defaultPath);
      setIsCustomPath(false);
      showToast('已恢复默认存储路径，重启后生效', 3000);
    }
  };

  const handleOpenStoragePath = () => {
    if (!isElectron) return;
    (window as any).electronAPI.openStoragePath();
  };

  // --- render ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="settings-modal relative w-full max-w-[480px] rounded-[20px] overflow-hidden animate-fade-in flex flex-col"
        style={{
          background: styles.modalBg, border: `1px solid ${styles.border}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)', maxHeight: '85vh'
        }}>
        {/* Toast */}
        {saveSuccessMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-sm font-medium rounded-lg shadow-lg animate-fade-in flex items-center gap-2"
            style={{ background: `linear-gradient(135deg, ${styles.primary}, ${styles.primaryDark})`, color: 'white' }}>
            <Check className="w-4 h-4" />{saveSuccessMessage}
          </div>
        )}
        {/* Close button */}
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center transition-all z-10"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <X className="w-4 h-4" style={{ color: styles.textSecondary }} />
        </button>
        {/* Header */}
        <div className="px-6 pt-6 pb-5 text-center border-b" style={{ borderColor: styles.borderLight }}>
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${styles.primary}, ${styles.primaryDark})` }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold" style={{ color: styles.textPrimary }}>设置</h2>
          <p className="text-sm mt-1" style={{ color: styles.textSecondary }}>配置 API 连接</p>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
          <ApiConnectionSection activeMode={activeMode} localThirdPartyUrl={localThirdPartyUrl}
            localThirdPartyKey={localThirdPartyKey} showApiKey={showApiKey}
            onModeChange={handleModeChange} onUrlChange={setLocalThirdPartyUrl}
            onKeyChange={setLocalThirdPartyKey} onToggleShowKey={() => setShowApiKey(!showApiKey)}
            onSave={handleSaveLocalThirdParty} />
          <RunningHubSection consumerKey={runningHubConsumerKey} enterpriseKey={runningHubEnterpriseKey}
            showConsumerKey={showRHConsumerKey} showEnterpriseKey={showRHEnterpriseKey}
            onConsumerKeyChange={setRunningHubConsumerKey} onEnterpriseKeyChange={setRunningHubEnterpriseKey}
            onToggleConsumerKey={() => setShowRHConsumerKey(!showRHConsumerKey)}
            onToggleEnterpriseKey={() => setShowRHEnterpriseKey(!showRHEnterpriseKey)}
            onSave={handleSaveRunningHubConfig} />
          {/* 系统设置 */}
          <div>
            <div className="section-title">系统设置</div>
            <ThemeSelector currentTheme={themeName} allThemes={allThemes} onThemeChange={setTheme} />
            <StoryThemeSelector value={storyTheme} onChange={(v) => { setStoryTheme(v); setStoryThemePreference(v); }} />
            {/* 数据存储位置 */}
            {isElectron && (
              <div className="config-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="option-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                      <FolderIcon className="w-5 h-5" style={{ color: styles.primaryLight }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium" style={{ color: styles.textPrimary }}>数据存储位置</h4>
                      <p className="text-xs" style={{ color: styles.textSecondary }}>{isCustomPath ? '自定义路径' : '默认路径'}</p>
                    </div>
                  </div>
                  <button onClick={handleOpenStoragePath}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: styles.primaryLight }} title="打开文件夹">
                    <ExternalLinkIcon className="w-3 h-3" />打开
                  </button>
                </div>
                <div className="text-xs px-3 py-2 rounded-lg mb-3 break-all"
                  style={{ background: styles.inputBg, color: styles.textSecondary, border: `1px solid ${styles.border}` }}>
                  {storagePath || '加载中...'}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSelectStoragePath} disabled={isMigrating}
                    className="btn btn-secondary flex-1 text-xs py-2">
                    {isMigrating ? '迁移中...' : '选择新位置'}
                  </button>
                  {isCustomPath && (
                    <button onClick={handleResetStoragePath} className="btn btn-secondary flex-1 text-xs py-2">恢复默认</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <SettingsFooter onDone={onClose} />
      </div>
    </div>
  );
};
