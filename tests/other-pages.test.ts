import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initLayout } from '../src/components/layout';
import { initHomePage } from '../src/pages/home';
import { initJobPage, parseJobId } from '../src/pages/job';
import { toggleSaved } from '../src/state/saved';
import { STORAGE_KEYS } from '../src/config';
import { mockFetchOk, mountPage } from './helpers';

const q = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

describe('головна сторінка', () => {
  beforeEach(() => {
    localStorage.clear();
    mountPage('index.html');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('показує кількість вакансій та шість оголошень', async () => {
    mockFetchOk();
    await initHomePage();
    expect(q('#stats').textContent).toBe('Вакансій у каталозі: 24.');
    const cards = document.querySelectorAll('#latest article');
    expect(cards).toHaveLength(6);
    expect(cards[0]?.querySelector('h3')?.textContent).toBe('Senior Frontend Developer (React)');
    expect(q('#data-note').textContent).toMatch(/Jobicy/);
  });

  it('швидкі фільтри заповнюють поле пошуку', async () => {
    mockFetchOk();
    await initHomePage();

    const input = q<HTMLInputElement>('#hero-q');
    q<HTMLButtonElement>('.quick-filter[data-query="TypeScript"]').click();
    expect(input.value).toBe('TypeScript');
    expect(document.activeElement).toBe(input);
  });

  it('при помилці показує повідомлення з кнопкою повтору', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('x', { status: 500 })),
    );
    await initHomePage();
    const error = q('[role="alert"]');
    expect(error.textContent).toMatch(/помилку/);
    expect(error.querySelector('h3')?.textContent).toBe('Не вдалося завантажити вакансії');
    expect(error.querySelector('button')?.textContent).toBe('Повторити спробу');
  });
});

describe('сторінка вакансії', () => {
  beforeEach(() => {
    localStorage.clear();
    mountPage('job.html');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('parseJobId приймає лише цілі числа', () => {
    expect(parseJobId('?id=123')).toBe(123);
    expect(parseJobId('?id=abc')).toBeNull();
    expect(parseJobId('?id=1;drop')).toBeNull();
    expect(parseJobId('')).toBeNull();
  });

  it('відображає деталі, безпечний опис і посилання на Jobicy', async () => {
    window.history.replaceState(null, '', '/job.html?id=100001');
    mockFetchOk();
    await initJobPage();

    expect(q('h1').textContent).toBe('Senior Frontend Developer (React)');
    expect(document.title).toContain('Northwind Labs');
    expect(q('.facts').textContent).toMatch(/Europe, Ukraine/);
    expect(q('.badge--yes').textContent).toBe('Доступно з України');

    const prose = q('.prose');
    expect(prose.querySelector('script')).toBeNull();
    expect(prose.querySelector('[onerror]')).toBeNull();
    expect(prose.textContent).toContain('Remote-first team');

    const apply = q<HTMLAnchorElement>('.job-details__actions a');
    expect(apply.href).toBe('https://jobicy.com/');
    expect(apply.rel).toContain('noopener');
  });

  it('невідомий id → «Вакансію не знайдено»', async () => {
    window.history.replaceState(null, '', '/job.html?id=999');
    mockFetchOk();
    await initJobPage();
    expect(q('#job-root').textContent).toMatch(/Вакансію не знайдено/);
  });

  it('некоректний id → зрозуміле повідомлення без запитів до API', async () => {
    window.history.replaceState(null, '', '/job.html?id=oops');
    const fetchMock = mockFetchOk();
    await initJobPage();
    expect(q('#job-root').textContent).toMatch(/Некоректне посилання/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('спільна шапка', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    mountPage('index.html');
    initLayout();
  });

  it('перемикач теми змінює data-theme і запам’ятовує вибір', () => {
    const button = q<HTMLButtonElement>('#theme-toggle');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
    button.click();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('лічильник збережених оновлюється одразу після зміни', () => {
    const badge = q('#saved-count');
    expect(badge.hidden).toBe(true);
    toggleSaved(5);
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe('1');
    toggleSaved(5);
    expect(badge.hidden).toBe(true);
  });
});
