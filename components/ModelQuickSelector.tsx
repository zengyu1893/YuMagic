import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Image as ImageIcon, MessageSquareText } from 'lucide-react';
import { useModelContext } from '../contexts/ModelContext';
import { useTheme } from '../contexts/ThemeContext';

type ModelKind = 'image' | 'chat';

export const ModelQuickSelector: React.FC = () => {
  const { isDark } = useTheme();
  const {
    imageModels,
    chatModels,
    activeImageModel,
    activeChatModel,
    setActiveImageModel,
    setActiveChatModel,
  } = useModelContext();

  const [openKind, setOpenKind] = useState<ModelKind | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenKind(null);
      }
    };

    if (openKind) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openKind]);

  const renderModelRow = (
    kind: ModelKind,
    label: string,
    currentModel: string,
    models: string[],
    onSelect: (model: string) => void,
    icon: React.ReactNode,
  ) => {
    const isOpen = openKind === kind;

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenKind(isOpen ? null : kind)}
          className="w-full flex items-center justify-between gap-2 text-left py-1"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)' }}
            >
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-medium" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                {label}
              </span>
              <p className="text-xs font-semibold truncate" style={{ color: isDark ? '#e5e5e5' : '#1f2937' }}>
                {currentModel || '未选择模型'}
              </p>
            </div>
          </div>
          <ChevronDown
            size={14}
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: isDark ? '#737373' : '#9ca3af' }}
          />
        </button>

        {isOpen && (
          <div
            className="absolute left-0 right-0 mt-1 rounded-xl border shadow-xl z-50 overflow-hidden"
            style={{
              background: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}
          >
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
              {models.length === 0 && (
                <p className="text-[10px] text-center py-3" style={{ color: isDark ? '#737373' : '#9ca3af' }}>
                  请在设置中为当前渠道选择模型
                </p>
              )}
              {models.map(model => (
                <button
                  type="button"
                  key={model}
                  onClick={() => {
                    onSelect(model);
                    setOpenKind(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    model === currentModel ? 'font-semibold' : ''
                  }`}
                  style={{
                    background: model === currentModel
                      ? (isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)')
                      : 'transparent',
                    color: model === currentModel
                      ? '#60a5fa'
                      : (isDark ? '#a3a3a3' : '#4b5563'),
                  }}
                >
                  <span className="truncate">{model}</span>
                  {model === currentModel && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 shrink-0 ml-2">
                      当前
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={ref} className="relative space-y-2" onClick={event => event.stopPropagation()}>
      {renderModelRow(
        'image',
        '图像模型',
        activeImageModel,
        imageModels,
        setActiveImageModel,
        <ImageIcon size={13} style={{ color: isDark ? '#93c5fd' : '#2563eb' }} />,
      )}
      {renderModelRow(
        'chat',
        '分析模型',
        activeChatModel,
        chatModels,
        setActiveChatModel,
        <MessageSquareText size={13} style={{ color: isDark ? '#a7f3d0' : '#059669' }} />,
      )}
    </div>
  );
};

export default ModelQuickSelector;
