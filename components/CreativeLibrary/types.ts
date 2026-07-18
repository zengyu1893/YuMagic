import type { CreativeIdea, CreativeCategoryType } from '../../types';

export type FilterType = 'all' | 'favorite' | 'bp' | 'workflow';
export type SortType = 'time' | 'title' | 'manual';
export type CategoryFilterType = CreativeCategoryType | 'all';

export interface VirtualizedCreativeGridProps {
  ideas: CreativeIdea[];
  selectedIds: Set<number>;
  isMultiSelectMode: boolean;
  sortBy: string;
  isLight: boolean;
  theme: any;
  searchTerm: string;
  filter: string;
  categoryFilter: string;
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

export interface CreativeLibraryProps {
  ideas: CreativeIdea[];
  onBack: () => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onDeleteMultiple?: (ids: number[]) => void;
  onEdit: (idea: CreativeIdea) => void;
  onUse: (idea: CreativeIdea) => void;
  onExport: () => void;
  onImport: () => void;
  onImportById: (idRange: string) => Promise<void>;
  onReorder: (reorderedIdeas: CreativeIdea[]) => void;
  onToggleFavorite?: (id: number) => void;
  onUpdateCategory?: (id: number, category: CreativeCategoryType) => Promise<void>;
  isImporting?: boolean;
  isImportingById?: boolean;
}
