import React from 'react';
import type { NodeRendererProps } from './NodeRendererProps';
import { SpinnerOverlay } from '../shared/SpinnerOverlay';

export const RemoveBgNode = React.memo(function RemoveBgNode(props: NodeRendererProps) {
  const { themeColors, localPrompt, setLocalPrompt, handleUpdate, inputBaseClass, showRunningIndicator } = props;

  return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden relative shadow-lg"
      style={{ backgroundColor: themeColors.nodeBg, border: `1px solid ${themeColors.nodeBorder}` }}>
      <div className="h-8 flex items-center px-3 gap-2"
        style={{ borderBottom: `1px solid ${themeColors.headerBorder}`, backgroundColor: themeColors.headerBg }}>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.textPrimary }}>Remove BG</span>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2 relative">
        <textarea className={inputBaseClass + " flex-1 resize-none"} placeholder="Instructions..."
          value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)}
          onBlur={handleUpdate} onMouseDown={(e) => e.stopPropagation()} />
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-white/10 rounded text-[8px] font-bold text-zinc-400 uppercase">IMG OUT</div>
      </div>
      {showRunningIndicator && <SpinnerOverlay size="sm" />}
    </div>
  );
});
