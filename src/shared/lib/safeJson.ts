/**
 * JSON 安全解析工具。
 * 避免 JSON.parse 抛出未捕获异常导致页面崩溃。
 */

/**
 * 安全 JSON 解析，失败时返回默认值。
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 安全 JSON 序列化，失败时返回 '{}'。
 */
export function safeJsonStringify(value: unknown, pretty = false): string {
  try {
    return JSON.stringify(value, null, pretty ? 2 : 0);
  } catch {
    return '{}';
  }
}
