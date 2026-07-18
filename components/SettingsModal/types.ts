import type { ThirdPartyApiConfig } from '../../types';
import type { ThemeName } from '../../contexts/ThemeContext';
import { Moon as MoonIcon, Sun as SunIcon } from 'lucide-react';

// 主题图标映射 - 只保留深夜和白天
export const themeIconMap: Record<ThemeName, React.FC<{ className?: string }>> = {
  dark: MoonIcon,
  light: SunIcon,
};

// 主题颜色预览 - 用于展示主题特色
export const themePreviewColors: Record<ThemeName, string[]> = {
  dark: ['#3b82f6', '#1a1a24', '#60a5fa'],
  light: ['#2563eb', '#ffffff', '#3b82f6'],
};

export type ApiMode = 'local-thirdparty' | 'local-gemini';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thirdPartyConfig: ThirdPartyApiConfig;
  onThirdPartyConfigChange: (config: ThirdPartyApiConfig) => void;
  geminiApiKey: string;
  onGeminiApiKeySave: (key: string) => void;
}
