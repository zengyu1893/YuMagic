import React from 'react';
import { PlusCircle as PlusCircleIcon, Lightbulb as LightbulbIcon, XCircle as XCircleIcon } from 'lucide-react';
import { BPField, BPFieldType } from '../types';

interface BpConfigPanelProps {
  bpFields: BPField[];
  onAddField: (type: BPFieldType) => void;
  onRemoveField: (id: string) => void;
  onFieldChange: (id: string, field: keyof BPField, value: any) => void;
  onAgentConfigChange: (id: string, key: 'instruction' | 'model', value: string) => void;
}

export const BpConfigPanel: React.FC<BpConfigPanelProps> = ({
  bpFields,
  onAddField,
  onRemoveField,
  onFieldChange,
  onAgentConfigChange,
}) => (
  <div
    className="p-4 rounded-xl"
    style={{
      backgroundColor: 'rgba(238,209,109,0.08)',
      border: '1px solid rgba(238,209,109,0.25)',
    }}
  >
    <div className="flex justify-between items-center mb-3">
      <span className="text-xs font-medium" style={{ color: '#eed16d' }}>
        BP 变量配置
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onAddField('input')}
          className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
          style={{ backgroundColor: 'rgba(238,209,109,0.2)', color: '#eed16d' }}
        >
          <PlusCircleIcon className="w-3 h-3" /> 手动变量
        </button>
        <button
          onClick={() => onAddField('agent')}
          className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
          style={{ backgroundColor: 'rgba(238,209,109,0.15)', color: '#eed16d' }}
        >
          <LightbulbIcon className="w-3 h-3" /> 智能体变量
        </button>
      </div>
    </div>

    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
      {bpFields.map((v) => (
        <div
          key={v.id}
          className={`p-2.5 rounded-lg border ${
            v.type === 'agent' ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-900/10 border-blue-800/30'
          }`}
        >
          <div className="flex gap-2 items-center">
            <div className="relative flex items-center shrink-0">
              <span
                className={`absolute left-2 text-xs font-mono ${v.type === 'agent' ? 'text-blue-400' : 'text-blue-500'}`}
              >
                {v.type === 'agent' ? '{' : '/'}
              </span>
              <input
                value={v.name}
                onChange={(e) => onFieldChange(v.id, 'name', e.target.value)}
                className={`w-20 pl-4 pr-2 py-1 bg-transparent border rounded text-[11px] text-zinc-200 outline-none font-mono ${
                  v.type === 'agent' ? 'border-blue-600 focus:border-blue-400' : 'border-blue-700 focus:border-blue-500'
                }`}
                placeholder="name"
              />
              <span
                className={`absolute right-2 text-xs font-mono ${
                  v.type === 'agent' ? 'text-blue-400' : 'text-transparent'
                }`}
              >
                {v.type === 'agent' ? '}' : ''}
              </span>
            </div>
            <input
              value={v.label}
              onChange={(e) => onFieldChange(v.id, 'label', e.target.value)}
              className="flex-grow py-1 px-2 bg-transparent border border-gray-700 rounded text-[11px] text-zinc-200 focus:border-gray-500 outline-none"
              placeholder="显示标签"
            />
            <button onClick={() => onRemoveField(v.id)} className="text-gray-500 hover:text-gray-400 p-0.5">
              <XCircleIcon className="w-4 h-4" />
            </button>
          </div>
          {v.type === 'agent' && v.agentConfig && (
            <div className="mt-2 pt-2 border-t border-blue-500/20">
              <textarea
                value={v.agentConfig.instruction}
                onChange={(e) => onAgentConfigChange(v.id, 'instruction', e.target.value)}
                className="w-full bg-transparent text-[11px] text-zinc-200 border border-blue-900/50 rounded-lg p-2 h-12 resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="给智能体的指令..."
              />
            </div>
          )}
        </div>
      ))}
      {bpFields.length === 0 && (
        <p className="text-[11px] text-gray-500 text-center py-3">
          添加变量后，在提示词中使用 /name 或 {'{name}'} 引用
        </p>
      )}
    </div>
  </div>
);
