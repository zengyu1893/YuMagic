import React from 'react';
import { PlusCircle as PlusCircleIcon, XCircle as XCircleIcon } from 'lucide-react';
import { SmartPlusComponent } from '../types';

interface SmartPlusConfigPanelProps {
  config: SmartPlusComponent[];
  onComponentChange: (id: number, field: keyof Omit<SmartPlusComponent, 'id'>, value: boolean | string) => void;
  onAddComponent: () => void;
  onDeleteComponent: (id: number) => void;
}

export const SmartPlusConfigPanel: React.FC<SmartPlusConfigPanelProps> = ({
  config,
  onComponentChange,
  onAddComponent,
  onDeleteComponent,
}) => (
  <div className="p-4 bg-blue-500/5 border border-blue-700/30 rounded-xl">
    <div className="flex justify-between items-center mb-3">
      <span className="text-xs font-medium text-blue-400">Smart+ 导演模式配置</span>
      <button
        onClick={onAddComponent}
        className="text-[10px] flex items-center gap-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2 py-1 rounded-lg"
      >
        <PlusCircleIcon className="w-3 h-3" /> 添加组件
      </button>
    </div>
    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
      {config.map((component) => (
        <div key={component.id} className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={component.enabled}
              onChange={(e) => onComponentChange(component.id, 'enabled', e.target.checked)}
            />
            <div className="w-7 h-4 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
          <input
            type="text"
            value={component.label}
            onChange={(e) => onComponentChange(component.id, 'label', e.target.value)}
            className="w-20 px-2 py-1 text-[11px] font-medium text-zinc-200 bg-transparent border border-gray-700 rounded-lg focus:border-blue-500 outline-none"
          />
          <input
            type="text"
            value={component.features}
            onChange={(e) => onComponentChange(component.id, 'features', e.target.value)}
            className="flex-grow px-2 py-1 bg-transparent border border-gray-700 rounded-lg text-[11px] text-zinc-200 focus:border-blue-500 outline-none"
            placeholder="输入特征..."
            disabled={!component.enabled}
          />
          <button onClick={() => onDeleteComponent(component.id)} className="text-gray-500 hover:text-gray-400 p-0.5">
            <XCircleIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  </div>
);
