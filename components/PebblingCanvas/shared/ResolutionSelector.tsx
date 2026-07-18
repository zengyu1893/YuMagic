import React from 'react';

export const DEFAULT_RESOLUTIONS = ['1K', '2K', '4K'] as const;

interface ResolutionSelectorProps {
  options: readonly string[];
  selected: string;
  onChange: (resolution: string) => void;
  /** Tailwind bg class for the control container */
  controlBg: string;
  /** Tailwind classes for the selected button */
  selectedClass: string;
  /** Optional text size override */
  textSize?: string;
  /** Optional extra classes */
  className?: string;
  /** Optional visible label for compact node parameter panels */
  label?: string;
}

/**
 * Single-row resolution button selector shared across BP, Idea, Edit, and Upscale nodes.
 */
export const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  options,
  selected,
  onChange,
  controlBg,
  selectedClass,
  textSize = 'text-[10px]',
  className = '',
  label,
}) => {
  const btnBase = `flex-1 px-2 py-1 ${textSize} font-medium rounded-md transition-all`;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="px-0.5 text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
      )}
      <div className={`flex ${controlBg} rounded-lg p-0.5`}>
        {options.map((r) => (
          <button
            key={r}
            className={`${btnBase} ${selected === r ? selectedClass : 'text-zinc-500 hover:text-zinc-300'}`}
            onClick={() => onChange(r)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
};
