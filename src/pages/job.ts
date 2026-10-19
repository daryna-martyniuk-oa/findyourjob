import { createCompanyLogo, createSaveButton } from '../components/jobCard';
import { createEmpty, describeSource } from '../components/status';
import type { Job } from '../types/job';
import { el, qs } from '../utils/dom';
import { formatDate, formatRelative, formatSalary } from '../utils/format';
import { UA_LABELS, uaEligibility } from '../utils/geo';
import { sanitizeHtml } from '../utils/sanitize';
import { loadIntoContainer } from './shared';

export function parseJobId(search: string): number | null {
  const raw = new URLSearchParams(search).get('id');
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function fact(label: string, value: string | HTMLElement | null): HTMLElement | null {
  if (!value) return null;
  return el('div', { class: 'facts__item' }, el('dt', {}, label), el('dd', {}, value));
}

export function createJobDetails(job: Job): HTMLElement {
  const eligibility = uaEligibility(job.geo);
  const uaLabel = UA_LABELS[eligibility];
  const salary = formatSalary(job.salary);
  const date = formatDate(job.publishedAt);
  const relative = formatRelative(job.publishedAt);

  const description = el('div', { class: 'prose' });
  if (job.descriptionHtml) {
    // Єдине місце, де вставляється чужий HTML — лише після очищення DOMPurify.
    description.innerHTML = sanitizeHtml(job.descriptionHtml);
  } else {
    description.append(
      el('p', {}, job.excerpt || 'Повний опис доступний на сторінці вакансії в Jobicy.'),
    );
  }

  const logo = createCompanyLogo(job, true);

  return el(
    'article',
    { class: 'job-details', 'aria-labelledby': 'job-title' },
    el(
      'header',
      { class: 'job-details__header' },
      logo,
      el(
        'div',
        {},
        el('h1', { id: 'job-title' }, job.title),
        el('p', { class: 'job-card__company' }, job.company),
      ),
    ),
    uaLabel ? el('p', { class: `badge badge--${eligibility}` }, uaLabel) : null,
    el(
      'dl',
      { class: 'facts' },
      fact('Регіон', job.geo),
      fact('Тип зайнятості', job.types.join(', ') || null),
      fact('Рівень', job.level),
      fact('Зарплата', salary),
      fact(
        'Опубліковано',
        date ? el('time', { datetime: job.publishedAt }, `${date} (${relative})`) : null,
      ),
      fact('Категорії', job.industries.join(', ') || null),
    ),
    el(
      'div',
      { class: 'job-details__actions' },
      el(
        'a',
        { class: 'btn btn--primary', href: job.url, target: '_blank', rel: 'noopener noreferrer' },
        'Відкрити вакансію на Jobicy',
        el('span', { class: 'visually-hidden' }, ' (відкриється в новій вкладці)'),
      ),
      createSaveButton(job),
    ),
    el('h2', { class: 'section-title' }, 'Опис вакансії'),
    description,
    el(
      'p',
      { class: 'source-note' },
      'Джерело: ',
      el(
        'a',
        { href: job.url, target: '_blank', rel: 'noopener noreferrer' },
        'Jobicy',
        el('span', { class: 'visually-hidden' }, ' (відкриється в новій вкладці)'),
      ),
      '. Подати заявку можна лише на сторінці оригінальної вакансії.',
    ),
  );
}

export async function initJobPage(): Promise<void> {
  const root = qs<HTMLElement>('#job-root');
  const crumb = document.querySelector<HTMLElement>('#crumb-current');
  const id = parseJobId(window.location.search);

  const backLink = el('a', { class: 'btn', href: 'jobs.html' }, 'До каталогу вакансій');

  if (id === null) {
    root.setAttribute('aria-busy', 'false');
    root.replaceChildren(
      createEmpty('Некоректне посилання', 'У посиланні немає номера вакансії.', backLink),
    );
    document.title = 'Вакансію не знайдено — FindYourJob';
    return;
  }

  const load = async (force = false): Promise<void> => {
    const result = await loadIntoContainer(root, {
      skeletons: 1,
      force,
      onRetry: () => void load(true),
    });
    if (!result) return;

    const job = result.jobs.find((item) => item.id === id);
    if (!job) {
      root.replaceChildren(
        createEmpty(
          'Вакансію не знайдено',
          'Можливо, її вже закрили, або список вакансій оновився. Поверніться до каталогу.',
          el('a', { class: 'btn', href: 'jobs.html' }, 'До каталогу вакансій'),
        ),
      );
      document.title = 'Вакансію не знайдено — FindYourJob';
      return;
    }

    document.title = `${job.title} — ${job.company} | FindYourJob`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', job.excerpt || `${job.title} у компанії ${job.company}`);
    if (crumb) crumb.textContent = job.title;
    root.replaceChildren(
      createJobDetails(job),
      el('p', { class: 'data-note' }, describeSource(result)),
    );
  };

  await load();
}
