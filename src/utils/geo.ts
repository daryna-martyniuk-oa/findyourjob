import type { GeoMode, UaEligibility } from '../types/filters';

export function parseGeo(geo: string): string[] {
  return geo
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

const EUROPE_TOKENS = new Set([
  'albania',
  'andorra',
  'armenia',
  'austria',
  'azerbaijan',
  'belarus',
  'belgium',
  'bosnia and herzegovina',
  'bulgaria',
  'croatia',
  'cyprus',
  'czechia',
  'czech republic',
  'denmark',
  'estonia',
  'finland',
  'france',
  'georgia',
  'germany',
  'greece',
  'hungary',
  'iceland',
  'ireland',
  'italy',
  'kosovo',
  'latvia',
  'liechtenstein',
  'lithuania',
  'luxembourg',
  'malta',
  'moldova',
  'monaco',
  'montenegro',
  'netherlands',
  'north macedonia',
  'norway',
  'poland',
  'portugal',
  'romania',
  'san marino',
  'serbia',
  'slovakia',
  'slovenia',
  'spain',
  'sweden',
  'switzerland',
  'uk',
  'ukraine',
  'united kingdom',
  'vatican',
]);

const NORTH_AMERICA_TOKENS = new Set([
  'canada',
  'mexico',
  'north america',
  'united states',
  'united states of america',
  'us',
  'usa',
]);

function normalizedLocation(geo: string): string {
  return ` ${geo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

function containsAnyLocation(geo: string, terms: ReadonlySet<string>): boolean {
  const normalized = normalizedLocation(geo);
  return [...terms].some((term) => normalized.includes(` ${term} `));
}

function isWorldwide(geo: string): boolean {
  return containsAnyLocation(geo, new Set(['anywhere', 'worldwide', 'global']));
}

function isEurope(geo: string): boolean {
  return containsAnyLocation(geo, new Set([...EUROPE_TOKENS, 'europe', 'emea']));
}

function isBroadEurope(geo: string): boolean {
  return containsAnyLocation(geo, new Set(['europe', 'emea', 'eu']));
}

function hasSpecificEuropeanCountry(geo: string): boolean {
  return containsAnyLocation(geo, EUROPE_TOKENS);
}

function isUkraine(geo: string): boolean {
  return containsAnyLocation(geo, new Set(['ukraine']));
}


export function uaEligibility(geo: string): UaEligibility {
  if (isUkraine(geo)) return 'yes';
  if (isWorldwide(geo)) return 'anywhere';
  if (isBroadEurope(geo) && !hasSpecificEuropeanCountry(geo)) return 'maybe';
  return 'no';
}

export function matchesGeoMode(geo: string, mode: GeoMode): boolean {
  switch (mode) {
    case 'all':
      return true;
    case 'ua':
      return isUkraine(geo) || isWorldwide(geo);
    case 'europe':
      return isEurope(geo);
    case 'north-america':
      return containsAnyLocation(geo, NORTH_AMERICA_TOKENS);
  }
}

export const UA_LABELS: Record<UaEligibility, string | null> = {
  yes: 'Доступно з України',
  anywhere: 'Звідусіль',
  maybe: 'Європа — уточніть умови',
  no: null,
};
