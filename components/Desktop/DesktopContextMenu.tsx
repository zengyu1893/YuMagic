import React from 'react';
import {
  Folder as FolderIcon, FolderOpen as FolderOpenIcon, RefreshCw as RefreshIcon,
  Eye as EyeIcon, Edit as EditIcon, Download as DownloadIcon,
  Copy as CopyIcon, Scissors as ScissorsIcon, Clipboard as ClipboardIcon,
  MoveRight as MoveOutIcon, Type as RenameIcon, Library as LibraryIcon,
  LayoutGrid as LayersIcon, Package as PackageIcon, Trash2 as TrashIcon,
  Maximize2 as StackExpandIcon, Ungroup as UnstackIcon, PlusSquare as AddToCanvasIcon,
} from 'lucide-react';
import type { DesktopItem, DesktopImageItem, DesktopFolderItem, DesktopStackItem } from '../../types';

export interface ContextMenuState {
  x: number;
  y: number;
  itemId: string | null;
}

interface DesktopContextMenuProps {
  contextMenu: ContextMenuState | null;
  setContextMenu: (v: ContextMenuState | null) => void;
  items: DesktopItem[];
  selectedIds: string[];
  clipboard: { items: DesktopItem[]; action: 'copy' | 'cut' } | null;
  isExporting: boolean;
  openFolderId: string | null;
  openStackId: string | null;
  isLight: boolean;
  theme: any;
  setEditingItemId: (id: string) => void;
  setEditingName: (name: string) => void;
  handleCreateFolder: () => void;
  handleCreateStack: () => void;
  handleUnstack: (id: string) => void;
  handlePaste: () => void;
  handleCopy: () => void;
  handleCut: () => void;
  handleDeleteSelected: () => void;
  handleMoveOutOfFolder: () => void;
  handleMoveOutOfStack: () => void;
  handleItemDoubleClick: (item: DesktopItem) => void;
  handleExportSelected: (asZip: boolean) => Promise<void>;
  handleBatchDownload: (images: DesktopImageItem[]) => Promise<void>;
  handleExportAsZip: (name: string, images: DesktopImageItem[]) => Promise<void>;
  handleMergeImages: (direction: 'horizontal' | 'vertical') => Promise<void>;
  getImagesFromContainer: (containerId: string) => DesktopImageItem[];
  onImageEditAgain?: (item: DesktopImageItem) => void;
  onImageRegenerate?: (item: DesktopImageItem) => void;
  onCreateCreativeIdea?: (imageUrl: string, prompt?: string, aspectRatio?: string, resolution?: string) => void;
  onAddToCanvas?: (imageUrl: string, imageName?: string) => void;
  onStackDoubleClick?: (item: DesktopStackItem) => void;
  onItemsChange: (items: DesktopItem[]) => void;
}

export const DesktopContextMenu: React.FC<DesktopContextMenuProps> = ({
  contextMenu, setContextMenu, items, selectedIds, clipboard, isExporting,
  openFolderId, openStackId, isLight, theme, setEditingItemId, setEditingName,
  handleCreateFolder, handleCreateStack, handleUnstack, handlePaste, handleCopy, handleCut,
  handleDeleteSelected, handleMoveOutOfFolder, handleMoveOutOfStack,
  handleItemDoubleClick, handleExportSelected, handleBatchDownload, handleExportAsZip,
  handleMergeImages, getImagesFromContainer, onImageEditAgain, onImageRegenerate,
  onCreateCreativeIdea, onAddToCanvas, onStackDoubleClick, onItemsChange,
}) => {
  if (!contextMenu) return null;

  const separator = <div className="h-px my-1" style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />;

  return (
    <div className="fixed z-50 min-w-[180px] py-1.5 rounded-xl shadow-2xl border backdrop-blur-xl"
      style={{
        left: contextMenu.x, top: contextMenu.y,
        background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(18,18,26,0.95)',
        borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
      }}>
      {/* 无项目时的菜单 */}
      {!contextMenu.itemId && (<>
        <button onClick={handleCreateFolder}
          className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2"
          style={{ color: theme.colors.textPrimary }}>
          <FolderIcon className="w-4 h-4 text-blue-500" /><span>新建文件夹</span>
        </button>
        <button onClick={() => {
          const allItemIds = new Set(items.map(i => i.id));
          let updatedCount = 0;
          const updatedItems = items.map(item => {
            if (item.type === 'folder') {
              const folder = item as DesktopFolderItem;
              const validItemIds = folder.itemIds.filter(id => allItemIds.has(id));
              if (validItemIds.length !== folder.itemIds.length) { updatedCount++; return { ...folder, itemIds: validItemIds, updatedAt: Date.now() }; }
            }
            if (item.type === 'stack') {
              const stack = item as DesktopStackItem;
              const validItemIds = stack.itemIds.filter(id => allItemIds.has(id));
              if (validItemIds.length !== stack.itemIds.length) { updatedCount++; return { ...stack, itemIds: validItemIds, name: `叠放 (${validItemIds.length})`, updatedAt: Date.now() }; }
            }
            return item;
          });
          if (updatedCount > 0) onItemsChange(updatedItems);
          setContextMenu(null);
        }}
          className="w-full px-3 py-2 text-left text-[12px] hover:bg-emerald-500/10 transition-colors flex items-center gap-2"
          style={{ color: theme.colors.textPrimary }}>
          <RefreshIcon className="w-4 h-4 text-emerald-400" /><span>刷新全部</span>
        </button>
        {selectedIds.length >= 2 && selectedIds.every(id => items.find(i => i.id === id)?.type === 'image') && (
          <button onClick={handleCreateStack}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2"
            style={{ color: theme.colors.textPrimary }}>
            <LayersIcon className="w-4 h-4 text-blue-400" /><span>叠放选中图片 ({selectedIds.length})</span>
          </button>
        )}
        {clipboard && clipboard.items.length > 0 && (
          <button onClick={handlePaste}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2"
            style={{ color: theme.colors.textPrimary }}>
            <ClipboardIcon className="w-4 h-4 text-blue-400" /><span>粘贴 ({clipboard.items.length})</span>
          </button>
        )}
      </>)}

      {/* 有选中项目时的菜单 */}
      {contextMenu.itemId && (<>
        {items.find(i => i.id === contextMenu.itemId)?.type === 'stack' ? (<>
          <button onClick={() => {
            const stack = items.find(i => i.id === contextMenu.itemId) as DesktopStackItem;
            if (stack && onStackDoubleClick) onStackDoubleClick(stack);
            setContextMenu(null);
          }}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2"
            style={{ color: theme.colors.textPrimary }}>
            <StackExpandIcon className="w-4 h-4 text-blue-400" /><span>打开叠放</span>
          </button>
          <button onClick={() => handleUnstack(contextMenu.itemId!)}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2"
            style={{ color: theme.colors.textPrimary }}>
            <UnstackIcon className="w-4 h-4 text-blue-400" /><span>解散叠放</span>
          </button>
          {separator}
          <button onClick={async () => { const imgs = getImagesFromContainer(contextMenu.itemId!); const c = items.find(i => i.id === contextMenu.itemId); await handleExportAsZip(c?.name || '叠放', imgs); }}
            disabled={isExporting} className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" style={{ color: theme.colors.textPrimary }}>
            <PackageIcon className="w-4 h-4 text-blue-400" /><span>{isExporting ? '导出中...' : '导出压缩包'}</span>
          </button>
          <button onClick={async () => { await handleBatchDownload(getImagesFromContainer(contextMenu.itemId!)); }}
            disabled={isExporting} className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" style={{ color: theme.colors.textPrimary }}>
            <DownloadIcon className="w-4 h-4 text-blue-400" /><span>{isExporting ? '下载中...' : '批量下载'}</span>
          </button>
          {separator}
        </>) : items.find(i => i.id === contextMenu.itemId)?.type === 'folder' ? (<>
          <button onClick={() => { const item = items.find(i => i.id === contextMenu.itemId); if (item) handleItemDoubleClick(item); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <FolderOpenIcon className="w-4 h-4 text-blue-500" /><span>打开</span>
          </button>
          <button onClick={() => {
            const folder = items.find(i => i.id === contextMenu.itemId) as DesktopFolderItem;
            if (folder) { const allItemIds = new Set(items.map(i => i.id)); const validItemIds = folder.itemIds.filter(id => allItemIds.has(id));
              if (validItemIds.length !== folder.itemIds.length) { onItemsChange(items.map(i => i.id === folder.id ? { ...folder, itemIds: validItemIds, updatedAt: Date.now() } : i)); } }
            setContextMenu(null);
          }}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-emerald-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <RefreshIcon className="w-4 h-4 text-emerald-400" /><span>刷新</span>
          </button>
          {separator}
          <button onClick={async () => { const imgs = getImagesFromContainer(contextMenu.itemId!); const c = items.find(i => i.id === contextMenu.itemId); await handleExportAsZip(c?.name || '文件夹', imgs); }}
            disabled={isExporting} className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" style={{ color: theme.colors.textPrimary }}>
            <PackageIcon className="w-4 h-4 text-blue-400" /><span>{isExporting ? '导出中...' : '导出压缩包'}</span>
          </button>
          <button onClick={async () => { await handleBatchDownload(getImagesFromContainer(contextMenu.itemId!)); }}
            disabled={isExporting} className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" style={{ color: theme.colors.textPrimary }}>
            <DownloadIcon className="w-4 h-4 text-blue-400" /><span>{isExporting ? '下载中...' : '批量下载'}</span>
          </button>
          {separator}
        </>) : (<>
          <button onClick={() => { const item = items.find(i => i.id === contextMenu.itemId); if (item) handleItemDoubleClick(item); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <EyeIcon className="w-4 h-4 text-cyan-400" /><span>预览</span>
          </button>
          {items.find(i => i.id === contextMenu.itemId)?.type === 'image' && (<>
            {onImageEditAgain && (
              <button onClick={() => { const item = items.find(i => i.id === contextMenu.itemId) as DesktopImageItem; if (item) onImageEditAgain(item); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-[12px] hover:bg-purple-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <EditIcon className="w-4 h-4 text-purple-400" /><span>编辑</span>
              </button>
            )}
            {onImageRegenerate && (
              <button onClick={() => { const item = items.find(i => i.id === contextMenu.itemId) as DesktopImageItem; if (item) onImageRegenerate(item); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-[12px] hover:bg-emerald-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <RefreshIcon className="w-4 h-4 text-emerald-400" /><span>重生成</span>
              </button>
            )}
            {onCreateCreativeIdea && (
              <button onClick={() => { const item = items.find(i => i.id === contextMenu.itemId) as DesktopImageItem; if (item?.imageUrl) onCreateCreativeIdea(item.imageUrl, item.prompt); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <LibraryIcon className="w-4 h-4 text-blue-400" /><span>创建创意库</span>
              </button>
            )}
            {onAddToCanvas && (
              <button onClick={() => { const item = items.find(i => i.id === contextMenu.itemId) as DesktopImageItem; if (item?.imageUrl) onAddToCanvas(item.imageUrl, item.name); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-[12px] hover:bg-cyan-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <AddToCanvasIcon className="w-4 h-4 text-cyan-400" /><span>添加到画布</span>
              </button>
            )}
          </>)}
          {separator}
        </>)}
        <button onClick={() => { const item = items.find(i => i.id === contextMenu.itemId); if (item) { setEditingItemId(item.id); setEditingName(item.name); } setContextMenu(null); }}
          className="w-full px-3 py-2 text-left text-[12px] hover:bg-amber-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
          <RenameIcon className="w-4 h-4 text-amber-400" /><span>重命名</span>
        </button>
        {separator}
      </>)}

      {/* 选中项目的操作 */}
      {selectedIds.length > 0 && (<>
        <button onClick={() => { handleCopy(); setContextMenu(null); }}
          className="w-full px-3 py-2 text-left text-[12px] hover:bg-sky-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
          <CopyIcon className="w-4 h-4 text-sky-400" /><span>复制</span>
        </button>
        <button onClick={() => { handleCut(); setContextMenu(null); }}
          className="w-full px-3 py-2 text-left text-[12px] hover:bg-orange-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
          <ScissorsIcon className="w-4 h-4 text-orange-400" /><span>剪切</span>
        </button>
        {openFolderId && (
          <button onClick={handleMoveOutOfFolder}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-rose-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <MoveOutIcon className="w-4 h-4 text-rose-400" /><span>移出文件夹</span>
          </button>
        )}
        {openStackId && (
          <button onClick={handleMoveOutOfStack}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-rose-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <MoveOutIcon className="w-4 h-4 text-rose-400" /><span>移出叠放</span>
          </button>
        )}
        {selectedIds.length >= 2 && selectedIds.every(id => items.find(i => i.id === id)?.type === 'image') && (<>
          <button onClick={handleCreateStack}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-indigo-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <LayersIcon className="w-4 h-4 text-indigo-400" /><span>叠放选中图片 ({selectedIds.length})</span>
          </button>
          {separator}
          <button onClick={() => handleMergeImages('horizontal')} disabled={isExporting}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-teal-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" style={{ color: theme.colors.textPrimary }}>
            <span className="w-4 h-4 flex items-center justify-center text-teal-400">↔</span><span>{isExporting ? '合并中...' : '左右合并图片'}</span>
          </button>
          <button onClick={() => handleMergeImages('vertical')} disabled={isExporting}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-teal-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" style={{ color: theme.colors.textPrimary }}>
            <span className="w-4 h-4 flex items-center justify-center text-teal-400">↕</span><span>{isExporting ? '合并中...' : '上下合并图片'}</span>
          </button>
        </>)}
        {selectedIds.some(id => items.find(i => i.id === id)?.type === 'image') && (<>
          {onImageEditAgain && (
            <button onClick={async () => {
              const selectedImages = selectedIds.map(id => items.find(i => i.id === id)).filter((item): item is DesktopImageItem => item?.type === 'image');
              for (const img of selectedImages) await onImageEditAgain(img);
              setContextMenu(null);
            }}
              className="w-full px-3 py-2 text-left text-[12px] hover:bg-purple-500/10 transition-colors flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <EditIcon className="w-4 h-4 text-purple-400" /><span>编辑选中图片 ({selectedIds.filter(id => items.find(i => i.id === id)?.type === 'image').length})</span>
            </button>
          )}
          <button onClick={async () => { await handleExportSelected(true); }} disabled={isExporting}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-teal-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" style={{ color: theme.colors.textPrimary }}>
            <PackageIcon className="w-4 h-4 text-teal-400" /><span>{isExporting ? '导出中...' : '导出压缩包'}</span>
          </button>
          <button onClick={async () => { await handleExportSelected(false); }} disabled={isExporting}
            className="w-full px-3 py-2 text-left text-[12px] hover:bg-blue-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" style={{ color: theme.colors.textPrimary }}>
            <DownloadIcon className="w-4 h-4 text-blue-400" /><span>{isExporting ? '下载中...' : '批量下载'}</span>
          </button>
        </>)}
        {separator}
        <button onClick={handleDeleteSelected}
          className="w-full px-3 py-2 text-left text-[12px] hover:bg-red-500/10 transition-colors text-red-400 flex items-center gap-2">
          <TrashIcon className="w-4 h-4" /><span>删除 ({selectedIds.length})</span>
        </button>
      </>)}
    </div>
  );
};
