import { el } from '../utils/dom';

export function createJobSkeleton(): HTMLElement {
  return el(
    'article',
    { class: 'job-card job-card--skeleton', 'aria-hidden': 'true' },
    el(
      'div',
      { class: 'skeleton__header' },
      el('span', { class: 'skeleton skeleton--logo' }),
      el(
        'div',
        { class: 'skeleton__heading' },
        el('span', { class: 'skeleton skeleton--title' }),
        el('span', { class: 'skeleton skeleton--company' }),
      ),
    ),
    el(
      'div',
      { class: 'skeleton__badges' },
      el('span', { class: 'skeleton skeleton--badge' }),
      el('span', { class: 'skeleton skeleton--badge skeleton--short' }),
    ),
    el('span', { class: 'skeleton skeleton--line' }),
    el(
      'div',
      { class: 'skeleton__footer' },
      el('span', { class: 'skeleton skeleton--salary' }),
      el('span', { class: 'skeleton skeleton--button' }),
    ),
  );
}

export function createJobSkeletons(count: number): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    fragment.append(createJobSkeleton());
  }
  return fragment;
}
