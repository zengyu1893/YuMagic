/**
 * 画布节点上下游资产收集服务。
 * 支持按 target handle 和连线创建顺序收集字段级输入资产。
 * 执行器调用此服务获取上游数据，再传给具体 executor。
 */

import type { CanvasNode, Connection } from '../../../types/pebblingTypes';
import type { UpstreamAsset, PortAssetType } from '../types/canvas.types';
import { getPortContract } from '../config/portTypes';
import { DEFAULT_HANDLE, FIELD_HANDLES } from '../config/connectionHandles';

/**
 * 按连线收集指定节点的上游资产。
 * 返回按 target handle 分组的资产映射。
 *
 * @param nodeId - 目标节点 ID
 * @param nodes - 所有节点
 * @param connections - 所有连线
 * @returns Map<targetHandle, UpstreamAsset[]>
 */
export function collectUpstreamAssets(
  nodeId: string,
  nodes: CanvasNode[],
  connections: Connection[]
): Map<string, UpstreamAsset[]> {
  const result = new Map<string, UpstreamAsset[]>();

  // 找到所有连向此节点的连线
  const incomingEdges = connections.filter((c) => c.toNode === nodeId);

  // 按连线创建顺序（即 connections 数组顺序）处理
  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((n) => n.id === edge.fromNode);
    if (!sourceNode) continue;

    const targetHandle = edge.toPortKey || DEFAULT_HANDLE;
    const assets = extractNodeAssets(sourceNode);

    if (assets.length > 0) {
      const existing = result.get(targetHandle) || [];
      result.set(targetHandle, [...existing, ...assets]);
    }
  }

  return result;
}

/**
 * 从节点提取其产出资产。
 * 根据节点类型和内容推断资产类型。
 */
function extractNodeAssets(node: CanvasNode): UpstreamAsset[] {
  const assets: UpstreamAsset[] = [];
  const contract = getPortContract(node.type);

  if (!contract || contract.outputs.length === 0) return assets;

  const outputType = contract.outputs[0].assetType;

  switch (outputType) {
    case 'text':
      if (node.content || node.data?.output) {
        assets.push({
          type: 'text',
          value: node.data?.output || node.content,
          sourceNodeId: node.id,
          metadata: {
            title: node.title,
            nodeType: node.type,
          },
        });
      }
      break;

    case 'image':
      if (node.content) {
        // 处理图片 URL（可能是字符串或数组）
        const imageUrls = extractImageUrls(node);
        for (const url of imageUrls) {
          assets.push({
            type: 'image',
            value: url,
            sourceNodeId: node.id,
            metadata: {
              title: node.title,
              nodeType: node.type,
              ...(node.data?.imageMetadata || {}),
            },
          });
        }
      }
      break;

    case 'video':
      if (node.content || node.data?.videoUrl) {
        assets.push({
          type: 'video',
          value: node.data?.videoUrl || node.content,
          sourceNodeId: node.id,
          metadata: {
            title: node.title,
            nodeType: node.type,
          },
        });
      }
      break;

    case 'mixed':
      // mixed 类型尝试提取所有可能的内容
      if (node.content) {
        const imageUrls = extractImageUrls(node);
        if (imageUrls.length > 0) {
          for (const url of imageUrls) {
            assets.push({
              type: 'image',
              value: url,
              sourceNodeId: node.id,
              metadata: { title: node.title, nodeType: node.type },
            });
          }
        } else {
          assets.push({
            type: 'text',
            value: node.data?.output || node.content,
            sourceNodeId: node.id,
            metadata: { title: node.title, nodeType: node.type },
          });
        }
      }
      if (node.data?.videoUrl) {
        assets.push({
          type: 'video',
          value: node.data.videoUrl,
          sourceNodeId: node.id,
          metadata: { title: node.title, nodeType: node.type },
        });
      }
      break;
  }

  return assets;
}

/** 从节点提取所有图片 URL */
function extractImageUrls(node: CanvasNode): string[] {
  const urls: string[] = [];

  // output 节点有 outputImages 数组
  if (node.data?.outputImages && node.data.outputImages.length > 0) {
    urls.push(...node.data.outputImages);
  }
  // 普通图片节点，content 可能是单个 URL
  else if (node.content && isImageUrl(node.content)) {
    urls.push(node.content);
  }

  return urls;
}

/** 判断字符串是否为图片 URL */
function isImageUrl(str: string): boolean {
  return (
    str.startsWith('data:image/') ||
    str.startsWith('/files/') ||
    str.startsWith('http') ||
    str.startsWith('blob:')
  );
}

/**
 * 构建资源依赖图。
 * 返回从每个节点 ID 到其上游节点 ID 列表的映射。
 */
export function buildDependencyGraph(
  nodes: CanvasNode[],
  connections: Connection[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const node of nodes) {
    graph.set(node.id, []);
  }

  for (const conn of connections) {
    const deps = graph.get(conn.toNode) || [];
    if (!deps.includes(conn.fromNode)) {
      deps.push(conn.fromNode);
    }
    graph.set(conn.toNode, deps);
  }

  return graph;
}

/**
 * 拓扑排序 — 确定执行顺序。
 * 返回按依赖关系排序的节点 ID 列表。
 */
export function topologicalSort(
  nodeIds: string[],
  dependencyGraph: Map<string, string[]>
): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(id: string): boolean {
    if (visited.has(id)) return true;
    if (visiting.has(id)) return false; // 环路检测
    visiting.add(id);

    const deps = dependencyGraph.get(id) || [];
    for (const dep of deps) {
      if (!visit(dep)) return false;
    }

    visiting.delete(id);
    visited.add(id);
    sorted.push(id);
    return true;
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) {
      if (!visit(id)) {
        console.error('[workflowAssetGraph] 检测到环路依赖');
        return nodeIds; // 环路时返回原始顺序
      }
    }
  }

  return sorted;
}
