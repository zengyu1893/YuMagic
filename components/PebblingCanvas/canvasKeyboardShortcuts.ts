type EditableLike = {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
  closest?: (selector: string) => unknown;
};

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableLike(target: EventTarget | EditableLike | null | undefined): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const element = target as EditableLike;
  const tagName = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : '';

  if (INPUT_TAGS.has(tagName)) {
    return true;
  }

  if (element.isContentEditable) {
    return true;
  }

  if (element.getAttribute?.('role') === 'textbox') {
    return true;
  }

  return Boolean(element.closest?.('[contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]'));
}

export function shouldIgnoreCanvasShortcut(
  target: EventTarget | EditableLike | null | undefined,
  activeElement: EventTarget | EditableLike | null | undefined,
): boolean {
  return isEditableLike(target) || isEditableLike(activeElement);
}
