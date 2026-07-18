import React from 'react';

export const ASPECT_RATIOS_ROW1 = ['AUTO', '1:1', '2:3', '3:2', '3:4', '4:3'] as const;
export const ASPECT_RATIOS_ROW2 = ['3:5', '5:3', '9:16', '16:9', '21:9'] as const;

interface AspectRatioSelectorProps {
  selected: string;
  onChange: (ratio: string) => void;
  /** Tailwind bg class for the control container, e.g. "bg-white/5" */
  controlBg: string;
  /** Tailwind classes for the selected button, e.g. "bg-blue-500/30 text-blue-200" */
  selectedClass: string;
  /** Optional extra classes for the container div */
  className?: string;
  /** Optional visible label for compact node parameter panels */
  label?: string;
  /** Optional override for row 1 ratios */
  ratios1?: readonly string[];
  /** Optional override for row 2 ratios */
  ratios2?: readonly string[];
}

/**
 * Two-row aspect ratio button grid shared across BP, Idea, Video, and Edit nodes.
 */
export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  selected,
  onChange,
  controlBg,
  selectedClass,
  className = '',
  label,
  ratios1 = ASPECT_RATIOS_ROW1,
  ratios2 = ASPECT_RATIOS_ROW2,
}) => {
  const btnBase = 'flex-1 px-1 py-1 text-[9px] font-medium rounded-md transition-all';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="px-0.5 text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
      )}
      {/* Row 1 */}
      <div className={`flex ${controlBg} rounded-lg p-0.5`}>
        {ratios1.map((r) => (
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
      {/* Row 2 */}
      <div className={`flex ${controlBg} rounded-lg p-0.5`}>
        {ratios2.map((r) => (
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
