import { loadJobs } from '../api/jobicy.js';
import { createError, describeError } from '../components/status.js';
import { createJobSkeletons } from '../components/jobSkeleton.js';

export async function loadIntoContainer(container, options) {
  container.setAttribute('aria-busy', 'true');
  container.replaceChildren(createJobSkeletons(options.skeletons));
  options.onStatus?.('Завантаження вакансій…');

  try {
    const result = await loadJobs({ force: options.force });
    container.setAttribute('aria-busy', 'false');
    return result;
  } catch (error) {
    container.setAttribute('aria-busy', 'false');
    options.onStatus?.('');
    container.replaceChildren(createError(describeError(error), options.onRetry));
    return null;
  }
}
