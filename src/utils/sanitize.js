import DOMPurify from 'dompurify';

let hookRegistered = false;

function registerHook() {
  if (hookRegistered) return;
  hookRegistered = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return;
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.tagName === 'IMG') {
      if (!node.hasAttribute('alt')) node.setAttribute('alt', '');
      node.setAttribute('loading', 'lazy');
    }
  });
}

export function sanitizeHtml(dirty) {
  registerHook();
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe'],
    FORBID_ATTR: ['style'],
  });
}
