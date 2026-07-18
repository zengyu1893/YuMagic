import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ConfirmCloseDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmCloseDialog: React.FC<ConfirmCloseDialogProps> = ({ onCancel, onConfirm }) => {
  const { theme, themeName } = useTheme();
  const isLight = themeName === 'light';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-xl p-6 shadow-2xl border max-w-sm w-full mx-4 animate-scale-in"
        style={{
          background: theme.colors.bgPanel,
          borderColor: theme.colors.border,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: theme.colors.textPrimary }}>
              确认关闭
            </h3>
            <p className="text-sm mt-0.5" style={{ color: theme.colors.textMuted }}>
              未保存的内容将丢失
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
              color: theme.colors.textSecondary,
            }}
          >
            继续编辑
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
