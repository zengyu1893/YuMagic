/**
 * 日期格式化工具。
 * 供历史记录、任务列表、项目面板等模块共用。
 */

/**
 * 格式化为 "YYYY-MM-DD HH:mm:ss" 格式。
 */
export function formatDateTime(date: Date | number | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 格式化为相对时间（如"3分钟前"、"2小时前"）。
 */
export function formatRelativeTime(date: Date | number | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const now = Date.now();
  const diff = now - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return formatDateTime(d);
}

/**
 * 格式化为简短日期（如"06-27"）。
 */
export function formatShortDate(date: Date | number | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 格式化耗时为 "X.X 秒"。
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(3)}秒`;
}
