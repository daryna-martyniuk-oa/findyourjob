export const DEFAULT_FILTERS = {
  query: '',
  level: '',
  type: '',
  geo: 'all',
  salaryOnly: false,
  savedOnly: false,
  sort: 'relevance',
};

const GEO_MODES = ['all', 'ua', 'europe', 'north-america'];
const SORT_KEYS = ['relevance', 'date', 'salary', 'title', 'company'];

const isGeoMode = (value) => value !== null && GEO_MODES.includes(value);
const isSortKey = (value) => value !== null && SORT_KEYS.includes(value);

export function parseFilters(search) {
  const params = new URLSearchParams(search);
  const geo = params.get('geo');
  const sort = params.get('sort');
  return {
    query: (params.get('q') ?? '').trim().slice(0, 100),
    level: params.get('level') ?? '',
    type: params.get('type') ?? '',
    geo: geo === 'ua-eu' ? 'europe' : isGeoMode(geo) ? geo : DEFAULT_FILTERS.geo,
    salaryOnly: params.get('salary') === '1',
    savedOnly: params.get('saved') === '1',
    sort: isSortKey(sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

export function serializeFilters(filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.level) params.set('level', filters.level);
  if (filters.type) params.set('type', filters.type);
  if (filters.geo !== DEFAULT_FILTERS.geo) params.set('geo', filters.geo);
  if (filters.salaryOnly) params.set('salary', '1');
  if (filters.savedOnly) params.set('saved', '1');
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  return params.toString();
}
