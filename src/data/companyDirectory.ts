/**
 * Country normalization and matching utilities for Fuzzy Lookup by Christian.
 */

/**
 * Normalizes country strings and common aliases (e.g. USA, PH, UK)
 */
export function normalizeCountry(countryName?: string): string {
  if (!countryName) return '';
  const c = countryName.trim().toLowerCase();
  if (
    c === 'usa' ||
    c === 'us' ||
    c === 'u.s.' ||
    c === 'u.s.a.' ||
    c === 'united states' ||
    c === 'united states of america'
  ) {
    return 'United States';
  }
  if (
    c === 'uk' ||
    c === 'u.k.' ||
    c === 'united kingdom' ||
    c === 'great britain' ||
    c === 'england'
  ) {
    return 'United Kingdom';
  }
  if (c === 'ph' || c === 'philippines' || c === 'republic of the philippines') {
    return 'Philippines';
  }
  if (c === 'de' || c === 'germany' || c === 'deutschland') {
    return 'Germany';
  }
  if (c === 'fr' || c === 'france') {
    return 'France';
  }
  if (c === 'jp' || c === 'japan') {
    return 'Japan';
  }
  if (c === 'ca' || c === 'canada') {
    return 'Canada';
  }
  if (c === 'au' || c === 'australia') {
    return 'Australia';
  }
  if (c === 'se' || c === 'sweden') {
    return 'Sweden';
  }
  if (c === 'kr' || c === 'south korea' || c === 'korea') {
    return 'South Korea';
  }
  if (c === 'sg' || c === 'singapore') {
    return 'Singapore';
  }
  if (c === 'in' || c === 'india') {
    return 'India';
  }
  if (c === 'nl' || c === 'netherlands' || c === 'holland') {
    return 'Netherlands';
  }
  if (c === 'cn' || c === 'china') {
    return 'China';
  }
  if (c === 'ie' || c === 'ireland') {
    return 'Ireland';
  }
  if (c === 'ch' || c === 'switzerland') {
    return 'Switzerland';
  }
  if (c === 'es' || c === 'spain') {
    return 'Spain';
  }
  if (c === 'it' || c === 'italy') {
    return 'Italy';
  }
  if (c === 'br' || c === 'brazil') {
    return 'Brazil';
  }
  if (c === 'mx' || c === 'mexico') {
    return 'Mexico';
  }
  // Clean punctuation and title-case
  return countryName.trim().replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Extracts country from headquarters string (e.g., 'Cupertino, California, USA' -> 'United States')
 */
export function extractCountryFromHeadquarters(hq?: string): string {
  if (!hq) return 'United States';
  const clean = hq.trim();
  const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    return normalizeCountry(lastPart);
  }
  return normalizeCountry(clean);
}

/**
 * Checks if two country names match, accounting for common regional aliases
 */
export function isCountryMatch(country1?: string, country2?: string): boolean {
  if (!country1 || !country2 || country1.trim() === '' || country2.trim() === '') return true;
  if (country1.toLowerCase() === 'n/a' || country2.toLowerCase() === 'n/a') return true;

  const n1 = normalizeCountry(country1).toLowerCase();
  const n2 = normalizeCountry(country2).toLowerCase();

  if (n1 === n2) return true;
  if (n1.length >= 3 && (n2.includes(n1) || n1.includes(n2))) return true;

  return false;
}
