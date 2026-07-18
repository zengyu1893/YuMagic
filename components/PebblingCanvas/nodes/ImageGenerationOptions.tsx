import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { ImageGenerationModeration, ImageGenerationQuality } from '../../../types/pebblingTypes';

const QUALITY_OPTIONS: ImageGenerationQuality[] = ['auto', 'low', 'medium', 'high'];

interface ImageGenerationOptionsProps {
  settings: Record<string, unknown>;
  onChange: (key: string, value: string) => void;
  controlBg: string;
  selectedClass: string;
  isLightCanvas: boolean;
}

const toQualityValue = (value: unknown): ImageGenerationQuality => {
  return QUALITY_OPTIONS.includes(value as ImageGenerationQuality)
    ? value as ImageGenerationQuality
    : 'auto';
};

const toModerationValue = (value: unknown): ImageGenerationModeration => {
  return value === 'low' ? 'low' : 'auto';
};

export const ImageGenerationOptions = React.memo(function ImageGenerationOptions({
  settings,
  onChange,
  controlBg,
  selectedClass,
  isLightCanvas,
}: ImageGenerationOptionsProps) {
  const quality = toQualityValue(settings.quality);
  const moderation = toModerationValue(settings.moderation);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const showAdvanced = advancedOpen || settings.moderation === 'low';

  return (
    <div className="space-y-1.5">
      <div className="px-0.5 text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
        画质
      </div>
      <div className={`grid grid-cols-4 gap-0.5 ${controlBg} rounded-lg p-0.5`}>
        {QUALITY_OPTIONS.map(option => (
          <button
            key={option}
            type="button"
            className={`px-1 py-1 text-[9px] font-medium rounded-md transition-all ${
              quality === option ? selectedClass : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => onChange('quality', option)}
            onMouseDown={(event) => event.stopPropagation()}
            title={`图片画质: ${option}`}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen(!advancedOpen)}
        onMouseDown={(event) => event.stopPropagation()}
        className={`w-full flex items-center justify-between rounded-lg px-2 py-1 text-[9px] border ${
          isLightCanvas
            ? 'bg-white text-gray-500 border-gray-200 hover:text-gray-700'
            : 'bg-zinc-800 text-zinc-500 border-white/10 hover:text-zinc-300'
        }`}
      >
        <span className="flex items-center gap-1">
          <SlidersHorizontal size={10} />
          高级参数
        </span>
        <ChevronDown size={10} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {showAdvanced && (
        <label className="block space-y-1">
          <span className="px-0.5 text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
            审核
          </span>
          <select
            value={moderation}
            onChange={(event) => onChange('moderation', event.target.value)}
            onMouseDown={(event) => event.stopPropagation()}
            className={`w-full rounded-lg px-2 py-1 text-[9px] outline-none border ${
              isLightCanvas
                ? 'bg-white text-gray-700 border-gray-200'
                : 'bg-zinc-800 text-zinc-200 border-white/10'
            }`}
          >
            <option value="auto">auto - 默认审核级别</option>
            <option value="low">low - 限制较少的过滤</option>
          </select>
        </label>
      )}
    </div>
  );
});
