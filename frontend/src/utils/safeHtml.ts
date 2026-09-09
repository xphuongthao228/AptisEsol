// Rebuild only simple formatting elements. Never copy attributes, URLs or styles
// from imported answers into the live document.
export function sanitizeAnswerHtml(html: string): string {
  const source = new DOMParser().parseFromString(html, 'text/html');
  const output = document.createElement('div');
  const allowed = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'DIV', 'SPAN', 'BLOCKQUOTE', 'H2', 'H3', 'H4', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH']);
  const discard = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT']);
  function copy(node: Node, parent: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent ?? ''));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (discard.has(element.tagName)) return;
      const target = allowed.has(element.tagName) ? document.createElement(element.tagName.toLowerCase()) : parent;
      if (target !== parent) parent.appendChild(target);
      element.childNodes.forEach((child) => copy(child, target));
    }
  }
  source.body.childNodes.forEach((node) => copy(node, output));
  return output.innerHTML;
}
