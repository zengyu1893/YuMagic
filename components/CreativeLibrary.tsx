

import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { CreativeIdea, CreativeCategoryType } from '../types';
import { CREATIVE_CATEGORIES } from '../types';
import { PlusCircle as PlusCircleIcon, Trash2 as TrashIcon, Edit as EditIcon, Download as UploadIcon, Upload as DownloadIcon, TrendingUp, Clipboard, FolderOpen, Layers, Sparkles, Loader2, Search as SearchIconLucide } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ImportCreativeModal } from './ImportCreativeModal';
import { autoClassifyCreative } from '../services/geminiService';
import { VirtualizedCreativeGrid } from './CreativeLibrary/VirtualizedCreativeGrid';
import type { FilterType, SortType, CategoryFilterType, CreativeLibraryProps } from './CreativeLibrary/types';

export const CreativeLibrary: React.FC<CreativeLibraryProps> = ({ ideas, onBack, onAdd, onDelete, onDeleteMultiple, onEdit, onUse, onExport, onImport, onImportById, onReorder, onToggleFavorite, onUpdateCategory, isImporting, isImportingById }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { themeName, theme } = useTheme();
  const isLight = themeName === 'light';
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('time'); // 默认按时间排序
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // AI 自动分类状态
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState({ current: 0, total: 0 });
  
  // 多选状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const dragItem = useRef<CreativeIdea | null>(null);
  const dragOverItem = useRef<CreativeIdea | null>(null);

  // 单个创意导出功能
  const handleExportSingle = async (idea: CreativeIdea) => {
    try {
      // 转换图片为base64
      const convertImageToBase64 = async (url: string): Promise<string> => {
        if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('图片转换失败:', url, e);
          return url;
        }
      };

      const ideaWithBase64 = {
        ...idea,
        imageUrl: await convertImageToBase64(idea.imageUrl)
      };

      const dataStr = JSON.stringify(ideaWithBase64, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      // 文件名用创意标题
      const safeTitle = idea.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      link.download = `creative_${safeTitle}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('导出失败:', e);
      alert('导出失败');
    }
  };

  // 多选操作方法
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredIdeas.map(idea => idea.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) {
      setSelectedIds(new Set()); // 退出多选模式时清空选中
    }
  };

  // 批量导出
  const handleExportSelected = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要导出的创意');
      return;
    }

    try {
      const convertImageToBase64 = async (url: string): Promise<string> => {
        if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('图片转换失败:', url, e);
          return url;
        }
      };

      const selectedIdeas = ideas.filter(idea => selectedIds.has(idea.id));
      const ideasWithBase64 = await Promise.all(
        selectedIdeas.map(async (idea) => ({
          ...idea,
          imageUrl: await convertImageToBase64(idea.imageUrl)
        }))
      );

      const dataStr = JSON.stringify(ideasWithBase64, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `creative_export_${selectedIds.size}条_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`成功导出 ${selectedIds.size} 个创意`);
    } catch (e) {
      console.error('批量导出失败:', e);
      alert('导出失败');
    }
  };

  // 批量删除
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      alert('请先选择要删除的创意');
      return;
    }

    if (window.confirm(`确认删除选中的 ${selectedIds.size} 个创意？`)) {
      if (onDeleteMultiple) {
        onDeleteMultiple(Array.from(selectedIds));
      } else {
        // 如果没有批量删除方法，逐个删除
        selectedIds.forEach(id => onDelete(id));
      }
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
    }
  };

  // AI 自动分类未分类的创意
  const handleAutoClassify = async () => {
    if (!onUpdateCategory) {
      alert('分类更新功能未配置');
      return;
    }
    
    // 筛选未分类的创意
    const uncategorized = ideas.filter(idea => !idea.category);
    
    if (uncategorized.length === 0) {
      alert('所有创意已分类，无需操作');
      return;
    }
    
    if (!window.confirm(`发现 ${uncategorized.length} 个未分类的创意，是否用 AI 自动分类？`)) {
      return;
    }
    
    setIsAutoClassifying(true);
    setClassifyProgress({ current: 0, total: uncategorized.length });
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < uncategorized.length; i++) {
      const idea = uncategorized[i];
      setClassifyProgress({ current: i + 1, total: uncategorized.length });
      
      try {
        const category = await autoClassifyCreative(idea.title, idea.prompt);
        await onUpdateCategory(idea.id, category);
        successCount++;
      } catch (e) {
        console.error(`分类失败 [${idea.title}]:`, e);
        failCount++;
      }
      
      // 防止请求过快
      if (i < uncategorized.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    
    setIsAutoClassifying(false);
    setClassifyProgress({ current: 0, total: 0 });
    
    alert(`分类完成！成功: ${successCount}，失败: ${failCount}`);
  };

  const filteredIdeas = useMemo(() => {
    let result = ideas
      .filter(idea => {
        // 类型筛选
        if (filter === 'bp' && !idea.isBP) return false;
        if (filter === 'workflow' && !idea.isWorkflow) return false;
        if (filter === 'favorite' && !idea.isFavorite) return false;
        return true;
      })
      .filter(idea => {
        // 分类筛选
        if (categoryFilter === 'all') return true;
        return idea.category === categoryFilter;
      })
      .filter(idea =>
        idea.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // 排序
    if (sortBy === 'time') {
      // 按添加时间排序（新的在前）
      result = [...result].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    } else if (sortBy === 'title') {
      // 按标题字母排序
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
    // manual 保持原有顺序
    
    return result;
  }, [ideas, searchTerm, filter, categoryFilter, sortBy]);

  // 统计各分类数量
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ideas.length };
    CREATIVE_CATEGORIES.forEach(cat => {
      counts[cat.key] = ideas.filter(idea => idea.category === cat.key).length;
    });
    // 未分类的数量
    counts['uncategorized'] = ideas.filter(idea => !idea.category).length;
    return counts;
  }, [ideas]);

  const handleDragSort = () => {
    if (!dragItem.current || !dragOverItem.current || dragItem.current.id === dragOverItem.current.id) {
      return;
    }

    const newIdeas = [...ideas];
    const dragItemIndex = ideas.findIndex(i => i.id === dragItem.current!.id);
    const dragOverItemIndex = ideas.findIndex(i => i.id === dragOverItem.current!.id);

    if (dragItemIndex === -1 || dragOverItemIndex === -1) return;

    const [draggedItem] = newIdeas.splice(dragItemIndex, 1);
    newIdeas.splice(dragOverItemIndex, 0, draggedItem);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    onReorder(newIdeas);
  };

  const filterButtons: { key: FilterType, label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'favorite', label: '⭐ 收藏' },
    { key: 'bp', label: 'BP' },
    { key: 'workflow', label: '📊 工作流' },
  ];

  return (
    <div 
      className="flex flex-col w-full h-full p-4 animate-fade-in transition-colors duration-300"
      style={{ background: theme.colors.bgPrimary }}
    >
      <header 
        className="flex-shrink-0 flex items-center justify-between gap-3 pb-3"
        style={{ borderBottom: `1px solid ${theme.colors.border}` }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.colors.primary }}>
            创意库
          </h1>
          <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>管理和使用您的创意灵感</p>
        </div>
        <div className="flex items-center gap-2">
                    <button
            onClick={onImport}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textPrimary
            }}
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>导入中...</span>
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                <span>导入</span>
              </>
            )}
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            disabled={isImportingById}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textPrimary
            }}
          >
            {isImportingById ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>导入中...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>智能导入</span>
              </>
            )}
          </button>
           <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg text-xs transition-all duration-200"
            style={{
              backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textPrimary
            }}
          >
            <DownloadIcon className="w-4 h-4" />
            <span>导出</span>
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white font-semibold rounded-lg text-xs shadow-lg shadow-blue-500/25 hover:bg-blue-400 transition-all duration-200"
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>新增</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg text-xs transition-all duration-200"
            style={{
              backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textPrimary
            }}
          >
            &larr; 返回
          </button>
        </div>
      </header>

      <div className="flex-shrink-0 flex items-center justify-between gap-3 py-3">
        <div className="relative flex-grow">
          <SearchIconLucide className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.textMuted }} />
          <input
            type="text"
            placeholder="搜索标题..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg py-2 pl-8 pr-3 text-xs transition-all duration-200"
            style={{ 
              background: theme.colors.bgSecondary,
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textPrimary
            }}
          />
        </div>
        
        {/* 排序选择器 */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortType)}
          className="px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{ 
            background: theme.colors.bgSecondary,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.textPrimary
          }}
        >
          <option value="time">按时间</option>
          <option value="title">按标题</option>
          <option value="manual">手动排序</option>
        </select>
        
        {/* 多选模式按钮 */}
        <button
          onClick={toggleMultiSelectMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg text-xs transition-all duration-200 ${
            isMultiSelectMode ? 'bg-purple-500 text-white' : ''
          }`}
          style={{
            backgroundColor: isMultiSelectMode ? undefined : (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)'),
            border: `1px solid ${isMultiSelectMode ? 'transparent' : theme.colors.border}`,
            color: isMultiSelectMode ? undefined : theme.colors.textPrimary
          }}
        >
          <Clipboard className="w-4 h-4" />
          <span>{isMultiSelectMode ? '取消多选' : '多选'}</span>
        </button>
        
        <div 
          className="flex items-center gap-0.5 p-0.5 rounded-lg"
          style={{ 
            background: theme.colors.bgSecondary,
            border: `1px solid ${theme.colors.border}`
          }}
        >
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                filter === key
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : ''
              }`}
              style={{
                color: filter === key ? undefined : theme.colors.textMuted
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* 多选操作栏 */}
      {isMultiSelectMode && (
        <div 
          className="flex-shrink-0 flex items-center justify-between gap-3 py-2 px-3 mb-2 rounded-lg"
          style={{ 
            background: isLight ? 'rgba(147,51,234,0.1)' : 'rgba(147,51,234,0.2)',
            border: `1px solid rgba(147,51,234,0.3)`
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: theme.colors.textPrimary }}>
              已选中 {selectedIds.size} / {filteredIdeas.length} 项
            </span>
            <button
              onClick={selectAll}
              className="text-xs font-semibold text-purple-500 hover:text-purple-400 transition-colors"
            >
              全选
            </button>
            <button
              onClick={deselectAll}
              className="text-xs font-semibold text-purple-500 hover:text-purple-400 transition-colors"
            >
              取消全选
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white font-semibold rounded-lg text-xs transition-all duration-200 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>导出选中</span>
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white font-semibold rounded-lg text-xs transition-all duration-200 hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="w-4 h-4" />
              <span>删除选中</span>
            </button>
          </div>
        </div>
      )}
      
      {/* 主内容区域 - 左侧分类 + 右侧卡片 */}
      <div className="flex-grow flex min-h-0 overflow-hidden">
        {/* 左侧分类侧边栏 */}
        <aside 
          className={`flex-shrink-0 border-r overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-40'}`}
          style={{ borderColor: theme.colors.border }}
        >
          {/* 侧边栏头部 */}
          <div 
            className="sticky top-0 flex items-center justify-between px-3 py-2 border-b"
            style={{ background: theme.colors.bgPrimary, borderColor: theme.colors.border }}
          >
            {!sidebarCollapsed && (
              <span className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>分类</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: theme.colors.textMuted }}
              title={sidebarCollapsed ? '展开分类' : '收起分类'}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
          
          {/* 分类列表 */}
          <div className="py-1">
            {/* 全部 */}
            <button
              onClick={() => setCategoryFilter('all')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all ${
                categoryFilter === 'all' ? 'font-semibold' : ''
              }`}
              style={{ 
                background: categoryFilter === 'all' 
                  ? (isLight ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)') 
                  : 'transparent',
                color: categoryFilter === 'all' ? '#3b82f6' : theme.colors.textSecondary
              }}
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-grow text-left">全部</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ 
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)' 
                  }}>
                    {categoryCounts.all}
                  </span>
                </>
              )}
            </button>
            
            {/* 分类列表 */}
            {CREATIVE_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all ${
                  categoryFilter === cat.key ? 'font-semibold' : ''
                }`}
                style={{ 
                  background: categoryFilter === cat.key 
                    ? (isLight ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)') 
                    : 'transparent',
                  color: categoryFilter === cat.key ? '#3b82f6' : theme.colors.textSecondary
                }}
                title={sidebarCollapsed ? `${cat.icon} ${cat.label} (${categoryCounts[cat.key] || 0})` : undefined}
              >
                <span className="text-sm flex-shrink-0">{cat.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-grow text-left">{cat.label}</span>
                    {(categoryCounts[cat.key] || 0) > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ 
                        background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)' 
                      }}>
                        {categoryCounts[cat.key]}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
            
            {/* 未分类 */}
            {categoryCounts['uncategorized'] > 0 && (
              <button
                onClick={() => setCategoryFilter('other')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all opacity-60 hover:opacity-100`}
                style={{ color: theme.colors.textMuted }}
              >
                <span className="text-sm flex-shrink-0">❓</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-grow text-left">未分类</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ 
                      background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)' 
                    }}>
                      {categoryCounts['uncategorized']}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* AI 自动分类按钮 */}
          {categoryCounts['uncategorized'] > 0 && onUpdateCategory && (
            <div className="px-2 py-2 border-t" style={{ borderColor: theme.colors.border }}>
              <button
                onClick={handleAutoClassify}
                disabled={isAutoClassifying}
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  sidebarCollapsed ? 'px-1' : ''
                }`}
                style={{
                  background: isAutoClassifying 
                    ? (isLight ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.25)')
                    : (isLight ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.15)'),
                  color: '#a855f7',
                  border: '1px solid rgba(168,85,247,0.3)'
                }}
                title={sidebarCollapsed ? `AI 自动分类 (${categoryCounts['uncategorized']} 个未分类)` : undefined}
              >
                {isAutoClassifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {!sidebarCollapsed && (
                      <span>{classifyProgress.current}/{classifyProgress.total}</span>
                    )}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {!sidebarCollapsed && <span>AI 分类</span>}
                  </>
                )}
              </button>
            </div>
          )}
        </aside>
        
        {/* 右侧卡片区域 */}
        <VirtualizedCreativeGrid
          ideas={filteredIdeas}
          selectedIds={selectedIds}
          isMultiSelectMode={isMultiSelectMode}
          sortBy={sortBy}
          isLight={isLight}
          theme={theme}
          searchTerm={searchTerm}
          filter={filter}
          categoryFilter={categoryFilter}
          onToggleSelect={toggleSelect}
          onUse={onUse}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onExportSingle={handleExportSingle}
          dragItem={dragItem}
          dragOverItem={dragOverItem}
          onDragSort={handleDragSort}
        />
      </div>
      
      <ImportCreativeModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportById}
        isImporting={isImportingById}
      />
    </div>
  );
};

