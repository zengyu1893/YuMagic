import React, { useState } from 'react';
import { Plus, Grid3X3, Trash2, Clock, Sparkles } from 'lucide-react';
import { CanvasListItem } from '../../services/api/canvas';

interface CanvasSelectorProps {
  canvasList: CanvasListItem[];
  isLightCanvas: boolean;
  onSelectCanvas: (id: string) => void;
  onCreateCanvas: () => void;
  onDeleteCanvas: (id: string) => void;
}

type SortMode = 'recent' | 'name';

export default function CanvasSelector({
  canvasList,
  isLightCanvas,
  onSelectCanvas,
  onCreateCanvas,
  onDeleteCanvas
}: CanvasSelectorProps) {
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedList = [...canvasList].sort((a, b) => {
    if (sortMode === 'recent') {
      return b.updatedAt - a.updatedAt;
    }
    return a.name.localeCompare(b.name, 'zh');
  });

  const formatDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteCanvas(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center transition-colors duration-300 ${
      isLightCanvas ? 'bg-[#f5f5f7]' : 'bg-[#0a0a0f]'
    }`}>
      <div className="w-full max-w-2xl px-6">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Grid3X3 size={28} className={isLightCanvas ? 'text-gray-700' : 'text-white/80'} />
            <h1 className={`text-2xl font-bold ${isLightCanvas ? 'text-gray-900' : 'text-white'}`}>
              选择画布
            </h1>
            <span className={`text-sm px-2 py-0.5 rounded-full ${
              isLightCanvas ? 'bg-gray-200 text-gray-500' : 'bg-white/10 text-white/40'
            }`}>
              {canvasList.length}个
            </span>
          </div>
          <p className={`text-sm ${isLightCanvas ? 'text-gray-500' : 'text-white/40'}`}>
            打开已有画布，或新建一个开始创作。
          </p>
        </div>

        {/* 排序 + 新建 */}
        <div className="flex items-center justify-between mb-6">
          <div className={`flex rounded-lg p-0.5 text-xs ${
            isLightCanvas ? 'bg-gray-200/50' : 'bg-white/5'
          }`}>
            <button
              onClick={() => setSortMode('recent')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                sortMode === 'recent'
                  ? (isLightCanvas ? 'bg-white text-gray-800 shadow-sm' : 'bg-white/10 text-white')
                  : (isLightCanvas ? 'text-gray-500' : 'text-white/40')
              }`}
            >
              <Clock size={12} />
              最近编辑
            </button>
            <button
              onClick={() => setSortMode('name')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sortMode === 'name'
                  ? (isLightCanvas ? 'bg-white text-gray-800 shadow-sm' : 'bg-white/10 text-white')
                  : (isLightCanvas ? 'text-gray-500' : 'text-white/40')
              }`}
            >
              名称
            </button>
          </div>

          <button
            onClick={onCreateCanvas}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isLightCanvas
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            <Plus size={14} />
            新建画布
          </button>
        </div>

        {/* 画布卡片网格 */}
        <div className="grid grid-cols-2 gap-3">
          {sortedList.map((canvas) => (
            <div
              key={canvas.id}
              onClick={() => onSelectCanvas(canvas.id)}
              className={`group relative rounded-xl p-4 cursor-pointer border transition-all duration-200 hover:scale-[1.02] ${
                isLightCanvas
                  ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
              }`}
            >
              {/* 删除按钮 */}
              <button
                onClick={(e) => handleDelete(e, canvas.id)}
                className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                  confirmDeleteId === canvas.id
                    ? 'opacity-100 bg-red-500/20 text-red-400'
                    : isLightCanvas
                      ? 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                      : 'hover:bg-red-500/10 text-white/30 hover:text-red-400'
                }`}
                title={confirmDeleteId === canvas.id ? '再次点击确认删除' : '删除画布'}
              >
                <Trash2 size={14} />
              </button>

              {/* 画布名称 */}
              <h3 className={`text-sm font-semibold truncate pr-6 mb-3 ${
                isLightCanvas ? 'text-gray-800' : 'text-white'
              }`}>
                {canvas.name}
              </h3>

              {/* 底部信息 */}
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${
                  isLightCanvas ? 'text-gray-400' : 'text-white/30'
                }`}>
                  {formatDate(canvas.updatedAt)}
                </span>
                <div className="flex items-center gap-2">
                  {canvas.nodeCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isLightCanvas
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-white/5 text-white/30'
                    }`}>
                      {canvas.nodeCount} 节点
                    </span>
                  )}
                  {/* 智能标签 - 有节点数>=5时显示 */}
                  {canvas.nodeCount >= 5 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 flex items-center gap-1">
                      <Sparkles size={10} />
                      智能
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {canvasList.length === 0 && (
          <div className="text-center py-16">
            <Grid3X3 size={48} className={`mx-auto mb-4 ${isLightCanvas ? 'text-gray-300' : 'text-white/10'}`} />
            <p className={`text-sm mb-4 ${isLightCanvas ? 'text-gray-400' : 'text-white/30'}`}>
              还没有画布，创建一个开始创作吧
            </p>
            <button
              onClick={onCreateCanvas}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLightCanvas
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              <Plus size={16} className="inline mr-1" />
              新建第一个画布
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
