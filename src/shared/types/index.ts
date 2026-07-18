/**
 * 共享层通用类型。
 * 两个及以上功能真实复用的类型定义放这里。
 * 不放某个功能的模型 ID、默认参数或请求规则。
 */

/** 异步操作状态 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/** 通用 API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/** 分页参数 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** 排序参数 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/** 通用列表查询参数 */
export interface ListQueryParams extends PaginationParams {
  search?: string;
  sort?: SortParams;
  filters?: Record<string, unknown>;
}

/** 通用列表响应 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** 文件信息 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  url: string;
  lastModified?: number;
}
