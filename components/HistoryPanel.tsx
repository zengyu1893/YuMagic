import React from 'react';
import { GenerationHistory } from '../types';
import { Clock as ClockIcon, Trash2 as TrashIcon, Video as VideoIcon } from 'lucide-react';
import { normalizeImageUrl } from '../utils/image';
import { isVideoUrl, formatTime, PLACEHOLDER_IMAGE } from '../utils/media';

interface HistoryPanelProps {
  history: GenerationHistory[];
  onSelect: (item: GenerationHistory) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  history, 
  onSelect, 
  onDelete,
  onClear 
}) => {

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <ClockIcon className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs">暂无生成记录</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
          <ClockIcon className="w-3.5 h-3.5" />
          历史记录 ({history.length})
        </span>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
          >
            清空
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
        {history.slice(0, 9).map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer border border-white/10 hover:border-blue-500/50 transition-all"
            onClick={() => onSelect(item)}
          >
            {/* 🔧 视频显示图标，图片正常加载 */}
            {isVideoUrl(item.imageUrl) ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/60 to-gray-900">
                <VideoIcon className="w-6 h-6 text-purple-300" />
              </div>
            ) : (
              <img
                src={normalizeImageUrl(item.imageUrl)}
                alt={`生成于 ${formatTime(item.timestamp)}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                }}
              />
            )}
            
            {/* 悬停遮罩 */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
              <span className="text-[9px] text-white text-center line-clamp-2 px-1">
                {item.prompt.slice(0, 30)}...
              </span>
              <span className="text-[8px] text-gray-400">
                {formatTime(item.timestamp)}
              </span>
            </div>
            
            {/* 模型标识 */}
            <div className="absolute top-1 left-1">
              <span className={`w-2 h-2 rounded-full block bg-blue-500`}></span>
            </div>
            
            {/* 删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="absolute top-1 right-1 p-1 bg-gray-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600"
            >
              <TrashIcon className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}
      </div>
      
      {history.length > 9 && (
        <p className="text-[10px] text-center text-gray-500 mt-1">
          还有 {history.length - 9} 条记录
        </p>
      )}
    </div>
  );
};
