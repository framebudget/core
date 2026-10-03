/** Inline styles only, so the panel looks the same on any page. */
export function createElement(tag: string, style: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  element.setAttribute("style", style);
  if (text !== undefined) element.textContent = text;
  return element;
}
