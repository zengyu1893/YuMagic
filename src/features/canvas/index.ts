/**
 * Canvas Feature — 统一导出入口。
 *
 * 当前状态：画布核心逻辑仍在 PebblingCanvas/ 目录。
 * 此模块提供的注册表/工厂/服务是实现新架构的迁移目标。
 */

// Types
export type {
  PortAssetType,
  PortDirection,
  PortDeclaration,
  NodePortContract,
  NodeTemplate,
  NodeRendererMeta,
  ExecutionContext,
  UpstreamAsset,
  ExecutionResult,
  NodeExecutor,
  CanvasSnapshot,
} from './types/canvas.types';

// Config
export {
  PORT_TYPE_COLORS,
  getPortColor,
  getPortLabel,
  NODE_PORT_CONTRACTS,
  arePortsCompatible,
  getPortContract,
  getInputPorts,
  getOutputPorts,
} from './config/portTypes';

export {
  NODE_TEMPLATES,
  getNodeTemplate,
} from './config/nodeTemplates';

export {
  NODE_RENDERER_REGISTRY,
  getNodeRendererMeta,
  isNodeRendererRegistered,
} from './config/nodeRendererRegistry';

export {
  NODE_EXECUTOR_REGISTRY,
  EXECUTABLE_NODE_TYPES,
  registerNodeExecutor,
  registerNodeExecutors,
  getNodeExecutor,
  isNodeExecutable,
  isNodeExecutorRegistered,
} from './config/nodeExecutorRegistry';

export {
  CREATE_NODE_COMMANDS,
  COMMAND_GROUP_CONFIG,
  getCommandsByGroup,
  findCommand,
  getCommandGroups,
} from './config/createNodeCommands';
export type { CreateNodeCommand, NodeCommandGroup } from './config/createNodeCommands';

export {
  DEFAULT_HANDLE,
  FIELD_HANDLES,
  OUTPUT_SLOTS,
  isFieldHandle,
  ALL_HANDLES,
} from './config/connectionHandles';

// Services
export {
  createDefaultNode,
  allocateNodeId,
  sanitizeNode,
  sanitizeNodes,
  cleanExpiredRunningStatus,
  createOutputMaterialNode,
  resetNodeIdCounter,
} from './services/canvasNodeFactory';

export {
  createEdge,
  getEdgeColor,
  EDGE_STYLE,
  repairSnapshotEdges,
  findCompatiblePorts,
  canConnectNodes,
} from './services/canvasEdgeFactory';
export type { CreateEdgeOptions } from './services/canvasEdgeFactory';

export {
  collectUpstreamAssets,
  buildDependencyGraph,
  topologicalSort,
} from './services/workflowAssetGraph';

export {
  executeNode,
} from './services/workflowNodeExecutor';
export type { ExecuteNodeParams } from './services/workflowNodeExecutor';

export {
  runToNode,
} from './services/workflowRunner';
export type { WorkflowRunOptions, WorkflowRunResult } from './services/workflowRunner';
