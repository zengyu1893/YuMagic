import React from 'react';
import { Star, Edit as EditIcon, Trash2, Clock, PlusCircle as PlusCircleIcon, Grid3x3, Library as LibraryIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { normalizeImageUrl } from '../../utils/image';
import type { CreativeIdea } from '../../types';

interface RightPanelProps {
  creativeIdeas: CreativeIdea[];
  handleUseCreativeIdea: (idea: CreativeIdea) => void;
  setAddIdeaModalOpen: (isOpen: boolean) => void;
  setView: (view: 'editor' | 'local-library' | 'canvas') => void;
  onDeleteIdea: (id: number) => void;
  onEditIdea: (idea: CreativeIdea) => void;
  onToggleFavorite?: (id: number) => void;
  onClearRecentUsage?: (id: number) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  creativeIdeas, handleUseCreativeIdea, setAddIdeaModalOpen, setView,
  onDeleteIdea, onEditIdea, onToggleFavorite, onClearRecentUsage,
}) => {
  const { theme } = useTheme();
  const favoriteIdeas = creativeIdeas.filter(idea => idea.isFavorite);
  const recentIdeas = [...creativeIdeas].sort((a, b) => (b.order || 0) - (a.order || 0)).slice(0, 5);

  const renderIdeaItem = (idea: CreativeIdea, showFavorite = true, showDelete = true, showClearRecent = false) => (
    <div key={idea.id} className="group liquid-card p-2 hover:border-blue-500/30 transition-all cursor-pointer"
      onClick={() => handleUseCreativeIdea(idea)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {idea.imageUrl ? (
            <img src={normalizeImageUrl(idea.imageUrl)} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
          ) : (<span className="text-sm flex-shrink-0">✨</span>)}
          <span className="text-[11px] font-medium truncate" style={{ color: theme.colors.textPrimary }}>{idea.title}</span>
          {idea.isBP && (
            <span className="px-1 py-0.5 text-[8px] font-bold rounded flex-shrink-0"
              style={{ backgroundColor: 'rgba(238,209,109,0.25)', color: '#eed16d' }}>BP</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {showFavorite && onToggleFavorite && (
            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(idea.id); }}
              className={`w-5 h-5 rounded flex items-center justify-center transition-all ${idea.isFavorite ? 'text-blue-400 hover:text-blue-300' : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10'}`}
              title={idea.isFavorite ? '取消收藏' : '收藏'}>
              <Star className={`w-3 h-3 ${idea.isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEditIdea(idea); }}
            className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="编辑">
            <EditIcon className="w-3 h-3" />
          </button>
          {showDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDeleteIdea(idea.id); }}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="删除创意">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {showClearRecent && onClearRecentUsage && (
            <button onClick={(e) => { e.stopPropagation(); onClearRecentUsage(idea.id); }}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all" title="清除使用记录">
              <Clock className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full liquid-panel border-l z-20">
      <div className="liquid-panel-section flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center">
            <Star className="w-3 h-3 text-blue-400 fill-current" />
          </div>
          <h2 className="text-[12px] font-semibold" style={{ color: theme.colors.textPrimary }}>收藏创意</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setAddIdeaModalOpen(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-105 press-scale"
            style={{ background: 'var(--glass-bg)', color: theme.colors.textSecondary }} title="新建创意">
            <PlusCircleIcon className="w-3 h-3" />
          </button>
          <button onClick={() => setView('local-library')}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-105 press-scale"
            style={{ background: 'var(--glass-bg)', color: theme.colors.textSecondary }} title="全部创意库">
            <Grid3x3 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {recentIdeas.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium" style={{ color: theme.colors.textMuted }}>最近使用</span>
            </div>
            <div className="space-y-1.5">
              {recentIdeas.slice(0, 3).map(idea => renderIdeaItem(idea, true, false, true))}
            </div>
          </div>
        )}
        {favoriteIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-blue-400 fill-current" />
            </div>
            <p className="text-[11px] font-medium" style={{ color: theme.colors.textPrimary }}>还没有收藏</p>
            <p className="text-[10px] mt-1" style={{ color: theme.colors.textMuted }}>在创意库中点击星标收藏</p>
            <button onClick={() => setView('local-library')} className="mt-4 px-4 py-2 liquid-btn text-[11px]">
              <LibraryIcon className="w-3.5 h-3.5 mr-1.5" />浏览创意库
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium" style={{ color: theme.colors.textMuted }}>收藏</span>
            </div>
            <div className="space-y-1.5">
              {favoriteIdeas.map(idea => renderIdeaItem(idea, false))}
            </div>
          </div>
        )}
      </div>
      {creativeIdeas.length > 0 && (
        <div className="mx-3 mb-3 px-2.5 py-2 liquid-card">
          <div className="flex items-center justify-between text-[10px]">
            <span style={{ color: theme.colors.textMuted }}>共 {creativeIdeas.length} 个创意</span>
            <button onClick={() => setView('local-library')} className="text-blue-400 hover:text-blue-300 transition-colors">管理全部 →</button>
          </div>
        </div>
      )}
    </aside>
  );
};
