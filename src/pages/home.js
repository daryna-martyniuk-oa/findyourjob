import { HOME_LATEST_COUNT } from '../config.js';
import { createJobCard } from '../components/jobCard.js';
import { describeSource } from '../components/status.js';
import { qs } from '../utils/dom.js';
import { sortJobs } from '../utils/filter.js';
import { loadIntoContainer } from './shared.js';

export async function initHomePage() {
  const form = qs('#hero-form');
  const input = qs('#hero-q');
  const stats = qs('#stats');
  const latest = qs('#latest');
  const note = qs('#data-note');

  document.querySelectorAll('.quick-filter[data-query]').forEach((tag) => {
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

  const load = async (force = false) => {
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
