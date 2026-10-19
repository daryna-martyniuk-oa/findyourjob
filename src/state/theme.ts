import { STORAGE_KEYS } from '../config';

export type Theme = 'light' | 'dark';

export function currentTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    //ignore
  }
}

export function initTheme(): void {
  const button = document.querySelector<HTMLButtonElement>('#theme-toggle');
  if (!button) return;
  const sync = (): void => button.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  sync();
  button.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    sync();
  });
}
