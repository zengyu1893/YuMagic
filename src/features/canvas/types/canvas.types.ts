/**
 * 工作流画布节点、连线和快照类型定义。
 * 从 types/pebblingTypes.ts 扩展，逐步替代平铺类型文件。
 */

import type { NodeType, NodeStatus, NodeData, CanvasNode, Connection, Vec2, GenerationConfig } from '../../../types/pebblingTypes';

// Re-export core types for convenience
export type { NodeType, NodeStatus, NodeData, CanvasNode, Connection, Vec2, GenerationConfig };

// === Port Types ===

/** 端口承载的资产类型 */
export type PortAssetType = 'text' | 'image' | 'video' | 'audio' | 'mixed';

/** 端口方向 */
export type PortDirection = 'input' | 'output';

/** 端口声明 */
export interface PortDeclaration {
  /** 端口唯一标识（如 'default', 'prompt', 'reference-image'） */
  handleId: string;
  /** 端口标签（用户可见） */
  label: string;
  /** 承载的资产类型 */
  assetType: PortAssetType;
  /** 端口方向 */
  direction: PortDirection;
  /** 是否必填 */
  required?: boolean;
  /** 最大连接数（默认 1） */
  maxConnections?: number;
}

/** 节点端口合同 */
export interface NodePortContract {
  nodeType: NodeType;
  inputs: PortDeclaration[];
  outputs: PortDeclaration[];
}

// === Node Templates ===

/** 节点创建模板 */
export interface NodeTemplate {
  /** 默认标题 */
  title: string;
  /** 默认摘要 */
  summary?: string;
  /** 默认宽度 */
  width: number;
  /** 默认高度 */
  height: number;
  /** 最小宽度 */
  minWidth: number;
  /** 最小高度 */
  minHeight: number;
  /** 所属功能模块 ID */
  featureId: string;
  /** 图标名称 (lucide-react icon) */
  icon: string;
  /** 是否可运行 */
  executable: boolean;
  /** 默认 accent 颜色 */
  accent?: string;
}

// === Renderer Registry ===

/** 节点渲染元信息（扩展模板） */
export interface NodeRendererMeta extends NodeTemplate {
  /** 布局模式 */
  layout: 'compact' | 'standard' | 'wide';
}

// === Executor Registry ===

/** 执行上下文 */
export interface ExecutionContext {
  /** AbortSignal 用于取消 */
  signal: AbortSignal;
  /** 上游资产按 handle 分组 */
  upstreamAssets: Map<string, UpstreamAsset[]>;
  /** 当前节点 */
  node: CanvasNode;
  /** 更新节点数据（部分更新） */
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  /** 创建输出节点 */
  createOutputNode: (sourceNodeId: string, assetType: PortAssetType) => string;
}

/** 上游资产 */
export interface UpstreamAsset {
  /** 资产类型 */
  type: PortAssetType;
  /** 资产 URL / 内容 */
  value: string;
  /** 来源节点 ID */
  sourceNodeId: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** 执行结果 */
export interface ExecutionResult {
  /** 输出资产列表 */
  outputAssets: UpstreamAsset[];
  /** 执行耗时（毫秒） */
  durationMs?: number;
  /** 错误信息 */
  error?: string;
}

/** 节点执行器接口 */
export type NodeExecutor = (ctx: ExecutionContext) => Promise<ExecutionResult>;

// === Canvas Snapshot ===

/** 画布快照（持久化格式） */
export interface CanvasSnapshot {
  version: number;
  nodes: CanvasNode[];
  connections: Connection[];
  metadata?: {
    name?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
