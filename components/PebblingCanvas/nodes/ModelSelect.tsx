import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export const ModelSelect = React.memo(function ModelSelect({
  models, value, onChange, colorClass, isLightCanvas: isLight = true,
}: {
  models: string[];
  value: string;
  onChange: (model: string) => void;
  colorClass: string;
  isLightCanvas?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        className={`w-full rounded px-1.5 py-0.5 text-[8px] cursor-pointer flex items-center justify-between gap-1 transition-colors ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-900' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onMouseDown={(e) => e.stopPropagation()}
        title={value || '选择模型'}
      >
        <span className="truncate">{value || '默认'}</span>
        <ChevronDown size={8} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute bottom-full left-0 mb-0.5 rounded shadow-lg z-50 max-h-40 overflow-y-auto border min-w-[120px] ${isLight ? 'bg-white border-gray-200' : 'bg-zinc-800 border-white/10'}`}>
          {models.map((m, i) => (
            <div
              key={i}
              className={`px-2 py-1 text-[8px] cursor-pointer transition-colors whitespace-nowrap ${m === value ? colorClass : (isLight ? 'text-black hover:bg-gray-100' : 'text-zinc-400 hover:bg-white/10')}`}
              onClick={(e) => { e.stopPropagation(); onChange(m); setIsOpen(false); }}
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
