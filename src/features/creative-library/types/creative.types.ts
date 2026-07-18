/**
 * 创意库功能类型定义。
 * 从 types.ts 的 CreativeIdea 等类型逐步迁移到这里。
 *
 * 当前状态：迁移目标。实际类型仍在项目根 types.ts 中。
 */

import type { CreativeCategoryType } from '../../../types';

/** 创意模板条目（re-export 当前类型，逐步迁移新字段到这里） */
export interface CreativeTemplate {
  id: number;
  title: string;
  prompt: string;
  imageUrl: string;
  category: CreativeCategoryType;
  author?: string;
  isFavorite?: boolean;
  suggestedAspectRatio?: string;
  suggestedResolution?: string;
  createdAt?: number;
  updatedAt?: number;
  usageCount?: number;
  lastUsedAt?: number;
}

/** 创意库排序方式 */
export type CreativeSortMode = 'default' | 'recent' | 'favorite' | 'usage';

/** 创意库筛选条件 */
export interface CreativeFilters {
  category: CreativeCategoryType | 'all';
  searchQuery: string;
  favoritesOnly: boolean;
  sortBy: CreativeSortMode;
}
