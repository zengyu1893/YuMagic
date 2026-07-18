import React from 'react';
import { Check } from 'lucide-react';
import { styles } from './styles';
import { themeIconMap, themePreviewColors } from './types';
import type { ThemeName } from '../../contexts/ThemeContext';

interface ThemeSelectorProps {
  currentTheme: ThemeName;
  allThemes: { name: ThemeName; displayName: string }[];
  onThemeChange: (name: ThemeName) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, allThemes, onThemeChange }) => (
  <div>
    <div className="section-title">THEME</div>
    <div className="grid grid-cols-2 gap-3">
      {allThemes.map((t) => {
        const ThemeIcon = themeIconMap[t.name];
        const previewColors = themePreviewColors[t.name];
        const isActive = currentTheme === t.name;
        return (
          <button key={t.name} onClick={() => onThemeChange(t.name)} className="option-card text-left"
            style={{
              borderColor: isActive ? 'rgba(59, 130, 246, 0.5)' : styles.border,
              background: isActive ? styles.cardBgActive : styles.cardBg,
            }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: isActive ? `linear-gradient(135deg, ${previewColors[0]}, ${previewColors[2]})` : 'rgba(255,255,255,0.06)' }}>
                <ThemeIcon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: styles.textPrimary }}>{t.displayName}</p>
                <div className="flex gap-1 mt-1.5">
                  {previewColors.map((color, i) => (
                    <div key={i} className="h-1.5 rounded-full flex-1" style={{ background: color, opacity: isActive ? 1 : 0.5 }} />
                  ))}
                </div>
              </div>
            </div>
            {isActive && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${styles.primary}, ${styles.primaryDark})` }}>
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
);
