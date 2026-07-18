import React from 'react';
import { styles } from './styles';
import { storyLibrary } from '../../services/storyLibrary';

interface StoryThemeSelectorProps {
  value: string;
  onChange: (themeId: string) => void;
}

export const StoryThemeSelector: React.FC<StoryThemeSelectorProps> = ({ value, onChange }) => (
  <div className="config-card">
    <div className="flex items-center gap-3 mb-3">
      <div className="option-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <span className="text-lg">🎭</span>
      </div>
      <div>
        <h4 className="text-sm font-semibold" style={{ color: styles.textPrimary }}>生成等待故事主题</h4>
        <p className="text-xs" style={{ color: styles.textSecondary }}>AI 生成图片时显示的魔法等待动画主题</p>
      </div>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="form-input"
      style={{ cursor: 'pointer' }}
    >
      <option value="auto">🤖 自动匹配（根据提示词）</option>
      {storyLibrary.themes.map(t => (
        <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
      ))}
    </select>
  </div>
);
