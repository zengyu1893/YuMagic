import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GenerationHistory, DesktopImageItem, DesktopPosition } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Clock as ClockIcon, Video as VideoIcon } from 'lucide-react';
import { createDesktopItemFromHistory } from './Desktop';
import { normalizeImageUrl } from '../utils/image';
import { isVideoUrl, formatTime, PLACEHOLDER_IMAGE } from '../utils/media';

interface HistoryDockProps {
  history: GenerationHistory[];
  onDragToDesktop: (item: DesktopImageItem) => void;
  onPreview: (item: GenerationHistory) => void;
}

export const HistoryDock: React.FC<HistoryDockProps> = ({
  history,
  onDragToDesktop,
  onPreview,
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragItem, setDragItem] = useState<GenerationHistory | null>(null);
  const [dragPos, setDragPos] = useState<DesktopPosition | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);


  // 处理拖拽开始
  const handleDragStart = (e: React.MouseEvent, item: GenerationHistory) => {
    e.preventDefault();
    setIsDragging(true);
    setDragItem(item);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  // 处理拖拽移动和结束
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragItem && dragPos) {
        // 检查是否拖到了桌面区域（通过检查是否在 dock 之外）
        const dockRect = containerRef.current?.getBoundingClientRect();
        if (dockRect && e.clientY < dockRect.top - 50) {
          // 创建桌面项目
          const desktopItem = createDesktopItemFromHistory(dragItem, {
            x: e.clientX - 40,
            y: e.clientY - 40,
          });
          onDragToDesktop(desktopItem);
        }
      }
      setIsDragging(false);
      setDragItem(null);
      setDragPos(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragItem, dragPos, onDragToDesktop]);

  if (history.length === 0) {
    return null;
  }

  return (
    <>
      {/* 拖拽预览 */}
      {isDragging && dragItem && dragPos && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: dragPos.x - 40,
            top: dragPos.y - 40,
          }}
        >
          <div className="w-20 h-20 rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500 opacity-80">
            {isVideoUrl(dragItem.imageUrl) ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/60 to-gray-900">
                <VideoIcon className="w-8 h-8 text-purple-300" />
              </div>
            ) : (
              <img
                src={normalizeImageUrl(dragItem.imageUrl)}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <p className="text-xs text-center text-white mt-1 bg-black/60 rounded px-2 py-0.5">
            拖到桌面
          </p>
        </div>
      )}

      {/* Dock 容器 */}
      <div
        ref={containerRef}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      >
        {/* 展开/收起按钮 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-t-lg text-xs font-medium transition-all"
          style={{
            backgroundColor: `${theme.colors.bgSecondary}cc`,
            color: theme.colors.textSecondary,
            borderColor: theme.colors.border,
          }}
        >
          {isExpanded ? '收起 ▼' : `历史 (${history.length}) ▲`}
        </button>

        {/* Dock 主体 */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
            isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'
          }`}
          style={{
            backgroundColor: `${theme.colors.bgSecondary}dd`,
            borderColor: theme.colors.border,
            boxShadow: `0 10px 40px ${theme.colors.shadow}`,
          }}
        >
          {/* 标题 */}
          <div className="flex items-center gap-2 pr-3 border-r border-white/10">
            <ClockIcon className="w-4 h-4" style={{ color: theme.colors.textMuted }} />
            <span className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>
              历史
            </span>
          </div>

          {/* 历史项目列表 */}
          <div className="flex items-center gap-2 max-w-[600px] overflow-x-auto scrollbar-hide">
            {history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="relative flex-shrink-0 group cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleDragStart(e, item)}
                onDoubleClick={() => onPreview(item)}
              >
                {/* 图片缩略图 */}
                <div
                  className="w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                  style={{
                    borderColor: 'transparent',
                  }}
                >
                {/* 🔧 视频显示图标，图片正常加载 */}
                {isVideoUrl(item.imageUrl) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/60 to-gray-900">
                    <VideoIcon className="w-6 h-6 text-purple-300" />
                  </div>
                ) : (
                  <img
                    src={normalizeImageUrl(item.imageUrl)}
                    alt={formatTime(item.timestamp)}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                    }}
                  />
                )}
                </div>

                {/* 模型指示器 */}
                <div className="absolute -top-1 -right-1">
                  <span
                    className="w-3 h-3 rounded-full block shadow-lg bg-blue-500 shadow-blue-500/50"
                  />
                </div>

                {/* 悬停提示 */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div
                    className="px-2 py-1 rounded text-[10px] whitespace-nowrap"
                    style={{
                      backgroundColor: theme.colors.bgSecondary,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    双击预览 / 拖到桌面
                  </div>
                </div>
              </div>
            ))}

            {/* 更多指示 */}
            {history.length > 10 && (
              <div
                className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: theme.colors.bgTertiary,
                  color: theme.colors.textMuted,
                }}
              >
                +{history.length - 10}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
