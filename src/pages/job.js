import { createSaveButton, createCompanyLogo } from '../components/jobCard.js';
import { createEmpty, describeSource } from '../components/status.js';
import { el, qs } from '../utils/dom.js';
import { formatDate, formatRelative, formatSalary } from '../utils/format.js';
import { UA_LABELS, uaEligibility } from '../utils/geo.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import { loadIntoContainer } from './shared.js';

export function parseJobId(search) {
  const raw = new URLSearchParams(search).get('id');
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function fact(label, value) {
  if (!value) return null;
  return el('div', { class: 'facts__item' }, el('dt', {}, label), el('dd', {}, value));
}

export function createJobDetails(job) {
  const eligibility = uaEligibility(job.geo);
  const uaLabel = UA_LABELS[eligibility];
  const salary = formatSalary(job.salary);
  const date = formatDate(job.publishedAt);
  const relative = formatRelative(job.publishedAt);

  const description = el('div', { class: 'prose' });
  if (job.descriptionHtml) {
    description.innerHTML = sanitizeHtml(job.descriptionHtml);
  } else {
    description.append(
      el('p', {}, job.excerpt || 'Повний опис доступний на сторінці вакансії в Jobicy.'),
    );
  }

  return el(
    'article',
    { class: 'job-details', 'aria-labelledby': 'job-title' },
    el(
      'header',
      { class: 'job-details__header' },
      createCompanyLogo(job, true),
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
        {
          class: 'btn btn--primary',
          href: job.url,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
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

export async function initJobPage() {
  const root = qs('#job-root');
  const crumb = qs('#crumb-current');
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

  const load = async (force = false) => {
    const result = await loadIntoContainer(root, {
      skeletons: 1,
      force,
      onRetry: () => load(true),
    });
    if (!result) return;

    const job = result.jobs.find((item) => item.id === id);
    if (!job) {
      root.replaceChildren(
        createEmpty(
          'Вакансію не знайдено',
          'Можливо, її вже закрили або список оновився. Поверніться до каталогу.',
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
