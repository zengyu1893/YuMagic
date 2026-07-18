import React, { useState } from 'react';
import type { CreativeIdea } from '../../types';
import { Check, Loader2, Star, Edit as EditIcon, Download as DownloadIcon, Trash as TrashIcon } from 'lucide-react';
import { normalizeImageUrl } from '../../utils/image';

interface CreativeCardProps {
  idea: CreativeIdea;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  sortBy: string;
  isLight: boolean;
  theme: any;
  style: React.CSSProperties;
  onToggleSelect: (id: number) => void;
  onUse: (idea: CreativeIdea) => void;
  onEdit: (idea: CreativeIdea) => void;
  onDelete: (id: number) => void;
  onToggleFavorite?: (id: number) => void;
  onExportSingle: (idea: CreativeIdea) => void;
  dragItem: React.MutableRefObject<CreativeIdea | null>;
  dragOverItem: React.MutableRefObject<CreativeIdea | null>;
  onDragSort: () => void;
}

export const CreativeCard: React.FC<CreativeCardProps> = React.memo(({
  idea, isSelected, isMultiSelectMode, sortBy, isLight, theme, style,
  onToggleSelect, onUse, onEdit, onDelete, onToggleFavorite, onExportSingle,
  dragItem, dragOverItem, onDragSort,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div style={style}>
      <div
        className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${
          isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
        }`}
        style={{
          background: theme.colors.bgSecondary,
          border: `1px solid ${isSelected ? 'rgb(147,51,234)' : theme.colors.border}`,
          width: '100%', height: '100%',
        }}
        title={idea.title}
        onClick={() => { if (isMultiSelectMode) { onToggleSelect(idea.id); } else { onUse(idea); } }}
        draggable={!isMultiSelectMode && sortBy === 'manual'}
        onDragStart={() => (dragItem.current = idea)}
        onDragEnter={() => (dragOverItem.current = idea)}
        onDragEnd={onDragSort}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* 多选复选框 */}
        {isMultiSelectMode && (
          <div className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 flex items-center justify-center z-10 transition-all duration-200 ${
            isSelected ? 'bg-purple-500 border-purple-500' : 'bg-black/40 border-white/60 hover:border-purple-400'}`}>
            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
        )}
        {/* 图片懒加载 */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
        <img src={normalizeImageUrl(idea.imageUrl)} alt={idea.title} loading="lazy"
          onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)}
          className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 p-0.5 pointer-events-none ${
            isSelected ? 'opacity-80' : ''} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} />
        {/* 底部信息 */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none transition-all duration-300 group-hover:from-black/98 group-hover:via-black/85">
          <div className="p-2 pb-1.5"><h3 className="font-semibold text-white truncate text-xs">{idea.title}</h3></div>
          <div className="max-h-0 overflow-hidden group-hover:max-h-24 transition-all duration-300 px-2 pb-2">
            {idea.isBP && idea.bpFields && idea.bpFields.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {idea.bpFields.slice(0, 4).map((field, i) => (
                  <span key={i} className="text-[9px] text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded">{field.label}</span>))}
                {idea.bpFields.length > 4 && <span className="text-[9px] text-zinc-400">+{idea.bpFields.length - 4}</span>}
              </div>
            )}
            {idea.isWorkflow && idea.workflowInputs && idea.workflowInputs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {idea.workflowInputs.slice(0, 4).map((input, i) => (
                  <span key={i} className="text-[9px] text-purple-200 bg-purple-500/20 px-1.5 py-0.5 rounded">{input.label}</span>))}
                {idea.workflowInputs.length > 4 && <span className="text-[9px] text-zinc-400">+{idea.workflowInputs.length - 4}</span>}
              </div>
            )}
            {!idea.isBP && !idea.isWorkflow && idea.prompt && (
              <p className="text-[10px] text-zinc-300 line-clamp-3 leading-relaxed">{idea.prompt.slice(0, 100)}{idea.prompt.length > 100 ? '...' : ''}</p>
            )}
          </div>
        </div>
        {/* 操作按钮 */}
        {!isMultiSelectMode && (
          <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onToggleFavorite && (
              <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(idea.id); }}
                className="p-1 rounded-full backdrop-blur-sm transition-all duration-200"
                style={{ background: idea.isFavorite ? 'rgba(234,179,8,0.8)' : isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)',
                  color: idea.isFavorite ? '#fff' : isLight ? '#64748b' : '#fff',
                  boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.15)' : 'none', cursor: 'pointer' }} title="收藏">
                <Star className={`w-3 h-3 ${idea.isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onEdit(idea); }}
              className="p-1 rounded-full backdrop-blur-sm transition-all duration-200 hover:bg-blue-500 hover:text-white"
              style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)',
                color: isLight ? '#64748b' : '#fff', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.15)' : 'none', cursor: 'pointer' }} title="编辑">
              <EditIcon className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onExportSingle(idea); }}
              className="p-1 rounded-full backdrop-blur-sm transition-all duration-200 hover:bg-green-500 hover:text-white"
              style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)',
                color: isLight ? '#64748b' : '#fff', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.15)' : 'none', cursor: 'pointer' }} title="导出">
              <DownloadIcon className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`确认删除 "${idea.title}"?`)) { onDelete(idea.id); } }}
              className="p-1 rounded-full backdrop-blur-sm transition-all duration-200 hover:bg-red-500 hover:text-white"
              style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)',
                color: isLight ? '#64748b' : '#fff', boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.15)' : 'none', cursor: 'pointer' }} title="删除">
              <TrashIcon className="w-3 h-3" />
            </button>
          </div>
        )}
        {/* 左上角标签 */}
        <div className={`absolute top-1.5 ${isMultiSelectMode ? 'left-8' : 'left-1.5'} flex flex-col gap-0.5`}>
          <div className="flex gap-0.5 flex-wrap">
            {idea.isBP && (
              <div className="px-1.5 py-0.5 text-[9px] font-bold rounded-full backdrop-blur-sm pointer-events-none shadow-lg"
                style={{ backgroundColor: '#eed16d', color: '#1a1a2e', boxShadow: '0 4px 6px -1px rgba(238,209,109,0.3)' }}>BP</div>
            )}
            {idea.isWorkflow && (
              <div className="px-1.5 py-0.5 text-[9px] font-bold rounded-full backdrop-blur-sm pointer-events-none shadow-lg"
                style={{ backgroundColor: '#a855f7', color: '#fff', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.3)' }}>📊 工作流</div>
            )}
            {idea.author && (
              <div className="px-1.5 py-0.5 text-[9px] font-medium rounded-full backdrop-blur-sm pointer-events-none"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}>@{idea.author}</div>
            )}
          </div>
          {idea.cost !== undefined && idea.cost > 0 && (
            <div className="px-1.5 py-0.5 bg-blue-500/90 text-white text-[8px] font-bold rounded-full backdrop-blur-sm pointer-events-none flex items-center gap-0.5">
              <span>🪨</span><span>{idea.cost}</span>
            </div>
          )}
          {idea.isWorkflow && idea.workflowNodes && (
            <div className="px-1.5 py-0.5 bg-purple-500/80 text-white text-[8px] font-bold rounded-full backdrop-blur-sm pointer-events-none">
              {idea.workflowNodes.length} 节点
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CreativeCard.displayName = 'CreativeCard';
