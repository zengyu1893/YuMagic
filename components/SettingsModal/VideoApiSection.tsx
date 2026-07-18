import React from 'react';
import { Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-react';
import { styles } from './styles';
import type { SoraConfig } from '../../services/soraService';
import type { VeoConfig } from '../../services/veoService';

interface VideoApiSectionProps {
  soraConfig: SoraConfig;
  veoConfig: VeoConfig;
  showSoraKey: boolean;
  showVeoKey: boolean;
  onSoraConfigChange: (config: SoraConfig) => void;
  onVeoConfigChange: (config: VeoConfig) => void;
  onToggleSoraKey: () => void;
  onToggleVeoKey: () => void;
  onSaveSora: () => void;
  onSaveVeo: () => void;
}

export const VideoApiSection: React.FC<VideoApiSectionProps> = ({
  soraConfig, veoConfig, showSoraKey, showVeoKey,
  onSoraConfigChange, onVeoConfigChange, onToggleSoraKey, onToggleVeoKey,
  onSaveSora, onSaveVeo,
}) => (
  <div>
    <div className="section-title">VIDEO API</div>
    {/* Sora */}
    <div className="config-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="option-icon" style={{ background: `linear-gradient(135deg, ${styles.primary}, #1e40af)` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold" style={{ color: styles.textPrimary }}>Sora 视频生成</h4>
          <p className="text-xs" style={{ color: styles.textSecondary }}>OpenAI Sora API 或兼容服务</p>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">API 地址</label>
        <input type="text" className="form-input" value={soraConfig.baseUrl}
          onChange={(e) => onSoraConfigChange({ ...soraConfig, baseUrl: e.target.value })} placeholder="https://api.openai.com" />
      </div>
      <div className="form-group">
        <label className="form-label">Sora API Key</label>
        <div className="input-with-btn">
          <input type={showSoraKey ? 'text' : 'password'} className="form-input"
            value={soraConfig.apiKey} onChange={(e) => onSoraConfigChange({ ...soraConfig, apiKey: e.target.value })} placeholder="sk-..." />
          <button className="input-btn" onClick={onToggleSoraKey}>
            {showSoraKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <button className="btn btn-primary w-full" onClick={onSaveSora}>保存 Sora 配置</button>
    </div>

    {/* Veo */}
    <div className="config-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="option-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold" style={{ color: styles.textPrimary }}>Veo 3.1 视频生成</h4>
          <p className="text-xs" style={{ color: styles.textSecondary }}>Google Veo3.1 API，支持文生/图生</p>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">API 地址</label>
        <input type="text" className="form-input" value={veoConfig.baseUrl}
          onChange={(e) => onVeoConfigChange({ ...veoConfig, baseUrl: e.target.value })} placeholder="https://api.example.com" />
      </div>
      <div className="form-group">
        <label className="form-label">Veo API Key</label>
        <div className="input-with-btn">
          <input type={showVeoKey ? 'text' : 'password'} className="form-input"
            value={veoConfig.apiKey} onChange={(e) => onVeoConfigChange({ ...veoConfig, apiKey: e.target.value })} placeholder="sk-..." />
          <button className="input-btn" onClick={onToggleVeoKey}>
            {showVeoKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <button className="btn btn-primary w-full" onClick={onSaveVeo}>保存 Veo3.1 配置</button>
    </div>
  </div>
);
