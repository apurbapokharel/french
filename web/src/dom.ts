export type Child = Node | string | null | undefined | false;
type Props = Record<string, string | number | boolean | EventListener | undefined>;

/**
 * Create an element.
 *
 * @param tag element tag name
 * @param props attributes; keys starting with "on" become event listeners, "class" sets className, false and undefined are skipped
 * @param children nodes or text; null, undefined and false are skipped
 * @returns the new element
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "class") el.className = String(value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
  return el;
}

/**
 * Format French text for display.
 *
 * @param text French text with a normal space before ! ? : ;
 * @returns the text with a non-breaking space there, so the mark never wraps onto its own line
 */
export function frText(text: string): string {
  return text.replace(/ ([!?:;»])/g, " $1").replace(/(«) /g, "$1 ");
}

/**
 * Replace an element's children.
 *
 * @param el the element
 * @param children nodes or text; null, undefined and false are skipped
 */
export function fill(el: Element, ...children: Child[]): void {
  el.replaceChildren(...children.filter((child): child is Node | string => child !== null && child !== undefined && child !== false));
}
