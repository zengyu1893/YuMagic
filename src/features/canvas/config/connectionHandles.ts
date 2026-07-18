/**
 * 画布 React Flow source/target 连接端口 ID 常量。
 * 节点组件、自动连线、LLM 字段级输入槽和快照修复共用。
 */

/** 默认端口 handle ID */
export const DEFAULT_HANDLE = 'default';

/** 字段级输入槽 handle ID */
export const FIELD_HANDLES = {
  /** LLM 系统提示词槽 */
  SYSTEM_PROMPT: 'system-prompt',
  /** LLM 用户输入槽 */
  USER_PROMPT: 'user-prompt',
  /** LLM 素材槽 */
  MEDIA: 'media',
  /** 图片生成 Prompt 槽 */
  IMAGE_GEN_PROMPT: 'image-generation-prompt-target',
  /** 图片生成参考图槽 */
  IMAGE_GEN_REFERENCE: 'image-generation-reference-target',
  /** 视频生成 Prompt 槽 */
  VIDEO_GEN_PROMPT: 'video-generation-prompt-target',
  /** 视频生成参考素材槽 */
  VIDEO_GEN_REFERENCE: 'video-generation-reference-target',
} as const;

/** 输出槽位 handle ID */
export const OUTPUT_SLOTS = {
  /** 主输出槽 */
  PRIMARY: 'primary',
  /** 分支输出槽（并发） */
  BRANCH: 'branch',
} as const;

/**
 * 根据 handle ID 判断是否为字段级输入槽。
 * 字段级输入槽需要特殊连线逻辑（按端口类型筛选上游候选）。
 */
export function isFieldHandle(handleId: string): boolean {
  return Object.values(FIELD_HANDLES).includes(handleId as any);
}

/** 所有已知 handle ID 集合 */
export const ALL_HANDLES = new Set([
  DEFAULT_HANDLE,
  ...Object.values(FIELD_HANDLES),
  ...Object.values(OUTPUT_SLOTS),
]);
