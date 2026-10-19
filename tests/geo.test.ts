import { describe, expect, it } from 'vitest';
import { matchesGeoMode, parseGeo, uaEligibility } from '../src/utils/geo';

describe('parseGeo', () => {
  it('розбиває рядок регіонів і прибирає пробіли', () => {
    expect(parseGeo('Europe,  Ukraine ')).toEqual(['Europe', 'Ukraine']);
  });
  it('повертає порожній масив для порожнього рядка', () => {
    expect(parseGeo('')).toEqual([]);
  });
});

describe('uaEligibility', () => {
  it.each([
    ['Europe, Ukraine', 'yes'],
    ['Spain, UK, Ukraine, USA', 'yes'],
    ['ukraine', 'yes'],
    ['Anywhere', 'anywhere'],
    ['EMEA', 'maybe'],
    ['Europe', 'maybe'],
    ['USA', 'no'],
    ['Canada, USA', 'no'],
    ['', 'no'],
  ])('%s → %s', (geo, expected) => {
    expect(uaEligibility(geo)).toBe(expected);
  });
});

describe('matchesGeoMode', () => {
  it('all пропускає все', () => expect(matchesGeoMode('USA', 'all')).toBe(true));
  it('ua пропускає Україну та Anywhere, але не Європу', () => {
    expect(matchesGeoMode('Ukraine', 'ua')).toBe(true);
    expect(matchesGeoMode('Anywhere', 'ua')).toBe(true);
    expect(matchesGeoMode('Europe', 'ua')).toBe(false);
  });
  it('europe включає регіони EMEA та європейські країни', () => {
    expect(matchesGeoMode('EMEA', 'europe')).toBe(true);
    expect(matchesGeoMode('Germany, France', 'europe')).toBe(true);
    expect(matchesGeoMode('Europe, Ukraine', 'europe')).toBe(true);
    expect(matchesGeoMode('USA', 'europe')).toBe(false);
  });
  it('north-america включає US/USA, Канаду та Мексику', () => {
    expect(matchesGeoMode('USA', 'north-america')).toBe(true);
    expect(matchesGeoMode('Remote - United States of America', 'north-america')).toBe(true);
    expect(matchesGeoMode('Canada, USA', 'north-america')).toBe(true);
    expect(matchesGeoMode('Mexico', 'north-america')).toBe(true);
    expect(matchesGeoMode('Poland', 'north-america')).toBe(false);
  });
});
