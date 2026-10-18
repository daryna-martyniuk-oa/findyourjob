import { getSaved, toggleSaved } from '../state/saved.js';
import { el } from '../utils/dom.js';
import { formatRelative, formatSalary } from '../utils/format.js';
import { UA_LABELS, uaEligibility } from '../utils/geo.js';

export function jobUrl(job) {
  return `job.html?id=${job.id}`;
}

function companyInitials(company) {
  const words = company.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1)
    return words
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('');
  return (words[0] ?? '?').slice(0, 2).toUpperCase();
}

export function createCompanyLogo(job, large = false) {
  const initials = companyInitials(job.company);
  const logo = el(
    'span',
    {
      class: `company-logo${large ? ' company-logo--large' : ''}${job.logo ? '' : ' company-logo--fallback'}`,
      'aria-hidden': 'true',
    },
    job.logo
      ? el('img', {
          src: job.logo,
          alt: '',
          width: large ? 56 : 44,
          height: large ? 56 : 44,
          loading: 'lazy',
          decoding: 'async',
        })
      : initials,
  );

  if (job.logo) {
    logo.querySelector('img')?.addEventListener(
      'error',
      () => {
        logo.replaceChildren(document.createTextNode(initials));
        logo.classList.add('company-logo--fallback');
      },
      { once: true },
    );
  }

  return logo;
}

export function createSaveButton(job, onChange) {
  const isSaved = getSaved().has(job.id);
  const button = el(
    'button',
    {
      type: 'button',
      class: 'btn btn--save',
      'aria-pressed': String(isSaved),
      'aria-label': `${isSaved ? 'Прибрати зі збережених' : 'Зберегти вакансію'}: ${job.title}`,
    },
    el('span', { class: 'btn__icon', 'aria-hidden': 'true' }),
    el('span', { class: 'btn__label' }, isSaved ? 'Прибрати' : 'Зберегти'),
  );
  button.addEventListener('click', () => {
    const saved = toggleSaved(job.id);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute(
      'aria-label',
      `${saved ? 'Прибрати зі збережених' : 'Зберегти вакансію'}: ${job.title}`,
    );
    button.querySelector('.btn__label').textContent = saved ? 'Прибрати' : 'Зберегти';
    onChange?.(saved);
  });
  return button;
}

export function createJobCard(job, options = {}) {
  const titleId = `job-title-${job.id}`;
  const eligibility = uaEligibility(job.geo);
  const uaLabel = UA_LABELS[eligibility];
  const salary = formatSalary(job.salary);
  const heading = options.headingLevel === 2 ? 'h2' : 'h3';

  const logo = createCompanyLogo(job);

  const badges = el(
    'ul',
    { class: 'badges', role: 'list' },
    uaLabel ? el('li', { class: `badge badge--${eligibility}` }, uaLabel) : null,
    ...job.types.map((type) => el('li', { class: 'badge' }, type)),
    job.level ? el('li', { class: 'badge' }, job.level) : null,
  );

  const published = formatRelative(job.publishedAt);
  const footer = el(
    'div',
    { class: 'job-card__footer' },
    el(
      'div',
      { class: 'job-card__facts' },
      salary ? el('span', { class: 'job-card__salary' }, salary) : null,
      published
        ? el(
            'time',
            {
              datetime: job.publishedAt,
              class: `job-card__date${published === 'сьогодні' ? ' job-card__date--today' : ''}`,
            },
            published === 'сьогодні' ? 'Опубліковано сьогодні' : published,
          )
        : null,
    ),
    createSaveButton(job, (saved) => options.onSaveChange?.(job, saved)),
  );

  return el(
    'article',
    {
      class: 'job-card',
      'aria-labelledby': titleId,
    },
    el(
      'header',
      { class: 'job-card__header' },
      logo,
      el(
        'div',
        {},
        el(
          heading,
          { class: 'job-card__title', id: titleId },
          el('a', { href: jobUrl(job) }, job.title),
        ),
        el('p', { class: 'job-card__company' }, job.company),
      ),
    ),
    badges,
    el('p', { class: 'job-card__geo' }, job.geo),
    job.excerpt ? el('p', { class: 'job-card__excerpt' }, job.excerpt) : null,
    footer,
  );
}
