import type { DesktopFolderItem, DesktopItem, DesktopPosition } from '../types';

export type CanvasFolderResolution = {
  folderId?: string;
  canvasToFolderMap: Record<string, string>;
};

const FOLDER_GRID_SIZE = 100;
const FOLDER_MAX_COLS = 8;

const isFolderItem = (item: DesktopItem): item is DesktopFolderItem => item.type === 'folder';

const getCanvasFolderName = (canvasName?: string): string | null => {
  const trimmed = canvasName?.trim();
  return trimmed ? `🎨 ${trimmed}` : null;
};

const hasMapChanged = (left: Record<string, string>, right: Record<string, string>): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return true;

  return leftKeys.some(key => left[key] !== right[key]);
};

export function areCanvasFolderMapsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  return !hasMapChanged(left, right);
}

export function resolveCanvasFolderId(
  items: readonly DesktopItem[],
  canvasToFolderMap: Record<string, string>,
  canvasId: string,
  canvasName?: string,
): CanvasFolderResolution {
  const folders = items.filter(isFolderItem);
  const mappedFolderId = canvasToFolderMap[canvasId];
  const nextMap = { ...canvasToFolderMap };

  if (mappedFolderId && folders.some(folder => folder.id === mappedFolderId)) {
    return { folderId: mappedFolderId, canvasToFolderMap: nextMap };
  }

  if (mappedFolderId) {
    delete nextMap[canvasId];
  }

  const idPrefix = `canvas-folder-${canvasId}-`;
  const folderById = folders.find(folder => folder.id.startsWith(idPrefix));
  if (folderById) {
    return {
      folderId: folderById.id,
      canvasToFolderMap: { ...nextMap, [canvasId]: folderById.id },
    };
  }

  const folderName = getCanvasFolderName(canvasName);
  if (!folderName) {
    return { canvasToFolderMap: nextMap };
  }

  const nameMatches = folders.filter(folder => folder.name === folderName);
  if (nameMatches.length !== 1) {
    return { canvasToFolderMap: nextMap };
  }

  return {
    folderId: nameMatches[0].id,
    canvasToFolderMap: { ...nextMap, [canvasId]: nameMatches[0].id },
  };
}

function getNextPositionInFolder(items: readonly DesktopItem[], folder: DesktopFolderItem): DesktopPosition {
  const folderItems = items.filter(item => folder.itemIds.includes(item.id));
  const occupied = new Set(folderItems.map(item => `${item.position.x},${item.position.y}`));

  for (let index = 0; index < 1000; index += 1) {
    const position = {
      x: (index % FOLDER_MAX_COLS) * FOLDER_GRID_SIZE,
      y: Math.floor(index / FOLDER_MAX_COLS) * FOLDER_GRID_SIZE,
    };

    if (!occupied.has(`${position.x},${position.y}`)) return position;
  }

  return {
    x: 0,
    y: Math.ceil(folderItems.length / FOLDER_MAX_COLS) * FOLDER_GRID_SIZE,
  };
}

export function addItemToFolder(
  items: readonly DesktopItem[],
  folderId: string,
  newItem: DesktopItem,
  now: number,
): DesktopItem[] {
  const folder = items.find(item => item.id === folderId && item.type === 'folder') as DesktopFolderItem | undefined;
  if (!folder) return [...items, newItem];

  const hasItem = folder.itemIds.includes(newItem.id);
  const nextFolder = {
    ...folder,
    itemIds: hasItem ? folder.itemIds : [...folder.itemIds, newItem.id],
    updatedAt: now,
  };
  const nextItem = {
    ...newItem,
    position: getNextPositionInFolder(items, folder),
  };
  const hasExistingItem = items.some(item => item.id === newItem.id);

  const updatedItems = items.map(item => {
    if (item.id === folderId) return nextFolder;
    if (item.id === newItem.id) return nextItem;
    return item;
  });

  return hasExistingItem ? updatedItems : [...updatedItems, nextItem];
}
