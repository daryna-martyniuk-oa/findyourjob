import { ApiError } from '../api/jobicy';
import type { LoadResult } from '../types/job';
import { formatRelative } from '../utils/format';
import { el } from '../utils/dom';

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'timeout':
        return 'Сервіс вакансій відповідає надто довго. Спробуйте ще раз за хвилину.';
      case 'http':
        return `Сервіс вакансій повернув помилку (код ${error.status ?? '—'}). Спробуйте пізніше.`;
      case 'parse':
        return 'Сервіс вакансій надіслав відповідь у неочікуваному форматі.';
      case 'network':
        return 'Не вдалося зʼєднатися з сервісом вакансій. Перевірте інтернет і спробуйте ще раз.';
    }
  }
  return 'Сталася непередбачена помилка. Спробуйте ще раз.';
}

export function createError(message: string, onRetry: () => void): HTMLElement {
  const retry = el('button', { type: 'button', class: 'btn btn--primary' }, 'Повторити спробу');
  retry.addEventListener('click', onRetry);
  return el(
    'div',
    { class: 'state state--error', role: 'alert' },
    el('h3', { class: 'state__title' }, 'Не вдалося завантажити вакансії'),
    el('p', {}, message),
    retry,
  );
}

export function createEmpty(title: string, hint: string, action?: HTMLElement): HTMLElement {
  return el(
    'div',
    { class: 'state state--empty' },
    el('h3', { class: 'state__title' }, title),
    el('p', {}, hint),
    action,
  );
}

export function describeSource(result: LoadResult, now: Date = new Date()): string {
  if (result.isSnapshot) return result.message ?? '';

  const when = formatRelative(new Date(result.fetchedAt).toISOString(), now);
  switch (result.source) {
    case 'network':
      return 'Дані щойно оновлено з Jobicy.';
    case 'cache':
      return `Дані з локального кешу (оновлено ${when}). Кеш діє 1 годину, як рекомендує Jobicy.`;
    case 'stale-cache':
      return `Не вдалося оновити дані — показано збережену копію (${when}).`;
  }
}
