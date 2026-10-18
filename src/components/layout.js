import { SAVED_EVENT, getSaved } from '../state/saved.js';
import { initTheme } from '../state/theme.js';

function updateSavedCount() {
  const badge = document.querySelector('#saved-count');
  if (!badge) return;
  const count = getSaved().size;
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

export function initLayout() {
  initTheme();
  updateSavedCount();
  window.addEventListener(SAVED_EVENT, updateSavedCount);
  window.addEventListener('storage', updateSavedCount);
}
