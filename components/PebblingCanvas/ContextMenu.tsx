import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  options: { label: string; icon?: React.ReactNode; action: () => void; danger?: boolean }[];
  isLight?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, options, isLight }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] py-1.5 rounded-xl shadow-2xl border backdrop-blur-xl"
      style={{
        left: x,
        top: y,
        background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(18,18,26,0.95)',
        borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-0.5 px-1">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={(e) => {
                e.stopPropagation();
                opt.action();
                onClose();
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors
              ${opt.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : isLight
                  ? 'text-gray-700 hover:bg-black/5'
                  : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            {opt.icon && React.cloneElement(opt.icon as React.ReactElement<any>, { size: 14 })}
            {opt.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default ContextMenu;
