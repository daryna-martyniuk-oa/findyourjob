import { PAGE_SIZE, SORT_LABELS } from '../config';
import { createJobCard } from '../components/jobCard';
import { createEmpty, describeSource } from '../components/status';
import { getSaved } from '../state/saved';
import type { Filters, GeoMode, SortKey } from '../types/filters';
import type { Job } from '../types/job';
import { debounce } from '../utils/debounce';
import { el, qs } from '../utils/dom';
import { collectOptions, filterJobs, sortJobs } from '../utils/filter';
import { pluralUk } from '../utils/format';
import { DEFAULT_FILTERS, parseFilters, serializeFilters } from '../utils/url-state';
import { loadIntoContainer } from './shared';

interface Ui {
  title: HTMLElement;
  panel: HTMLDetailsElement;
  form: HTMLFormElement;
  query: HTMLInputElement;
  level: HTMLSelectElement;
  type: HTMLSelectElement;
  salaryOnly: HTMLInputElement;
  savedOnly: HTMLInputElement;
  sort: HTMLSelectElement;
  reset: HTMLButtonElement;
  status: HTMLElement;
  results: HTMLElement;
  loadMore: HTMLButtonElement;
  note: HTMLElement;
}

function getUi(): Ui {
  return {
    title: qs('#page-title'),
    panel: qs('#filters-panel'),
    form: qs('#filters-form'),
    query: qs('#q'),
    level: qs('#level'),
    type: qs('#type'),
    salaryOnly: qs('#salary-only'),
    savedOnly: qs('#saved-only'),
    sort: qs('#sort'),
    reset: qs('#reset'),
    status: qs('#results-status'),
    results: qs('#results'),
    loadMore: qs('#load-more'),
    note: qs('#data-note'),
  };
}

function fillSelect(
  select: HTMLSelectElement,
  allLabel: string,
  values: readonly string[],
  selected: string,
): void {
  select.replaceChildren(
    el('option', { value: '' }, allLabel),
    ...values.map((value) => el('option', { value }, value)),
  );
  select.value = selected;
}

function isGeoMode(value: string): value is GeoMode {
  return value === 'all' || value === 'ua' || value === 'europe' || value === 'north-america';
}

function isSortKey(value: string): value is SortKey {
  return Object.hasOwn(SORT_LABELS, value);
}

export async function initJobsPage(): Promise<void> {
  const ui = getUi();
  let filters: Filters = parseFilters(window.location.search);
  let jobs: Job[] = [];
  let visible = PAGE_SIZE;

  ui.sort.replaceChildren(
    ...(Object.keys(SORT_LABELS) as SortKey[]).map((key) =>
      el('option', { value: key }, SORT_LABELS[key]),
    ),
  );

  ui.panel.open = window.matchMedia?.('(min-width: 56rem)').matches ?? true;

  const writeControls = (): void => {
    ui.query.value = filters.query;
    ui.salaryOnly.checked = filters.salaryOnly;
    ui.savedOnly.checked = filters.savedOnly;
    ui.sort.value = filters.sort;
    ui.form.querySelectorAll<HTMLInputElement>('input[name="geo"]').forEach((radio) => {
      radio.checked = radio.value === filters.geo;
    });
  };

  const readControls = (): Filters => {
    const selectedGeo =
      ui.form.querySelector<HTMLInputElement>('input[name="geo"]:checked')?.value ?? '';
    const selectedSort = ui.sort.value;
    return {
      query: ui.query.value.trim(),
      level: ui.level.value,
      type: ui.type.value,
      geo:
        selectedGeo === 'ua-eu'
          ? 'europe'
          : isGeoMode(selectedGeo)
            ? selectedGeo
            : DEFAULT_FILTERS.geo,
      salaryOnly: ui.salaryOnly.checked,
      savedOnly: ui.savedOnly.checked,
      sort: isSortKey(selectedSort) ? selectedSort : DEFAULT_FILTERS.sort,
    };
  };

  const syncUrl = (): void => {
    const search = serializeFilters(filters);
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  };

  const syncPageMode = (): void => {
    ui.title.textContent = filters.savedOnly ? 'Збережені вакансії' : 'Каталог вакансій';
    document.title = `${ui.title.textContent} — FindYourJob`;
    document.querySelectorAll<HTMLAnchorElement>('.nav-list a').forEach((link) => {
      link.removeAttribute('aria-current');
    });
    const currentLink = document.querySelector<HTMLAnchorElement>(
      filters.savedOnly ? '.nav-list a[data-nav="saved"]' : '.nav-list a[href="jobs.html"]',
    );
    currentLink?.setAttribute('aria-current', 'page');
  };

  const render = (): void => {
    syncPageMode();
    const savedIds = getSaved();
    const matches = sortJobs(filterJobs(jobs, filters, savedIds), filters.sort, filters.query);

    ui.status.textContent = `Знайдено: ${matches.length} ${pluralUk(matches.length, ['вакансія', 'вакансії', 'вакансій'])}`;

    if (matches.length === 0) {
      const resetButton = el('button', { type: 'button', class: 'btn' }, 'Скинути фільтри');
      resetButton.addEventListener('click', resetFilters);
      ui.results.replaceChildren(
        createEmpty(
          filters.savedOnly ? 'Збережених вакансій немає' : 'Нічого не знайдено',
          filters.savedOnly
            ? 'Натисніть «Зберегти» на картці вакансії, і вона зʼявиться тут.'
            : 'Спробуйте інше слово в пошуку або приберіть частину фільтрів.',
          resetButton,
        ),
      );
      ui.loadMore.hidden = true;
      return;
    }

    ui.results.replaceChildren(
      ...matches.slice(0, visible).map((job) =>
        createJobCard(job, {
          onSaveChange: () => {
            // У режимі «лише збережені» картка зникає — повертаємо фокус у список.
            if (filters.savedOnly) {
              render();
              ui.results.focus();
            }
          },
        }),
      ),
    );

    const rest = matches.length - visible;
    ui.loadMore.hidden = rest <= 0;
    ui.loadMore.textContent = `Показати ще ${Math.min(PAGE_SIZE, Math.max(rest, 0))} (залишилось ${Math.max(rest, 0)})`;
  };

  const applyFilters = (): void => {
    filters = readControls();
    visible = PAGE_SIZE;
    syncUrl();
    render();
  };

  function resetFilters(): void {
    filters = { ...DEFAULT_FILTERS };
    writeControls();
    ui.level.value = '';
    ui.type.value = '';
    visible = PAGE_SIZE;
    syncUrl();
    render();
    ui.query.focus();
  }

  ui.query.addEventListener('input', debounce(applyFilters, 200));
  ui.form.addEventListener('change', (event) => {
    if (event.target !== ui.query) applyFilters();
  });
  ui.form.addEventListener('submit', (event) => event.preventDefault());
  ui.reset.addEventListener('click', resetFilters);
  ui.loadMore.addEventListener('click', () => {
    visible += PAGE_SIZE;
    render();
  });
  window.addEventListener('storage', () => {
    if (filters.savedOnly) render();
  });

  syncPageMode();
  writeControls();

  const load = async (force = false): Promise<void> => {
    ui.loadMore.hidden = true;
    const result = await loadIntoContainer(ui.results, {
      skeletons: 6,
      force,
      onRetry: () => void load(true),
      onStatus: (text) => {
        ui.status.textContent = text;
      },
    });
    if (!result) {
      ui.note.textContent = '';
      return;
    }

    jobs = result.jobs;
    fillSelect(ui.level, 'Будь-який рівень', collectOptions(jobs, 'level'), filters.level);
    fillSelect(ui.type, 'Будь-який тип', collectOptions(jobs, 'types'), filters.type);
    filters = readControls();
    ui.note.textContent = describeSource(result);
    render();
  };

  await load();
}
