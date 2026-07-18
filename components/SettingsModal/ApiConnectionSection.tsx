import React from 'react';
import { Check, ExternalLink, Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-react';
import { YULI_RECOMMENDED_APIS, YULI_RECOMMENDED_BASE_URLS } from '../../src/features/provider-settings/config/apiProviderTemplates';
import { styles } from './styles';
import type { ApiMode } from './types';

interface ApiConnectionSectionProps {
  activeMode: ApiMode;
  localThirdPartyUrl: string;
  localThirdPartyKey: string;
  showApiKey: boolean;
  onModeChange: (mode: ApiMode) => void;
  onUrlChange: (url: string) => void;
  onKeyChange: (key: string) => void;
  onToggleShowKey: () => void;
  onSave: () => void;
}

export const ApiConnectionSection: React.FC<ApiConnectionSectionProps> = ({
  activeMode,
  localThirdPartyUrl,
  localThirdPartyKey,
  showApiKey,
  onModeChange,
  onUrlChange,
  onKeyChange,
  onToggleShowKey,
  onSave,
}) => (
  <div>
    <div className="section-title">API CONNECTION</div>
    {/* 玉玉 API */}
    <div
      onClick={() => onModeChange('local-thirdparty')}
      className="option-card"
      style={{
        borderColor: activeMode === 'local-thirdparty' ? 'rgba(59, 130, 246, 0.5)' : styles.border,
        background: activeMode === 'local-thirdparty' ? styles.cardBgActive : styles.cardBg,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="option-icon" style={{ background: `linear-gradient(135deg, ${styles.primary}, ${styles.primaryDark})` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2v6m0 8v6m-6-9H2m20 0h-4m-2.5-6.5L13 9m-2 6l-2.5 2.5m11-11L17 9m-2 6l2.5 2.5"/>
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: styles.textPrimary }}>玉玉 API</div>
          <div className="text-xs" style={{ color: styles.textSecondary }}>支持 gpt-image、flux 等模型</div>
        </div>
        <div className="option-check" style={{ opacity: activeMode === 'local-thirdparty' ? 1 : 0 }}>
          <Check className="w-3 h-3 text-white" />
        </div>
      </div>
      {activeMode === 'local-thirdparty' && (
        <div className="form-area" onClick={e => e.stopPropagation()}>
          <div className="form-group">
            <label className="form-label">API 地址</label>
            <input type="text" className="form-input" value={localThirdPartyUrl}
              onChange={(e) => onUrlChange(e.target.value)} placeholder="https://yuli.host" />
            <div className="mt-2 flex flex-wrap gap-2">
              {YULI_RECOMMENDED_BASE_URLS.map(url => {
                const recommendedApi = YULI_RECOMMENDED_APIS.find(api => api.baseUrl === url);
                return (
                  <div key={url} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUrlChange(url)}
                      className="px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors"
                      style={{
                        borderColor: localThirdPartyUrl === url ? styles.primary : styles.border,
                        color: localThirdPartyUrl === url ? styles.primaryLight : styles.textSecondary,
                        background: localThirdPartyUrl === url ? 'rgba(59, 130, 246, 0.12)' : styles.cardBg,
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
                        className="inline-flex items-center gap-1 text-[11px] hover:underline"
                        style={{ color: styles.primaryLight }}
                      >
                        <ExternalLink className="w-3 h-3" /> 获取 Key
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">API Key</label>
            <div className="input-with-btn">
              <input type={showApiKey ? 'text' : 'password'} className="form-input"
                value={localThirdPartyKey} onChange={(e) => onKeyChange(e.target.value)} placeholder="sk-..." />
              <button className="input-btn" onClick={onToggleShowKey}>
                {showApiKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary min-w-32" onClick={onSave}>保存配置</button>
          </div>
        </div>
      )}
    </div>
  </div>
);
