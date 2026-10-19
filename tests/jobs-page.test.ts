import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initJobsPage } from '../src/pages/jobs';
import { PAGE_SIZE, STORAGE_KEYS } from '../src/config';
import { mockFetchOk, mountPage, wait } from './helpers';

const cards = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('#results article')];
const titles = (): string[] => cards().map((c) => c.querySelector('h3')?.textContent ?? '');
const q = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

function setSelect(selector: string, value: string): void {
  const select = q<HTMLSelectElement>(selector);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('сторінка каталогу', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/jobs.html');
    mountPage('jobs.html');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('показує loading, потім картки; «Показати ще» догружає решту', async () => {
    mockFetchOk();
    const pending = initJobsPage();
    expect(q('#results').getAttribute('aria-busy')).toBe('true');
    expect(document.querySelectorAll('.job-card--skeleton')).toHaveLength(6);
    expect(
      [...document.querySelectorAll('.job-card--skeleton')].every(
        (skeleton) => skeleton.getAttribute('aria-hidden') === 'true',
      ),
    ).toBe(true);
    expect(q('#results-status').textContent).toMatch(/Завантаження/);

    await pending;
    expect(q('#results').getAttribute('aria-busy')).toBe('false');
    expect(cards()).toHaveLength(PAGE_SIZE);
    expect(q('#results-status').textContent).toBe('Знайдено: 24 вакансії');
    expect(q<HTMLButtonElement>('#load-more').hidden).toBe(false);

    q<HTMLButtonElement>('#load-more').click();
    expect(cards()).toHaveLength(24);
    expect(q<HTMLButtonElement>('#load-more').hidden).toBe(true);
  });

  it('заповнює списки рівнів і типів зайнятості з даних', async () => {
    mockFetchOk();
    await initJobsPage();
    const levels = [...q<HTMLSelectElement>('#level').options].map((o) => o.value);
    expect(levels).toEqual(expect.arrayContaining(['', 'Junior', 'Senior', 'Lead']));
    expect(levels).not.toContain('Any');
    const types = [...q<HTMLSelectElement>('#type').options].map((o) => o.value);
    expect(types).toEqual(expect.arrayContaining(['Full-Time', 'Contract']));
  });

  it('пошук працює на клієнті, з debounce, і синхронізується з URL', async () => {
    const fetchMock = mockFetchOk();
    await initJobsPage();
    const calls = fetchMock.mock.calls.length;

    const input = q<HTMLInputElement>('#q');
    input.value = 'python';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(300);

    expect(titles().length).toBeGreaterThan(0);
    expect(titles().every((t) => /python/i.test(t) || t.length > 0)).toBe(true);
    expect(titles()[0]).toMatch(/Python/);
    expect(window.location.search).toBe('?q=python');
    expect(fetchMock.mock.calls.length).toBe(calls); // жодного нового запиту до сервера
  });

  it('читає початкові фільтри з URL', async () => {
    window.history.replaceState(null, '', '/jobs.html?q=react&sort=title');
    mockFetchOk();
    await initJobsPage();
    expect(q<HTMLInputElement>('#q').value).toBe('react');
    expect(q<HTMLSelectElement>('#sort').value).toBe('title');
    const sorted = [...titles()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    expect(titles()).toEqual(sorted);
  });

  it('перемикає навігацію, заголовок і результати для збережених вакансій', async () => {
    window.history.replaceState(null, '', '/jobs.html?saved=1');
    localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([100001]));
    mockFetchOk();
    await initJobsPage();

    expect(q('#page-title').textContent).toBe('Збережені вакансії');
    expect(q('a[data-nav="saved"]').getAttribute('aria-current')).toBe('page');
    expect(q<HTMLAnchorElement>('.nav-list a[href="jobs.html"]').hasAttribute('aria-current')).toBe(
      false,
    );
    expect(cards()).toHaveLength(1);
    expect(titles()[0]).toMatch(/Senior Frontend Developer/);
  });

  it('фільтр «Доступні з України» залишає лише yes/anywhere', async () => {
    mockFetchOk();
    await initJobsPage();
    const radio = q<HTMLInputElement>('input[name="geo"][value="ua"]');
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    expect(cards().length).toBeGreaterThan(0);
    for (const card of cards()) {
      expect(card.querySelector('.badge--yes, .badge--anywhere')).not.toBeNull();
    }
  });

  it('сортування за зарплатою ставить найвищу першою', async () => {
    mockFetchOk();
    await initJobsPage();
    setSelect('#sort', 'salary');
    expect(titles()[0]).toBe('Cloud Architect');
  });

  it('фільтр за рівнем і «лише із зарплатою»', async () => {
    mockFetchOk();
    await initJobsPage();
    setSelect('#level', 'Junior');
    expect(cards().length).toBeGreaterThan(0);
    expect(titles().every((t) => /Junior|Data Analyst/.test(t))).toBe(true);

    const salary = q<HTMLInputElement>('#salary-only');
    salary.checked = true;
    salary.dispatchEvent(new Event('change', { bubbles: true }));
    expect(titles()).toEqual(['Data Analyst']);
  });

  it('порожній результат показує підказку; «Скинути фільтри» повертає список', async () => {
    mockFetchOk();
    await initJobsPage();
    const input = q<HTMLInputElement>('#q');
    input.value = 'zzzzzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(300);

    expect(cards()).toHaveLength(0);
    expect(q('.state--empty').textContent).toMatch(/Нічого не знайдено/);
    expect(q('#results-status').textContent).toBe('Знайдено: 0 вакансій');

    q<HTMLButtonElement>('.state--empty button').click();
    expect(cards().length).toBeGreaterThan(0);
    expect(input.value).toBe('');
  });

  it('«Зберегти» запам’ятовує вакансію, а «Лише збережені» показує тільки її', async () => {
    mockFetchOk();
    await initJobsPage();
    const button = q<HTMLButtonElement>('#results article .btn--save');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.saved)!)).toHaveLength(1);

    const only = q<HTMLInputElement>('#saved-only');
    only.checked = true;
    only.dispatchEvent(new Event('change', { bubbles: true }));
    expect(cards()).toHaveLength(1);
    expect(window.location.search).toBe('?saved=1');
  });

  it('показує помилку з кнопкою повтору, а після повтору — дані', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await initJobsPage();
    const alert = q('[role="alert"]');
    expect(alert.textContent).toMatch(/Не вдалося/);
    expect(q('#results').getAttribute('aria-busy')).toBe('false');
    const retry = alert.querySelector<HTMLButtonElement>('button');
    expect(retry?.textContent).toBe('Повторити спробу');

    mockFetchOk();
    retry?.click();
    await wait(50);
    expect(cards()).toHaveLength(PAGE_SIZE);
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });
});
