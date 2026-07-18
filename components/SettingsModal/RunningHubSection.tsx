import React from 'react';
import { Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-react';
import { styles } from './styles';

interface RunningHubSectionProps {
  consumerKey: string;
  enterpriseKey: string;
  showConsumerKey: boolean;
  showEnterpriseKey: boolean;
  onConsumerKeyChange: (key: string) => void;
  onEnterpriseKeyChange: (key: string) => void;
  onToggleConsumerKey: () => void;
  onToggleEnterpriseKey: () => void;
  onSave: () => void;
}

export const RunningHubSection: React.FC<RunningHubSectionProps> = ({
  consumerKey, enterpriseKey, showConsumerKey, showEnterpriseKey,
  onConsumerKeyChange, onEnterpriseKeyChange, onToggleConsumerKey, onToggleEnterpriseKey, onSave,
}) => (
  <div className="option-card" style={{ borderColor: styles.border, background: styles.cardBg }}>
    <div className="flex items-center gap-3 mb-4">
      <div className="option-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: styles.textPrimary }}>RunningHub API</div>
        <div className="text-xs" style={{ color: styles.textSecondary }}>画布工作流 · 支持消费级和企业级两种 Key</div>
      </div>
    </div>
    <div className="form-group">
      <label className="form-label flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />消费级 API Key
        {consumerKey === '••••••••' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">已保存</span>}
      </label>
      <div className="input-with-btn">
        <input type={showConsumerKey ? 'text' : 'password'} className="form-input"
          value={consumerKey} onChange={(e) => onConsumerKeyChange(e.target.value)} placeholder="rh-..." />
        <button className="input-btn" onClick={onToggleConsumerKey}>
          {showConsumerKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
    <div className="form-group">
      <label className="form-label flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1.5" />企业级 API Key
        {enterpriseKey === '••••••••' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">已保存</span>}
      </label>
      <div className="input-with-btn">
        <input type={showEnterpriseKey ? 'text' : 'password'} className="form-input"
          value={enterpriseKey} onChange={(e) => onEnterpriseKeyChange(e.target.value)} placeholder="rh-ent-..." />
        <button className="input-btn" onClick={onToggleEnterpriseKey}>
          {showEnterpriseKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
    <button className="btn btn-primary w-full" onClick={onSave}>保存 RunningHub 配置</button>
  </div>
);
