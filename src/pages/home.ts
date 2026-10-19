import { HOME_LATEST_COUNT } from '../config';
import { createJobCard } from '../components/jobCard';
import { describeSource } from '../components/status';
import { qs } from '../utils/dom';
import { sortJobs } from '../utils/filter';
import { loadIntoContainer } from './shared';

export async function initHomePage(): Promise<void> {
  const form = qs<HTMLFormElement>('#hero-form');
  const input = qs<HTMLInputElement>('#hero-q');
  const stats = qs<HTMLElement>('#stats');
  const latest = qs<HTMLElement>('#latest');
  const note = qs<HTMLElement>('#data-note');

  document.querySelectorAll<HTMLButtonElement>('.quick-filter[data-query]').forEach((tag) => {
    tag.addEventListener('click', () => {
      input.value = tag.dataset.query ?? '';
      input.focus();
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    window.location.href = query ? `jobs.html?q=${encodeURIComponent(query)}` : 'jobs.html';
  });

  const load = async (force = false): Promise<void> => {
    const result = await loadIntoContainer(latest, {
      skeletons: HOME_LATEST_COUNT,
      force,
      onRetry: () => void load(true),
    });
    if (!result) {
      stats.textContent = '';
      note.textContent = '';
      return;
    }

    const { jobs } = result;
    stats.textContent = `Вакансій у каталозі: ${jobs.length}.`;
    note.textContent = describeSource(result);

    latest.replaceChildren(
      ...sortJobs(jobs, 'date')
        .slice(0, HOME_LATEST_COUNT)
        .map((job) => createJobCard(job)),
    );
  };

  await load();
}
