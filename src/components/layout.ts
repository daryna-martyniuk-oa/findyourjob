import { SAVED_EVENT, getSaved } from '../state/saved';
import { initTheme } from '../state/theme';

function updateSavedCount(): void {
  const badge = document.querySelector<HTMLElement>('#saved-count');
  if (!badge) return;
  const count = getSaved().size;
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

export function initLayout(): void {
  initTheme();
  updateSavedCount();
  window.addEventListener(SAVED_EVENT, updateSavedCount);
  window.addEventListener('storage', updateSavedCount);
}
