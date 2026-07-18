/**
 * DOM 输入目标判断工具。
 * 避免全局快捷键抢占输入框、文本域和可编辑区域的输入焦点。
 * 画布快捷键系统使用此工具判断是否应该拦截按键事件。
 */

/** 输入元素标签 */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** 可编辑属性 */
const EDITABLE_ATTRIBUTES = ['true', 'plaintext-only', ''];

/**
 * 判断目标元素是否为可编辑的输入元素。
 * 如果是，全局快捷键不应拦截其键盘事件。
 *
 * @param target - DOM 事件目标
 * @returns 是否为目标输入元素
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  // 检查标签
  if (INPUT_TAGS.has(target.tagName)) {
    return true;
  }

  // 检查 contenteditable
  if (target.isContentEditable) {
    return true;
  }

  // 检查 role="textbox"
  if (target.getAttribute('role') === 'textbox') {
    return true;
  }

  return false;
}

/**
 * 判断目标元素是否为画布浮动 UI（应避免被画布捕获层拦截）。
 * 带有 data-canvas-floating-ui 属性的元素不参与画布事件。
 */
export function isCanvasFloatingUI(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  return target.closest('[data-canvas-floating-ui]') !== null;
}

/**
 * 判断目标元素是否包含画布端口标记。
 * 端口元素用于拖线/断线/弹菜单。
 */
export function isCanvasPort(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  return target.closest('[data-canvas-port]') !== null;
}
