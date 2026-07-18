/**
 * 项目内置模型注册表类型。
 * 模型列表不在用户设置里编辑，在此集中管理。
 * 新增/删除/修改模型时只改 builtinModelRegistry.ts。
 *
 * 当前状态：迁移目标。
 */

/** 模型类型 */
export type ModelType = 'chat' | 'image' | 'video' | 'music' | 'speech';

/** 内置模型条目 */
export interface BuiltinModelEntry {
  /** 唯一标识，如 'gpt-image-2' */
  id: string;
  /** 显示名称 */
  name: string;
  /** 模型类型 */
  type: ModelType;
  /** 供应商名称 */
  provider: string;
  /** 是否默认启用 */
  enabled: boolean;
  /** 分组标签（如 'GPT2', '香蕉2', 'RH'） */
  group: string;
  /** 是否为 RH (RunningHub) 模型 */
  isRunningHub: boolean;
  /** RH 专属字段：endpoint */
  rhEndpoint?: string;
  /** 支持的参数 */
  supportedParams: string[];
}

/** 内置模型注册表 */
export interface BuiltinModelRegistry {
  version: number;
  chat: BuiltinModelEntry[];
  image: BuiltinModelEntry[];
  video: BuiltinModelEntry[];
  music: BuiltinModelEntry[];
  speech: BuiltinModelEntry[];
}
