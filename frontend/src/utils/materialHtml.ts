import { normalizeMaterialContent } from './learningMaterials';

const prefix = '<!--aptis-rich-text-->';
const allowed = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);
const dropped = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH', 'TEMPLATE']);

// Rebuild a small formatting-only vocabulary; never copy source attributes or URLs.
export function sanitizeMaterialHtml(html: string): string {
  const source = new DOMParser().parseFromString(html, 'text/html');
  const output = document.createElement('div');
  function copy(node: Node, parent: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(normalizeMaterialContent(node.textContent ?? '')));
      return;
    }
    if (!(node instanceof Element) || dropped.has(node.tagName)) return;
    const target = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : document.createElement('span');
    if (node instanceof HTMLElement) {
      const style = node.style;
      if (['left', 'center', 'right', 'justify'].includes(style.textAlign)) target.style.textAlign = style.textAlign;
      if (/^(bold|[6-9]00)$/.test(style.fontWeight)) target.style.fontWeight = 'bold';
      if (style.fontStyle === 'italic') target.style.fontStyle = 'italic';
      if (style.textDecoration.includes('underline')) target.style.textDecoration = 'underline';
    }
    parent.appendChild(target);
    node.childNodes.forEach(child => copy(child, target));
  }
  source.body.childNodes.forEach(node => copy(node, output));
  return output.innerHTML;
}

export function materialContentHtml(value: string): string {
  if (value.startsWith(prefix)) return sanitizeMaterialHtml(value.slice(prefix.length));
  const container = document.createElement('div');
  container.textContent = normalizeMaterialContent(value);
  return container.innerHTML.replace(/\n/g, '<br>');
}

export function serializeMaterialHtml(html: string): string {
  const clean = sanitizeMaterialHtml(html);
  const container = document.createElement('div');
  container.innerHTML = clean;
  return container.textContent?.trim() ? prefix + clean : '';
}
