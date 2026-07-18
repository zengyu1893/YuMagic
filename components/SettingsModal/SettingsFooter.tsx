import React from 'react';
import { styles } from './styles';

// 应用版本号
declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

interface SettingsFooterProps {
  onDone: () => void;
}

export const SettingsFooter: React.FC<SettingsFooterProps> = ({ onDone }) => (
  <div className="flex-shrink-0 px-6 py-4 border-t" style={{ borderColor: styles.borderLight, background: 'rgba(10, 10, 10, 0.95)' }}>
    <div className="mb-3 text-center">
      <span className="text-xs" style={{ color: styles.textMuted }}>v{APP_VERSION}</span>
    </div>
    <button onClick={onDone} className="btn btn-primary w-full py-3.5">完成</button>
  </div>
);
