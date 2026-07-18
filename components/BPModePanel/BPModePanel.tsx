import React from 'react';
import { Bolt as BoltIcon, Lightbulb as LightbulbIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { CreativeIdea } from '../../types';

interface BPModePanelProps {
  template: CreativeIdea;
  inputs: Record<string, string>;
  onInputChange: (id: string, value: string) => void;
}

export const BPModePanel: React.FC<BPModePanelProps> = ({ template, inputs, onInputChange }) => {
  const { themeName } = useTheme();
  const isDark = themeName !== 'light';

  const manualFields = template.bpFields?.filter(f => f.type === 'input') || [];
  const agentFields = template.bpFields?.filter(f => f.type === 'agent') || [];

  if (manualFields.length === 0 && agentFields.length === 0) return null;

  return (
    <div className="p-3 mb-3 rounded-xl"
      style={{
        background: isDark ? 'linear-gradient(135deg, rgba(238,209,109,0.12) 0%, rgba(238,209,109,0.06) 100%)' : 'rgba(238,209,109,0.1)',
        border: `1px solid ${isDark ? 'rgba(238,209,109,0.2)' : 'rgba(238,209,109,0.15)'}`,
      }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(238,209,109,0.25)' }}>
            <BoltIcon className="w-3 h-3" style={{ color: '#eed16d' }} />
          </div>
          <h3 className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#0f172a' }}>BP 模式</h3>
          {template.author && <span className="text-[10px] font-medium" style={{ color: '#eed16d' }}>@{template.author}</span>}
        </div>
        {agentFields.length > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-1"
            style={{ background: 'rgba(238,209,109,0.2)', color: '#eed16d' }}>
            <LightbulbIcon className="w-2.5 h-2.5" /> {agentFields.length}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {manualFields.length > 0 ? manualFields.map(v => (
          <div key={v.id}>
            <label className="text-[10px] font-medium mb-1 flex justify-between"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <span>{v.label}</span>
              <span className="text-[9px] font-mono" style={{ color: 'rgba(59,130,246,0.6)' }}>/{v.name}</span>
            </label>
            <input type="text" value={inputs[v.id] || ''} onChange={(e) => onInputChange(v.id, e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg transition-all"
              style={{ background: 'transparent',
                border: `1px solid ${isDark ? 'rgba(238,209,109,0.25)' : 'rgba(238,209,109,0.2)'}`,
                color: isDark ? '#e4e4e7' : '#1f2937' }}
              placeholder={`输入 ${v.label}...`} />
          </div>
        )) : (
          <p className="text-[10px] italic p-2 rounded text-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              color: isDark ? '#6b7280' : '#9ca3af' }}>
            仅含智能体，点击生成自动运行
          </p>
        )}
      </div>
    </div>
  );
};
