import React from 'react';

interface SpinnerOverlayProps {
  /** Display text below the spinner. Omit for spinner-only mode. */
  message?: string;
  /** Spinner size: 'sm' = w-6 h-6, 'lg' = w-8 h-8. Default 'sm'. */
  size?: 'sm' | 'lg';
  /** Tailwind border-color classes for the spinner, e.g. "border-blue-400/50 border-t-blue-400". Default white. */
  colorClass?: string;
  /** When true, uses a light semi-transparent overlay instead of dark. */
  isLightCanvas?: boolean;
  /** Override the background style entirely. Use sparingly. */
  bgOverride?: string;
  /** Extra z-index. Default 'z-10'. */
  zIndex?: string;
}

/**
 * Running/generating spinner overlay. Replaces 15 duplicated instances across CanvasNode.tsx.
 *
 * Patterns covered:
 * - Small spinner, no text (size="sm", no message)
 * - Large spinner, no text (size="lg", no message)
 * - Large spinner + text (size="lg", message="正在执行...")
 * - Custom message (message="视频生成中...", bgOverride="bg-black/70")
 */
export const SpinnerOverlay: React.FC<SpinnerOverlayProps> = ({
  message,
  size = 'sm',
  colorClass = 'border-white/50 border-t-white',
  isLightCanvas = false,
  bgOverride,
  zIndex = 'z-10',
}) => {
  const spinnerSize = size === 'lg' ? 'w-8 h-8 border-2' : 'w-6 h-6 border-2';
  const defaultBg = isLightCanvas
    ? 'rgba(255,255,255,0.7)'
    : size === 'lg' && !message
      ? 'rgba(0,0,0,0.6)'
      : 'rgba(0,0,0,0.5)';
  const blur = size === 'lg' ? 'backdrop-blur-[2px]' : 'backdrop-blur-[1px]';

  return (
    <div
      className={`absolute inset-0 ${blur} flex ${message ? 'flex-col' : ''} items-center justify-center ${zIndex}`}
      style={{ backgroundColor: bgOverride ? undefined : defaultBg }}
    >
      {bgOverride ? (
        <div className={`absolute inset-0 ${bgOverride}`} />
      ) : null}
      <div className={`${spinnerSize} ${colorClass} rounded-full animate-spin relative ${bgOverride ? 'z-10' : ''}`} />
      {message && (
        <span
          className={`text-[10px] mt-2 relative ${bgOverride ? 'z-10' : ''}`}
          style={{ color: isLightCanvas ? '#059669' : '#6ee7b7' }}
        >
          {message}
        </span>
      )}
    </div>
  );
};
