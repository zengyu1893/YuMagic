/**
 * 画布连线工厂。
 * 负责统一端口 handle、连线样式、端口兼容校验、连线创建和旧快照连线修复。
 * 所有连线创建都走此工厂，保证风格一致。
 */

import type { Connection } from '../../../types/pebblingTypes';
import type { PortAssetType } from '../types/canvas.types';
import { getPortColor, getPortContract, arePortsCompatible } from '../config/portTypes';

/** 生成连线 ID */
function generateEdgeId(): string {
  return `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 连线创建参数 */
export interface CreateEdgeOptions {
  fromNode: string;
  toNode: string;
  /** 源端口 handle ID（默认 'default'） */
  fromHandle?: string;
  /** 目标端口 handle ID（默认 'default'） */
  toHandle?: string;
  /** 端口相对于目标节点的 Y 偏移（旧快照兼容） */
  toPortOffsetY?: number;
  /** 端口键（rh-config 节点参数端口标识） */
  toPortKey?: string;
}

/**
 * 创建连线。
 * @returns 创建的连线对象
 */
export function createEdge(options: CreateEdgeOptions): Connection {
  return {
    id: generateEdgeId(),
    fromNode: options.fromNode,
    toNode: options.toNode,
    toPortKey: options.toPortKey,
    toPortOffsetY: options.toPortOffsetY,
  };
}

/**
 * 根据端口类型获取连线颜色。
 * 连线颜色由目标端口类型决定。
 */
export function getEdgeColor(targetPortType: PortAssetType): string {
  return getPortColor(targetPortType);
}

/**
 * 连线样式常量。
 * 所有连线统一使用 Bezier 圆端线条、轻底光、透明命中区。
 */
export const EDGE_STYLE = {
  /** 连线描边宽度（不受缩放影响） */
  strokeWidth: 2,
  /** 连线默认透明度 */
  defaultOpacity: 0.6,
  /** 连线悬停透明度 */
  hoverOpacity: 0.9,
  /** 连线选中透明度 */
  selectedOpacity: 1,
  /** 命中区宽度（比视觉更宽，方便操作） */
  hitAreaWidth: 12,
  /** Bezier 曲线偏移比例 */
  bezierOffset: 0.5,
} as const;

/**
 * 从旧快照修复连线。
 * 补齐缺失的 handle 信息，统一连线 ID 格式。
 */
export function repairSnapshotEdges(edges: Connection[]): Connection[] {
  return edges.map((edge) => {
    // 补齐缺失的 ID
    if (!edge.id) {
      edge = { ...edge, id: generateEdgeId() };
    }
    return edge;
  });
}

/**
 * 检查两个节点类型之间的端口是否兼容。
 * 返回兼容的端口对列表。
 */
export function findCompatiblePorts(
  sourceType: string,
  targetType: string
): Array<{ sourceHandle: string; targetHandle: string }> {
  const sourceContract = getPortContract(sourceType as any);
  const targetContract = getPortContract(targetType as any);

  if (!sourceContract || !targetContract) return [];

  const compatible: Array<{ sourceHandle: string; targetHandle: string }> = [];

  for (const sourcePort of sourceContract.outputs) {
    for (const targetPort of targetContract.inputs) {
      if (arePortsCompatible(sourcePort.assetType, targetPort.assetType)) {
        compatible.push({
          sourceHandle: sourcePort.handleId,
          targetHandle: targetPort.handleId,
        });
      }
    }
  }

  return compatible;
}

/**
 * 检查两个节点类型是否可以连接。
 */
export function canConnectNodes(sourceType: string, targetType: string): boolean {
  return findCompatiblePorts(sourceType, targetType).length > 0;
}
