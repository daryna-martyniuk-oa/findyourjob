import { STORAGE_KEYS } from '../config.js';

export function currentTheme() {
  const attr = document.documentElement.dataset.theme;
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
  }
}

export function initTheme() {
  const button = document.querySelector('#theme-toggle');
  if (!button) return;
  const sync = () => button.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  sync();
  button.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    sync();
  });
}
