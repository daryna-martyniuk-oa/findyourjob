import { STORAGE_KEYS } from '../config';
import { logger } from '../utils/logger';

export type Theme = 'light' | 'dark';

let clickHandlerRegistered = false;

export function currentTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (error) {
    logger.warn('Theme preference could not be read from local storage', error);
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch (error) {
    logger.warn('Theme preference could not be saved to local storage', error);
  }
}

export function initTheme(): void {
  document.documentElement.dataset.theme = currentTheme();

  document.querySelectorAll<HTMLButtonElement>('#theme-toggle').forEach((button) => {
    button.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  });

  if (clickHandlerRegistered) return;
  clickHandlerRegistered = true;

  document.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('#theme-toggle');
    if (!button) return;

    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    button.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  });
}
