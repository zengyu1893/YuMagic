import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Library as LibraryIcon } from 'lucide-react';
import { CreativeCard } from './CreativeCard';
import type { VirtualizedCreativeGridProps } from './types';

// 虚拟化网格配置
const CARD_MIN_SIZE = 140;
const CARD_GAP = 12;
const GRID_PADDING = 12;

export const calculateGridDimensions = (containerWidth: number) => {
  if (containerWidth <= 0) return { columnCount: 1, cardSize: CARD_MIN_SIZE };
  const availableWidth = containerWidth - GRID_PADDING * 2;
  const columnCount = Math.max(1, Math.floor((availableWidth + CARD_GAP) / (CARD_MIN_SIZE + CARD_GAP)));
  const cardSize = Math.floor((availableWidth - (columnCount - 1) * CARD_GAP) / columnCount);
  return { columnCount, cardSize: Math.max(cardSize, CARD_MIN_SIZE) };
};

export const VirtualizedCreativeGrid: React.FC<VirtualizedCreativeGridProps> = ({
  ideas, selectedIds, isMultiSelectMode, sortBy, isLight, theme,
  searchTerm, filter, categoryFilter, onToggleSelect, onUse, onEdit,
  onDelete, onToggleFavorite, onExportSingle, dragItem, dragOverItem, onDragSort,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateWidth = () => setContainerWidth(container.clientWidth);
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const { columnCount, cardSize } = useMemo(() => calculateGridDimensions(containerWidth), [containerWidth]);
  const rowCount = Math.ceil(ideas.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => cardSize + CARD_GAP,
    overscan: 3,
  });

  if (ideas.length === 0) {
    return (
      <main ref={containerRef} className="flex-grow overflow-y-auto py-2 px-3">
        <div className="text-center flex flex-col items-center justify-center h-full">
          <LibraryIcon className="w-12 h-12 mb-3" style={{ color: theme.colors.textMuted }} />
          <h2 className="text-lg font-semibold" style={{ color: theme.colors.textSecondary }}>
            {searchTerm || filter !== 'all' || categoryFilter !== 'all' ? '未找到创意' : '创意库是空的'}
          </h2>
          <p className="mt-1 text-sm" style={{ color: theme.colors.textMuted }}>
            {searchTerm || filter !== 'all' || categoryFilter !== 'all'
              ? '请尝试其他关键词或筛选条件' : '点击 "新增" 来添加您的第一个灵感！'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main ref={containerRef} className="flex-grow overflow-auto min-h-0" style={{ padding: GRID_PADDING }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div key={virtualRow.key} style={{
            position: 'absolute', top: 0, left: 0, width: '100%',
            height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)`,
            display: 'flex', gap: CARD_GAP,
          }}>
            {Array.from({ length: columnCount }).map((_, colIndex) => {
              const index = virtualRow.index * columnCount + colIndex;
              if (index >= ideas.length) return null;
              const idea = ideas[index];
              return (
                <CreativeCard key={idea.id} idea={idea} isSelected={selectedIds.has(idea.id)}
                  isMultiSelectMode={isMultiSelectMode} sortBy={sortBy} isLight={isLight} theme={theme}
                  style={{ width: cardSize, height: cardSize }}
                  onToggleSelect={onToggleSelect} onUse={onUse} onEdit={onEdit} onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite} onExportSingle={onExportSingle}
                  dragItem={dragItem} dragOverItem={dragOverItem} onDragSort={onDragSort} />
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
};
