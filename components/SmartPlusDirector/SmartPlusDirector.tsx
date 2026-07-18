import React from 'react';
import { Lightbulb as LightbulbIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { SmartPlusConfig } from '../../types';

interface SmartPlusDirectorProps {
  config: SmartPlusConfig;
  onConfigChange: (config: SmartPlusConfig) => void;
  templateConfig?: SmartPlusConfig;
}

export const SmartPlusDirector: React.FC<SmartPlusDirectorProps> = ({ config, onConfigChange, templateConfig }) => {
  const { themeName } = useTheme();
  const isDark = themeName !== 'light';

  const handleConfigChange = (id: number, field: 'enabled' | 'features', value: boolean | string) => {
    onConfigChange(config.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const visibleComponents = config.filter(component => {
    const templateComponent = templateConfig?.find(t => t.id === component.id);
    return templateComponent?.enabled;
  });

  if (visibleComponents.length === 0) return null;

  return (
    <div className="p-3 rounded-xl"
      style={{
        background: isDark ? 'linear-gradient(135deg, rgba(20,184,166,0.08) 0%, rgba(20,184,166,0.04) 100%)' : 'rgba(20,184,166,0.06)',
        border: `1px solid ${isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.1)'}`,
      }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <LightbulbIcon className="w-3 h-3 text-blue-400" />
        </div>
        <h3 className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#0f172a' }}>导演模式</h3>
      </div>
      <div className="space-y-3">
        {visibleComponents.map(component => (
          <div key={component.id} className="flex items-start gap-2">
            <label className="relative inline-flex items-center cursor-pointer pt-0.5" htmlFor={`smart-plus-override-${component.id}`}>
              <input type="checkbox" id={`smart-plus-override-${component.id}`} className="sr-only peer"
                checked={component.enabled} onChange={(e) => handleConfigChange(component.id, 'enabled', e.target.checked)} />
              <div className="w-7 h-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 transition-colors"
                style={{ background: isDark ? '#374151' : '#d1d5db' }} />
            </label>
            <div className="flex-grow">
              <label htmlFor={`smart-plus-override-${component.id}-features`} className="text-[10px] font-medium mb-1 block"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{component.label}</label>
              <textarea id={`smart-plus-override-${component.id}-features`} value={component.features}
                onChange={(e) => handleConfigChange(component.id, 'features', e.target.value)}
                className="w-full text-xs p-2 rounded-lg resize-none transition-all"
                style={{ background: 'transparent',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  color: isDark ? '#e4e4e7' : '#1f2937' }}
                placeholder={component.enabled ? '描述...' : '自动'} disabled={!component.enabled} rows={2} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
