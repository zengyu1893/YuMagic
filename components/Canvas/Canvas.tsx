import React, { useState } from 'react';
import { Monitor, Folder, Grid3x3, Check, X, ChevronDown, TriangleAlert as WarningIcon, ListTodo } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Desktop } from '../Desktop';
import { CreativeLibrary } from '../CreativeLibrary';
import { GeneratedImageDisplay } from '../GeneratedImageDisplay';
import PebblingCanvas from '../PebblingCanvas';
import { TaskLog } from '../TaskLog/TaskLog';
import { useTaskLog } from '../../hooks/useTaskLog';
import { ApiStatus } from '../../types';
import type { GeneratedContent, CreativeIdea, SmartPlusConfig, ThirdPartyApiConfig, GenerationHistory, DesktopItem, DesktopImageItem, DesktopFolderItem, DesktopStackItem, DesktopVideoItem, CreativeCategoryType } from '../../types';

interface CanvasProps {
  view: 'editor' | 'local-library' | 'canvas';
  setView: (view: 'editor' | 'local-library' | 'canvas') => void;
  files: File[];
  onUploadClick: () => void;
  creativeIdeas: CreativeIdea[];
  localCreativeIdeas: CreativeIdea[];
  onBack: () => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onDeleteMultiple?: (ids: number[]) => void;
  onEdit: (idea: CreativeIdea) => void;
  onUse: (idea: CreativeIdea) => void;
  status: ApiStatus;
  error: string | null;
  content: GeneratedContent | null;
  onPreviewClick: (url: string) => void;
  onExportIdeas: () => void;
  onImportIdeas: () => void;
  isImporting?: boolean;
  onImportById?: (idRange: string) => Promise<void>;
  isImportingById?: boolean;
  onReorderIdeas: (ideas: CreativeIdea[]) => void;
  onToggleFavorite?: (id: number) => void;
  onUpdateCategory?: (id: number, category: CreativeCategoryType) => Promise<void>;
  onEditAgain?: () => void;
  onRegenerate?: () => void;
  onDismissResult?: () => void;
  prompt?: string;
  imageSize?: string;
  history: GenerationHistory[];
  onHistorySelect: (item: GenerationHistory) => void;
  onHistoryDelete: (id: number) => void;
  onHistoryClear: () => void;
  desktopItems: DesktopItem[];
  onDesktopItemsChange: (items: DesktopItem[]) => void;
  onDesktopImageDoubleClick: (item: DesktopImageItem) => void;
  desktopSelectedIds: string[];
  onDesktopSelectionChange: (ids: string[]) => void;
  openFolderId: string | null;
  onFolderOpen: (id: string) => void;
  onFolderClose: () => void;
  openStackId: string | null;
  onStackOpen: (id: string) => void;
  onStackClose: () => void;
  onRenameItem: (id: string, newName: string) => void;
  onDesktopImagePreview?: (item: DesktopImageItem) => void;
  onDesktopImageEditAgain?: (item: DesktopImageItem) => void;
  onDesktopImageRegenerate?: (item: DesktopImageItem) => void;
  onFileDrop?: (files: FileList) => void;
  onCreateCreativeIdea?: (imageUrl: string, prompt?: string, aspectRatio?: string, resolution?: string) => void;
  isResultMinimized: boolean;
  setIsResultMinimized: (value: boolean) => void;
  onCanvasImageGenerated?: (imageUrl: string, prompt: string, canvasId?: string, canvasName?: string) => void;
  onCanvasCreated?: (canvasId: string, canvasName: string) => void;
  pendingCanvasImage?: { imageUrl: string; imageName?: string } | null;
  onClearPendingCanvasImage?: () => void;
  onAddToCanvas?: (imageUrl: string, imageName?: string) => void;
  canvasSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export const Canvas: React.FC<CanvasProps> = ({
  view, setView, files, onUploadClick, creativeIdeas, localCreativeIdeas,
  onBack, onAdd, onDelete, onDeleteMultiple, onEdit, onUse,
  status, error, content, onPreviewClick, onExportIdeas, onImportIdeas,
  onImportById, onReorderIdeas, onEditAgain, onRegenerate, onDismissResult,
  prompt, imageSize, history, onHistorySelect, onHistoryDelete, onHistoryClear,
  desktopItems, onDesktopItemsChange, onDesktopImageDoubleClick,
  desktopSelectedIds, onDesktopSelectionChange, openFolderId, onFolderOpen, onFolderClose,
  openStackId, onStackOpen, onStackClose, onRenameItem,
  onDesktopImagePreview, onDesktopImageEditAgain, onDesktopImageRegenerate,
  onFileDrop, onCreateCreativeIdea, isResultMinimized, setIsResultMinimized,
  onToggleFavorite, onUpdateCategory, isImporting, isImportingById,
  onCanvasImageGenerated, onCanvasCreated, pendingCanvasImage, onClearPendingCanvasImage,
  onAddToCanvas, canvasSaveRef,
}) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName !== 'light';
  const [taskLogOpen, setTaskLogOpen] = useState(false);
  const { tasks, clearTasks } = useTaskLog();

  return (
    <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden select-none"
      style={{ backgroundColor: theme.colors.bgPrimary }}
      onDragStart={(e) => e.preventDefault()}>
      {isDark ? (<>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/10 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
      </>) : (<>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-white to-gray-50/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
      </>)}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[60] liquid-tabs">
        <button onClick={() => setView('editor')} className={`liquid-tab flex items-center gap-1 ${view === 'editor' ? 'active' : ''}`}>
          <Monitor className="w-3 h-3" />桌面
        </button>
        <button onClick={() => setView('local-library')} className={`liquid-tab flex items-center gap-1 ${view === 'local-library' ? 'active' : ''}`}>
          <Folder className="w-3 h-3" />本地创意
          {localCreativeIdeas.length > 0 && <span className="px-1 py-0.5 text-[8px] rounded bg-white/20 font-medium">{localCreativeIdeas.length}</span>}
        </button>
        <button onClick={() => setView('canvas')} className={`liquid-tab flex items-center gap-1 ${view === 'canvas' ? 'active' : ''}`}>
          <Grid3x3 className="w-3 h-3" />画布
        </button>
        <button onClick={() => setTaskLogOpen(true)} className="liquid-tab flex items-center gap-1">
          <ListTodo className="w-3 h-3" />任务日志
        </button>
      </div>
      {view === 'local-library' ? (
        <div className="absolute inset-0 z-50 pt-12">
          <CreativeLibrary ideas={localCreativeIdeas} onBack={onBack} onAdd={onAdd} onDelete={onDelete}
            onDeleteMultiple={onDeleteMultiple} onEdit={onEdit} onUse={onUse} onExport={onExportIdeas}
            onImport={onImportIdeas} onImportById={onImportById} onReorder={onReorderIdeas}
            onToggleFavorite={onToggleFavorite} onUpdateCategory={onUpdateCategory}
            isImporting={isImporting} isImportingById={isImportingById} />
        </div>
      ) : null}
      <div className="absolute inset-0 z-50 overflow-hidden"
        style={{ display: view === 'canvas' ? 'block' : 'none', pointerEvents: view === 'canvas' ? 'auto' : 'none' }}>
        <PebblingCanvas onImageGenerated={onCanvasImageGenerated} onCanvasCreated={onCanvasCreated}
          creativeIdeas={creativeIdeas} isActive={view === 'canvas'}
          pendingImageToAdd={pendingCanvasImage} onPendingImageAdded={onClearPendingCanvasImage}
          saveRef={canvasSaveRef} />
      </div>
      {view !== 'canvas' && (
        <div className="relative z-10 flex-1 overflow-hidden">
          <Desktop items={desktopItems} onItemsChange={onDesktopItemsChange}
            onImageDoubleClick={onDesktopImageDoubleClick} onFolderDoubleClick={(folder) => onFolderOpen(folder.id)}
            onStackDoubleClick={(stack) => onStackOpen(stack.id)} openFolderId={openFolderId}
            onFolderClose={onFolderClose} openStackId={openStackId} onStackClose={onStackClose}
            selectedIds={desktopSelectedIds} onSelectionChange={onDesktopSelectionChange}
            onRenameItem={onRenameItem} onImagePreview={onDesktopImagePreview}
            onImageEditAgain={onDesktopImageEditAgain} onImageRegenerate={onDesktopImageRegenerate}
            history={history} creativeIdeas={creativeIdeas} onFileDrop={onFileDrop}
            onCreateCreativeIdea={onCreateCreativeIdea} isActive={(view as string) !== 'canvas'}
            onAddToCanvas={onAddToCanvas} />
          {(status === ApiStatus.Loading || (status === ApiStatus.Success && content) || (status === ApiStatus.Error && error)) && (<>
            {!isResultMinimized && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 animate-scale-in">
                <div className="bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-800/90 backdrop-blur-xl backdrop-saturate-150 rounded-2xl border-2 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/20 overflow-hidden p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      {status === ApiStatus.Loading ? (
                        <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : status === ApiStatus.Success ? (
                        <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-blue-300" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-500/30 flex items-center justify-center">
                          <WarningIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-semibold text-white">{status === ApiStatus.Loading ? 'AI 正在创作中...' : status === ApiStatus.Success ? '作品已完成' : '生成遇到问题'}</h3>
                        <p className="text-xs text-blue-300/70">{status === ApiStatus.Loading ? '请稍等，魔法正在发生' : status === ApiStatus.Success ? '点击图片查看大图' : '请稍后重试'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setIsResultMinimized(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-300 hover:text-white hover:bg-white/10 transition-all" title="收起到按钮旁">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {status !== ApiStatus.Loading && onDismissResult && (
                        <button onClick={onDismissResult} className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-300 hover:text-gray-300 hover:bg-gray-500/20 transition-all" title="关闭">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <GeneratedImageDisplay status={status} error={error} content={content}
                    onPreviewClick={onPreviewClick} onEditAgain={onEditAgain} onRegenerate={onRegenerate}
                    prompt={prompt} imageSize={imageSize} />
                </div>
              </div>
            )}
          </>)}
        </div>
      )}
      <TaskLog isOpen={taskLogOpen} onClose={() => setTaskLogOpen(false)} tasks={tasks} onClear={clearTasks} />
    </main>
  );
};
