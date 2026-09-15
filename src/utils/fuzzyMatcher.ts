import { FuzzyConfig, ProcessedRow, QueryRecord, MasterRecord, ComparisonResult, MatchProgressInfo } from '../types';
import { normalizeCountry, isCountryMatch } from '../data/companyDirectory';

export const DEFAULT_FUZZY_CONFIG: FuzzyConfig = {
  threshold: 0.6,
  distance: 100,
  minMatchCharLength: 1,
  ignoreLocation: true,
  isCaseSensitive: false
};

export type MatchProgressCallback = (
  currentOrInfo: number | MatchProgressInfo,
  total?: number,
  currentItem?: string
) => void;

const COMMON_COUNTRIES = new Set([
  // North America
  'usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'united states of america', 'america',
  'canada', 'ca', 'can',
  'mexico', 'mx', 'mex',

  // Europe
  'uk', 'u.k.', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'northern ireland',
  'germany', 'de', 'deu', 'deutschland',
  'france', 'fr', 'fra',
  'spain', 'es', 'esp', 'españa',
  'italy', 'it', 'ita', 'italia',
  'netherlands', 'nl', 'nld', 'holland',
  'sweden', 'se', 'swe',
  'switzerland', 'ch', 'che',
  'ireland', 'ie', 'irl',
  'norway', 'no', 'nor',
  'denmark', 'dk', 'dnk',
  'finland', 'fi', 'fin',
  'belgium', 'be', 'bel',
  'austria', 'at', 'aut',
  'poland', 'pl', 'pol',
  'portugal', 'pt', 'prt',
  'greece', 'gr', 'grc',
  'czech republic', 'czechia', 'cz', 'cze',
  'hungary', 'hu', 'hun',
  'romania', 'ro', 'rou',
  'luxembourg', 'lu', 'lux',
  'monaco', 'mc', 'mco',
  'iceland', 'is', 'isl',
  'slovakia', 'sk', 'svk',
  'slovenia', 'si', 'svn',
  'croatia', 'hr', 'hrv',
  'bulgaria', 'bg', 'bgr',
  'serbia', 'rs', 'srb',
  'estonia', 'ee', 'est',
  'latvia', 'lv', 'lva',
  'lithuania', 'lt', 'ltu',
  'ukraine', 'ua', 'ukr',
  'russia', 'russian federation', 'ru', 'rus',
  'turkey', 'tr', 'tur', 'türkiye',
  'cyprus', 'cy', 'cyp',
  'malta', 'mt', 'mlt',

  // Asia / Pacific
  'philippines', 'ph', 'phl', 'pilipinas',
  'japan', 'jp', 'jpn', 'nippon',
  'china', 'cn', 'chn', 'prc', "people's republic of china",
  'south korea', 'korea', 'kr', 'kor', 'republic of korea', 'north korea', 'dprk',
  'singapore', 'sg', 'sgp',
  'india', 'in', 'ind',
  'hong kong', 'hk', 'hkg',
  'taiwan', 'tw', 'twn',
  'malaysia', 'my', 'mys',
  'indonesia', 'id', 'idn',
  'thailand', 'th', 'tha',
  'vietnam', 'vn', 'vnm', 'viet nam',
  'australia', 'au', 'aus',
  'new zealand', 'nz', 'nzl',
  'pakistan', 'pk', 'pak',
  'bangladesh', 'bd', 'bgd',
  'sri lanka', 'lk', 'lka',
  'cambodia', 'kh', 'khm',
  'myanmar', 'mm', 'mmr', 'burma',

  // Middle East & Africa
  'uae', 'united arab emirates', 'ae', 'are', 'dubai', 'abu dhabi',
  'saudi arabia', 'sa', 'sau', 'ksa',
  'israel', 'il', 'isr',
  'qatar', 'qa', 'qat',
  'kuwait', 'kw', 'kwt',
  'bahrain', 'bh', 'bhr',
  'oman', 'om', 'omn',
  'jordan', 'jo', 'jor',
  'lebanon', 'lb', 'lbn',
  'egypt', 'eg', 'egy',
  'south africa', 'za', 'zaf',
  'nigeria', 'ng', 'nga',
  'kenya', 'ke', 'ken',
  'morocco', 'ma', 'mar',
  'ghana', 'gh', 'gha',

  // Latin America
  'brazil', 'br', 'bra', 'brasil',
  'argentina', 'ar', 'arg',
  'chile', 'cl', 'chl',
  'colombia', 'co', 'col',
  'peru', 'pe', 'per',
  'costa rica', 'cr', 'cri',
  'panama', 'pa', 'pan',
  'uruguay', 'uy', 'ury',
  'ecuador', 'ec', 'ecu',
  'venezuela', 've', 'ven',
  'puerto rico', 'pr', 'pri'
]);

export function isKnownCountry(str?: string): boolean {
  if (!str) return false;
  const cleaned = str.trim().toLowerCase().replace(/[.,;]$/, '').trim();
  return COMMON_COUNTRIES.has(cleaned);
}

/**
 * Parses comma-separated values respecting quotes
 */
function parseCsvFields(text: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      if (inQuotes && text[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim() || fields.length > 0) {
    fields.push(current.trim().replace(/^["']|["']$/g, ''));
  }
  return fields.filter(Boolean);
}

/**
 * Common legal corporate suffixes to strip during name normalization
 */
const LEGAL_SUFFIXES = [
  'incorporated', 'inc', 'corporation', 'corp', 'limited', 'ltd',
  'company', 'co', 'holdings', 'holding', 'group', 'enterprises', 'enterprise',
  'international', 'intl', 'global', 'technologies', 'technology', 'tech',
  'solutions', 'services', 'systems', 'consulting',
  'gmbh', 'plc', 'sa', 's.a.', 'ag', 'nv', 'bv', 'bhd', 'pte ltd', 'pte',
  'pvt ltd', 'pvt', 'llc', 'l.l.c.', 'lp', 'llp', 'unibank'
];

/**
 * Parses a line into company name and country, handling:
 * - Tabs (\t) from standard Excel copy-pasting
 * - Pipes (|)
 * - Semicolons (;)
 * - Commas (,) - with strict protection: company names containing commas
 *   (such as "Alfred Wegener Institute, Helmholtz Centre For Polar & Marine Research"
 *   or "ACTECO, Productos Y Servicios S.L.") are NEVER split into a country column
 *   unless the trailing section is explicitly an acknowledged country name.
 */
export function splitLineIntoCompanyAndCountry(line: string): { name: string; country: string } {
  let trimmed = line.trim();
  if (!trimmed) {
    return { name: '', country: '' };
  }

  // If the entire line is wrapped in matching quotes (e.g. copied from single Excel cell with commas),
  // unwrap the outer quotes if it has no tab or pipe
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inside = trimmed.slice(1, -1).trim();
    if (!inside.includes('\t') && !inside.includes('|')) {
      trimmed = inside;
    }
  }

  // 1. Tab separated (standard Excel clipboard with multiple columns)
  if (trimmed.includes('\t')) {
    const parts = trimmed.split('\t').map(p => p.trim().replace(/^["']|["']$/g, ''));
    const name = parts[0] || '';
    const country = parts.slice(1).filter(Boolean).join(' ') || '';
    return { name, country };
  }

  // 2. Pipe separated
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map(p => p.trim().replace(/^["']|["']$/g, ''));
    const name = parts[0] || '';
    const country = parts.slice(1).filter(Boolean).join(' ') || '';
    return { name, country };
  }

  // 3. Semicolon separated (when no comma present)
  if (trimmed.includes(';') && !trimmed.includes(',')) {
    const parts = trimmed.split(';').map(p => p.trim().replace(/^["']|["']$/g, ''));
    const name = parts[0] || '';
    const country = parts.slice(1).filter(Boolean).join(' ') || '';
    return { name, country };
  }

  // 4. Comma separated
  // Company names frequently contain commas:
  // - "Alfred Wegener Institute, Helmholtz Centre For Polar & Marine Research"
  // - "ACTECO, Productos Y Servicios S.L."
  // - "Banco Santander, S.A."
  // - "Amazon.com, Inc."
  // We NEVER split by comma into a country column unless the last part is genuinely a recognized country!
  if (trimmed.includes(',')) {
    const parts = parseCsvFields(trimmed);
    if (parts.length <= 1) {
      return { name: parts[0] || trimmed.replace(/^["']|["']$/g, ''), country: '' };
    }

    const lastPart = parts[parts.length - 1];
    const cleanLastPart = lastPart.replace(/[.,;]$/, '').trim();

    // Check if the last part is genuinely a country
    if (isKnownCountry(cleanLastPart)) {
      const name = parts.slice(0, -1).join(', ').trim();
      return { name, country: cleanLastPart };
    }

    // If the last part is NOT a verified country, the ENTIRE line is the company name.
    // Preserves names with commas intact without spilling into country column.
    return { name: trimmed.replace(/^["']|["']$/g, ''), country: '' };
  }

  return { name: trimmed.replace(/^["']|["']$/g, ''), country: '' };
}

/**
 * Parses each line of Table 1 (Query List)
 */
export function parseQueryLine(line: string): QueryRecord {
  const trimmed = line.trim();
  if (!trimmed) {
    return { raw: '', name: '' };
  }

  const { name, country } = splitLineIntoCompanyAndCountry(trimmed);
  return {
    raw: trimmed,
    name,
    country: country && country !== 'N/A' && country !== '-' ? normalizeCountry(country) : undefined
  };
}

/**
 * Parses each line of Table 2 (Target Master List)
 */
export function parseMasterLine(line: string): MasterRecord {
  const trimmed = line.trim();
  if (!trimmed) {
    return { raw: '', name: '' };
  }

  const { name, country } = splitLineIntoCompanyAndCountry(trimmed);
  return {
    raw: trimmed,
    name,
    country: country && country !== 'N/A' && country !== '-' ? normalizeCountry(country) : undefined
  };
}

/**
 * Validates pasted tabular data structure (Company Name & Country).
 */
export interface PastedDataValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsedLines: number;
}

export function validatePastedQueryData(rawText: string): PastedDataValidation {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      isValid: false,
      errors: ['The pasted data is empty. Please enter or paste company records.'],
      warnings: [],
      parsedLines: 0
    };
  }

  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const errors: string[] = [];
  const warnings: string[] = [];
  let validCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rowNum = i + 1;

    const { name } = splitLineIntoCompanyAndCountry(line);

    // Check if header row
    if (
      i === 0 &&
      (name.toLowerCase() === 'company' ||
        name.toLowerCase() === 'company name' ||
        name.toLowerCase() === 'name' ||
        name.toLowerCase() === 'query')
    ) {
      continue;
    }

    if (!name) {
      errors.push(`Row ${rowNum}: Missing mandatory Company Name in the first column.`);
      continue;
    }

    validCount++;
  }

  return {
    isValid: errors.length === 0 && validCount > 0,
    errors,
    warnings,
    parsedLines: validCount
  };
}

/**
 * Weighted scoring constants:
 * Prioritizes Company Name (85%) as the primary identity signal,
 * while treating Country (15%) as a secondary verification step to minimize false negatives.
 */
export const WEIGHT_COMPANY_NAME = 0.85;
export const WEIGHT_COUNTRY_VERIFICATION = 0.15;

/**
 * Compares Table 1 Query company country against Table 2 Target Master country
 * using secondary verification principles that prevent false negatives when
 * the primary company name matches strongly.
 */
export function compareCountry(
  queryCountry?: string,
  targetCountry?: string,
  hasMatchFound: boolean = true,
  nameSimilarity: number = 1.0
): ComparisonResult {
  if (!hasMatchFound) {
    return {
      status: 'Mismatch',
      comparisonLabel: 'No Match',
      mismatchReason: 'No matching company found in Target Master List',
      color: 'red',
      countryMatch: false,
      queryCountry: queryCountry || 'N/A',
      targetCountry: targetCountry || 'N/A',
      comparisonNote: 'Company could not be resolved against Table 2 Target Master List',
      countryScore: 0
    };
  }

  const qCountryClean = queryCountry?.trim() || '';
  const tCountryClean = targetCountry?.trim() || '';

  const hasQCountry = qCountryClean !== '' && qCountryClean.toUpperCase() !== 'N/A' && qCountryClean !== '-';
  const hasTCountry = tCountryClean !== '' && tCountryClean.toUpperCase() !== 'N/A' && tCountryClean !== '-';

  // If neither specified country, or one specified and other omitted/N/A:
  // Country is treated neutrally (unverified but non-penalizing) to prevent false negatives.
  if (!hasQCountry && !hasTCountry) {
    return {
      status: 'Match',
      comparisonLabel: 'Match',
      color: 'green',
      countryMatch: true,
      queryCountry: 'N/A',
      targetCountry: 'N/A',
      comparisonNote: 'Matched by company name',
      countryScore: 0.90
    };
  }

  if (!hasQCountry || !hasTCountry) {
    return {
      status: 'Match',
      comparisonLabel: 'Match',
      color: 'green',
      countryMatch: true,
      queryCountry: hasQCountry ? qCountryClean : 'N/A',
      targetCountry: hasTCountry ? tCountryClean : 'N/A',
      comparisonNote: 'Matched by company name (country unverified)',
      countryScore: 0.90
    };
  }

  const matches = isCountryMatch(qCountryClean, tCountryClean);

  if (matches) {
    return {
      status: 'Match',
      comparisonLabel: 'Verified Match',
      color: 'green',
      countryMatch: true,
      queryCountry: qCountryClean,
      targetCountry: tCountryClean,
      comparisonNote: `Country verified (${qCountryClean})`,
      countryScore: 1.0
    };
  }

  // If country does not match, check company name similarity to prevent false negatives:
  // If company name similarity is high (>= 0.80), we treat it as a valid company match with a country discrepancy flag for manual review,
  // rather than a hard failure/false negative.
  if (nameSimilarity >= 0.80) {
    return {
      status: 'Match',
      comparisonLabel: 'Country Discrepancy',
      mismatchReason: `Strong company name match (${Math.round(nameSimilarity * 100)}%), but query has "${qCountryClean}" while Target Master has "${tCountryClean}". Manual review recommended.`,
      color: 'amber',
      countryMatch: false,
      queryCountry: qCountryClean,
      targetCountry: tCountryClean,
      comparisonNote: `Query (${qCountryClean}) vs Target (${tCountryClean}) · Review recommended`,
      countryScore: 0.30
    };
  }

  return {
    status: 'Mismatch',
    comparisonLabel: 'Country Mismatch',
    mismatchReason: `Country Mismatch: Query has "${qCountryClean}" while Target Master has "${tCountryClean}"`,
    color: 'red',
    countryMatch: false,
    queryCountry: qCountryClean,
    targetCountry: tCountryClean,
    comparisonNote: `Expected ${qCountryClean} vs Target ${tCountryClean}`,
    countryScore: 0.20
  };
}

/**
 * Normalizes text for clean string comparison:
 * Removes diacritics, symbols, punctuation, and standardizes spacing.
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/&/g, ' and ')
    .replace(/@/g, ' at ')
    .replace(/[^\w\s]/g, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

/**
 * Strips legal corporate suffixes from cleaned company name
 * e.g. "apple inc" -> "apple", "tesla motors inc" -> "tesla motors", "jollibee foods corporation" -> "jollibee foods"
 */
export function stripLegalSuffixes(cleanedName: string): string {
  let result = cleanedName.trim();
  let changed = true;

  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      const regex = new RegExp(`\\b${suffix}$`, 'i');
      if (regex.test(result)) {
        result = result.replace(regex, '').trim();
        changed = true;
      }
    }
  }

  return result || cleanedName;
}

/**
 * Common generic words that frequently appear in corporate titles
 * and must NOT cause false positive matches on their own.
 */
export const GENERIC_COMPANY_WORDS = new Set([
  'and', '&', 'the', 'of', 'for', 'in', 'at', 'to', 'co',
  'group', 'services', 'service', 'solutions', 'solution',
  'technologies', 'technology', 'tech', 'consulting',
  'holdings', 'holding', 'international', 'intl', 'global',
  'management', 'enterprises', 'enterprise', 'industries', 'industry',
  'partners', 'associates', 'systems', 'system', 'capital',
  'ventures', 'investments', 'commercial', 'corporate',
  'products', 'servicios', 'centre', 'center', 'institute',
  'research', 'development', 'trading', 'logistics', 'operations',
  'bank', 'banking', 'banco', 'banque', 'fund', 'funds', 'finance', 'financial',
  'hotel', 'hotels', 'resort', 'resorts', 'hospital', 'clinic',
  'insurance', 'assurance', 'energy', 'power', 'oil', 'gas',
  'media', 'digital', 'communications', 'telecom', 'transport',
  'first', 'national', 'federal', 'central', 'general', 'royal', 'standard'
]);

/**
 * Safely extracts text inside parentheses, brackets, or quotes
 * e.g. "Alphabet Inc. (Google)" -> "Google", "Manila Electric Company (Meralco)" -> "Meralco"
 */
export function extractParenthetical(rawName: string): string | null {
  if (!rawName) return null;
  const match = rawName.match(/\(([^)]+)\)|\[([^\]]+)\]|"([^"]+)"/);
  if (match) {
    const inside = (match[1] || match[2] || match[3] || '').trim();
    return inside.length > 0 ? inside : null;
  }
  return null;
}

/**
 * Checks if one string is an explicit short acronym for a multi-word company name.
 * ONLY applies when:
 * 1. One string is an explicit short acronym (3 to 5 letters only, e.g. "IBM", "BMW", "BDO", "PLDT")
 * 2. The other string is a multi-word full name whose non-generic words' initial letters exactly spell that acronym
 * Note: NEVER matches two multi-word names against each other!
 */
export function checkExplicitAcronymMatch(strA: string, strB: string): boolean {
  const normA = normalizeText(strA).replace(/\s+/g, '');
  const normB = normalizeText(strB).replace(/\s+/g, '');

  const verify = (shortStr: string, fullStr: string): boolean => {
    if (shortStr.length < 3 || shortStr.length > 5) return false;
    // Check if shortStr contains only letters
    if (!/^[a-z]+$/.test(shortStr)) return false;

    const words = normalizeText(fullStr)
      .split(' ')
      .filter(w => w.length > 0 && !GENERIC_COMPANY_WORDS.has(w));

    if (words.length < 3 || words.length !== shortStr.length) return false;
    const acronym = words.map(w => w[0]).join('');
    return acronym === shortStr;
  };

  return verify(normA, strB) || verify(normB, strA);
}

/**
 * Extracts possible aliases and parenthetical terms from a company name.
 * e.g. "Manila Electric Company (Meralco)" -> ["meralco", "manila electric company"]
 */
export function extractAliases(rawName: string): string[] {
  const aliases: Set<string> = new Set();
  const lower = rawName.toLowerCase().trim();
  aliases.add(lower);
  aliases.add(normalizeText(rawName));

  // Extract text inside parentheses, brackets, or quotes
  const parenthetical = extractParenthetical(rawName);
  if (parenthetical) {
    aliases.add(parenthetical.toLowerCase());
    aliases.add(normalizeText(parenthetical));
    aliases.add(stripLegalSuffixes(normalizeText(parenthetical)));

    // Text outside parentheses
    const outside = rawName.replace(/\([^)]+\)|\[[^\]]+\]|"[^"]+"/g, '').trim();
    if (outside) {
      aliases.add(outside.toLowerCase());
      aliases.add(normalizeText(outside));
      aliases.add(stripLegalSuffixes(normalizeText(outside)));
    }
  }

  return Array.from(aliases).filter(Boolean);
}

/**
 * Computes Levenshtein edit distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = new Array(n + 1);
  let currRow = new Array(n + 1);

  for (let j = 0; j <= n; j++) prevRow[j] = j;

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const char1 = s1[i - 1];
    for (let j = 1; j <= n; j++) {
      const char2 = s2[j - 1];
      const cost = char1 === char2 ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,
        prevRow[j] + 1,
        prevRow[j - 1] + cost
      );
    }
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[n];
}

/**
 * Levenshtein normalized similarity (0.0 to 1.0)
 */
function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Computes Jaro similarity
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const m = matches;
  return (m / len1 + m / len2 + (m - transpositions / 2) / m) / 3;
}

/**
 * Computes Jaro-Winkler similarity (heavily rewards matching prefixes)
 */
function jaroWinklerSimilarity(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);
  if (jaro < 0.7) return jaro;

  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Computes comprehensive composite similarity between two company names:
 * 1. Raw exact match
 * 2. Cleaned exact match
 * 3. Parenthetical / acronym / alias match
 * 4. Suffix-stripped exact match
 * 5. Token set subset / inclusion
 * 6. Token sort ratio
 * 7. Jaro-Winkler metric
 * 8. Levenshtein edit distance
 */
export function calculateCompanySimilarity(
  queryRaw: string,
  targetRaw: string
): number {
  if (!queryRaw || !targetRaw) return 0;

  // 1. Raw exact match
  if (queryRaw.trim().toLowerCase() === targetRaw.trim().toLowerCase()) {
    return 1.0;
  }

  const cleanQ = normalizeText(queryRaw);
  const cleanT = normalizeText(targetRaw);

  // 2. Cleaned exact match
  if (cleanQ === cleanT) {
    return 1.0;
  }

  // 3. Suffix-stripped match (e.g. "Apple Inc" vs "Apple", "Netflix Incorporated" vs "Netflix")
  const strippedQ = stripLegalSuffixes(cleanQ);
  const strippedT = stripLegalSuffixes(cleanT);

  if (strippedQ === strippedT && strippedQ.length >= 2) {
    return 0.99;
  }

  // 4. Parenthetical Alias match (e.g. "Alphabet Inc. (Google)" vs "Google")
  const parentheticalQ = extractParenthetical(queryRaw);
  const parentheticalT = extractParenthetical(targetRaw);

  if (parentheticalQ) {
    const cleanPQ = normalizeText(parentheticalQ);
    const stripPQ = stripLegalSuffixes(cleanPQ);
    if (cleanPQ === cleanT || stripPQ === strippedT || (cleanPQ.length >= 3 && cleanT.includes(cleanPQ))) {
      return 0.96;
    }
  }

  if (parentheticalT) {
    const cleanPT = normalizeText(parentheticalT);
    const stripPT = stripLegalSuffixes(cleanPT);
    if (cleanPT === cleanQ || stripPT === strippedQ || (cleanPT.length >= 3 && cleanQ.includes(cleanPT))) {
      return 0.96;
    }
  }

  // 5. Explicit Acronym Match (e.g. "IBM" vs "International Business Machines")
  if (checkExplicitAcronymMatch(queryRaw, targetRaw)) {
    return 0.92;
  }

  // 6. Token analysis
  const tokensQ = strippedQ.split(' ').filter(Boolean);
  const tokensT = strippedT.split(' ').filter(Boolean);

  // Sorted token match (e.g. "Binzel Abicor" vs "Abicor Binzel")
  if (tokensQ.length > 1 && tokensQ.length === tokensT.length) {
    const sortedQ = [...tokensQ].sort().join(' ');
    const sortedT = [...tokensT].sort().join(' ');
    if (sortedQ === sortedT) {
      return 0.98;
    }
  }

  // Distinctive tokens (filtering out generic corporate words)
  const distQ = tokensQ.filter(t => !GENERIC_COMPANY_WORDS.has(t));
  const distT = tokensT.filter(t => !GENERIC_COMPANY_WORDS.has(t));

  const activeDistQ = distQ.length > 0 ? distQ : tokensQ;
  const activeDistT = distT.length > 0 ? distT : tokensT;

  const setDistT = new Set(activeDistT);
  const matchedTokens = activeDistQ.filter(t => setDistT.has(t));
  const hasDistinctiveOverlap = matchedTokens.length > 0;

  let tokenScore = 0;
  if (hasDistinctiveOverlap) {
    const unionSize = new Set([...activeDistQ, ...activeDistT]).size;
    const jaccard = matchedTokens.length / unionSize;

    const isQSubsetOfT = activeDistQ.every(t => setDistT.has(t));
    const setDistQ = new Set(activeDistQ);
    const isTSubsetOfQ = activeDistT.every(t => setDistQ.has(t));

    if (isQSubsetOfT) {
      // e.g. "Abicor Binzel" in "Abicor Binzel Schweisstechnik"
      const coverage = activeDistQ.length / activeDistT.length;
      tokenScore = 0.85 + 0.13 * coverage;
    } else if (isTSubsetOfQ) {
      const coverage = activeDistT.length / activeDistQ.length;
      tokenScore = 0.83 + 0.13 * coverage;
    } else {
      tokenScore = 0.50 + 0.45 * jaccard;
    }
  }

  // 7. Substring inclusion on word boundaries
  let substringScore = 0;
  if (strippedQ.length >= 4 && strippedT.length >= 4) {
    const minLen = Math.min(strippedQ.length, strippedT.length);
    const maxLen = Math.max(strippedQ.length, strippedT.length);
    const lenRatio = minLen / maxLen;

    if (lenRatio >= 0.55) {
      const isWordBoundaryMatch =
        strippedT.startsWith(strippedQ + ' ') ||
        strippedT.endsWith(' ' + strippedQ) ||
        strippedT.includes(' ' + strippedQ + ' ') ||
        strippedQ.startsWith(strippedT + ' ') ||
        strippedQ.endsWith(' ' + strippedT) ||
        strippedQ.includes(' ' + strippedT + ' ');

      if (isWordBoundaryMatch) {
        substringScore = 0.70 + 0.25 * lenRatio;
      }
    }
  }

  // 8. Jaro-Winkler and Levenshtein similarity
  const jwStripped = jaroWinklerSimilarity(strippedQ, strippedT);
  const jwClean = jaroWinklerSimilarity(cleanQ, cleanT);
  const jwBest = Math.max(jwStripped, jwClean);

  const levStripped = levenshteinSimilarity(strippedQ, strippedT);
  const levClean = levenshteinSimilarity(cleanQ, cleanT);
  const levBest = Math.max(levStripped, levClean);

  // If both strings have multiple distinctive words but ZERO tokens match,
  // character overlap should be severely discounted to avoid false positives!
  let charSim = Math.max(jwBest, levBest);
  if (!hasDistinctiveOverlap && activeDistQ.length >= 1 && activeDistT.length >= 1) {
    charSim = Math.max(jwBest * 0.45, levBest * 0.55);
  }

  return Math.min(1.0, Math.max(tokenScore, substringScore, charSim));
}

/**
 * Cleans company name by normalizing text and stripping common legal entity suffixes.
 */
export function cleanCompanyName(name: string): string {
  return stripLegalSuffixes(normalizeText(name));
}

/**
 * Extracts words/tokens with length >= 2.
 */
export function getTokens(clean: string): string[] {
  return clean.split(' ').filter(t => t.length >= 2);
}

/**
 * Extracts non-generic distinctive tokens.
 */
export function getDistinctiveTokens(tokens: string[]): string[] {
  return tokens.filter(t => !GENERIC_COMPANY_WORDS.has(t) && t.length >= 2);
}

export interface MasterIndex {
  exactCleanMap: Map<string, number[]>;
  tokenMap: Map<string, number[]>;
  prefixMap: Map<string, number[]>;
  records: MasterRecord[];
}

/**
 * Builds an inverted index and exact hash map over Target Master records.
 * Designed to handle 200,000+ companies with sub-millisecond candidate retrieval.
 * Periodically yields to browser event loop to prevent UI freezing.
 */
export async function buildMasterIndex(
  records: MasterRecord[],
  onProgress?: MatchProgressCallback,
  signal?: AbortSignal
): Promise<MasterIndex> {
  const exactCleanMap = new Map<string, number[]>();
  const tokenMap = new Map<string, number[]>();
  const prefixMap = new Map<string, number[]>();

  const total = records.length;
  const BATCH_SIZE = 15000;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break;

    const raw = records[i].name;
    const clean = cleanCompanyName(raw);

    // 1. Exact clean name map
    let ex = exactCleanMap.get(clean);
    if (!ex) {
      ex = [];
      exactCleanMap.set(clean, ex);
    }
    ex.push(i);

    // 2. Token inverted index
    const tokens = getTokens(clean);
    const dist = getDistinctiveTokens(tokens);
    const useTokens = dist.length > 0 ? dist : tokens;

    for (const t of useTokens) {
      let tList = tokenMap.get(t);
      if (!tList) {
        tList = [];
        tokenMap.set(t, tList);
      }
      if (tList.length < 3000) {
        tList.push(i);
      }

      // 3. Prefix index (3 chars)
      if (t.length >= 3) {
        const p = t.slice(0, 3);
        let pList = prefixMap.get(p);
        if (!pList) {
          pList = [];
          prefixMap.set(p, pList);
        }
        if (pList.length < 1500) {
          pList.push(i);
        }
      }
    }

    // Yield to keep UI completely responsive on large lists (e.g. 200k records)
    if (i > 0 && i % BATCH_SIZE === 0) {
      if (onProgress) {
        onProgress({
          current: i,
          total,
          currentItem: `Indexing master directory: ${records[i].name}`,
          stage: 'indexing',
          percentage: Math.round((i / total) * 100)
        });
      }
      await new Promise(r => setTimeout(r, 0));
    }
  }

  return { exactCleanMap, tokenMap, prefixMap, records };
}

/**
 * Fast candidate retrieval using the MasterIndex.
 * Reduces search space from 200,000 items to the top 60-80 most promising candidates in < 1ms.
 */
export function getCandidateIndices(
  qName: string,
  masterRecords: MasterRecord[],
  index: MasterIndex,
  maxCandidates = 80
): number[] {
  // If master list is small, evaluate all records directly
  if (masterRecords.length <= 150) {
    return masterRecords.map((_, i) => i);
  }

  const clean = cleanCompanyName(qName);
  const candidateIndices = new Set<number>();

  // 1. Check exact clean match (instant O(1))
  const exact = index.exactCleanMap.get(clean);
  if (exact && exact.length > 0) {
    for (const idx of exact) {
      candidateIndices.add(idx);
    }
  }

  // 2. Check token overlap
  const qTokens = getTokens(clean);
  const qDist = getDistinctiveTokens(qTokens);
  const searchTokens = qDist.length > 0 ? qDist : qTokens;

  const candidateScores = new Map<number, number>();

  for (const t of searchTokens) {
    const list = index.tokenMap.get(t);
    if (list) {
      const weight = Math.max(1, Math.min(10, Math.floor(1000 / (list.length + 1))));
      for (const idx of list) {
        candidateScores.set(idx, (candidateScores.get(idx) || 0) + weight);
      }
    }
  }

  // Also check aliases / parenthetical terms
  const aliases = extractAliases(qName);
  for (const alias of aliases) {
    const aliasClean = cleanCompanyName(alias);
    const aliasTokens = getTokens(aliasClean);
    for (const at of aliasTokens) {
      const list = index.tokenMap.get(at);
      if (list) {
        for (const idx of list) {
          candidateScores.set(idx, (candidateScores.get(idx) || 0) + 2);
        }
      }
    }
  }

  // 3. Prefix fallback if few candidates found
  if (candidateScores.size < 15) {
    for (const t of searchTokens) {
      if (t.length >= 3) {
        const p = t.slice(0, 3);
        const pList = index.prefixMap.get(p);
        if (pList) {
          for (const idx of pList) {
            candidateScores.set(idx, (candidateScores.get(idx) || 0) + 1);
          }
        }
      }
    }
  }

  // Sort candidates by overlap score and pick top N
  const sorted = Array.from(candidateScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCandidates)
    .map(e => e[0]);

  for (const idx of sorted) {
    candidateIndices.add(idx);
  }

  return Array.from(candidateIndices);
}

/**
 * Executes fuzzy matching for Table 1 (Query List) against Table 2 (Target Master List)
 * with high-speed indexing (handling 200,000+ companies with zero lag), multi-tier composite scoring,
 * country validation, and non-blocking asynchronous execution.
 */
export async function performFuzzyLookup(
  queryLines: string[],
  targetMasterLines: string[],
  config: FuzzyConfig = DEFAULT_FUZZY_CONFIG,
  onProgress?: MatchProgressCallback,
  options?: { signal?: AbortSignal }
): Promise<ProcessedRow[]> {
  const queryRecords = queryLines
    .map(line => parseQueryLine(line))
    .filter(r => r.name.length > 0);

  const masterRecords = targetMasterLines
    .map(line => parseMasterLine(line))
    .filter(r => r.name.length > 0);

  if (queryRecords.length === 0 || masterRecords.length === 0) {
    return [];
  }

  const signal = options?.signal;

  // Step 1: Build high-speed inverted index for master records
  if (onProgress) {
    onProgress({
      current: 0,
      total: masterRecords.length,
      currentItem: `Indexing ${masterRecords.length.toLocaleString()} Master Companies...`,
      stage: 'indexing',
      percentage: 0
    });
  }

  const masterIndex = await buildMasterIndex(masterRecords, onProgress, signal);

  if (signal?.aborted) {
    return [];
  }

  const results: ProcessedRow[] = [];

  // Cutoff threshold: companies with similarity >= cutoff are considered valid matches
  const matchCutoff = Math.max(0.55, 1 - config.threshold * 0.7);

  const totalQueries = queryRecords.length;
  const startTime = Date.now();
  let lastYieldTime = performance.now();

  for (let i = 0; i < totalQueries; i++) {
    if (signal?.aborted) {
      break;
    }

    const queryItem = queryRecords[i];

    // Candidate selection: retrieve top ~80 candidate master indices in < 1ms
    const candidateIndices = getCandidateIndices(queryItem.name, masterRecords, masterIndex, 80);

    let bestCandidate: MasterRecord | null = null;
    let highestCompositeScore = 0;
    let bestCandidateNameSim = 0;
    let bestCandidateCountryScore = 0;

    // Evaluate candidates using domain-specific weighted scoring
    for (const candIdx of candidateIndices) {
      const masterItem = masterRecords[candIdx];
      const nameSim = calculateCompanySimilarity(queryItem.name, masterItem.name);

      // Secondary country verification step
      let countryVerificationScore = 0.90; // Default neutral if omitted or N/A
      const qC = queryItem.country?.trim() || '';
      const mC = masterItem.country?.trim() || '';
      const hasQ = qC !== '' && qC.toUpperCase() !== 'N/A' && qC !== '-';
      const hasM = mC !== '' && mC.toUpperCase() !== 'N/A' && mC !== '-';

      if (hasQ && hasM) {
        if (isCountryMatch(qC, mC)) {
          countryVerificationScore = 1.0;
        } else {
          countryVerificationScore = 0.30;
        }
      } else {
        countryVerificationScore = 0.90;
      }

      const compositeScore = (nameSim * WEIGHT_COMPANY_NAME) + (countryVerificationScore * WEIGHT_COUNTRY_VERIFICATION);

      if (compositeScore > highestCompositeScore) {
        highestCompositeScore = compositeScore;
        bestCandidate = masterItem;
        bestCandidateNameSim = nameSim;
        bestCandidateCountryScore = countryVerificationScore;
      }
    }

    // Determine if candidate meets the cutoff
    const hasMatchFound = bestCandidate !== null && bestCandidateNameSim >= matchCutoff;

    // 0 - 100% Confidence Score
    const confidenceScore = hasMatchFound
      ? Math.max(1, Math.min(100, Math.round(highestCompositeScore * 100)))
      : 0;

    const nameScore = hasMatchFound
      ? Math.max(1, Math.min(100, Math.round(bestCandidateNameSim * 100)))
      : 0;

    const countryScore = hasMatchFound
      ? Math.round(bestCandidateCountryScore * 100)
      : 0;

    const bestMatchName = hasMatchFound ? (bestCandidate?.name || 'No match found') : 'No match found';
    const targetCountry = hasMatchFound ? bestCandidate?.country : undefined;

    // Compare countries with secondary verification awareness
    const comparison = compareCountry(queryItem.country, targetCountry, hasMatchFound, bestCandidateNameSim);

    results.push({
      id: `row-${i}-${Date.now()}`,
      query: queryItem.name,
      bestMatch: bestMatchName,
      matchScore: 1 - (confidenceScore / 100),
      matchPercent: confidenceScore,
      confidenceScore,
      nameScore,
      countryScore,
      rawFuseScore: 1 - (confidenceScore / 100),
      queryCountry: queryItem.country || 'N/A',
      targetCountry: targetCountry || 'N/A',
      comparisonStatus: comparison.status,
      comparisonLabel: comparison.comparisonLabel,
      mismatchReason: comparison.mismatchReason,
      comparisonColor: comparison.color,
      comparisonDetails: {
        countryMatch: comparison.countryMatch,
        queryCountry: queryItem.country,
        targetCountry,
        comparisonNote: comparison.comparisonNote,
        nameSimilarity: bestCandidateNameSim,
        countryScore: bestCandidateCountryScore
      }
    });

    // Report progress
    const elapsedSec = (Date.now() - startTime) / 1000;
    const itemsDone = i + 1;
    const itemsPerSec = elapsedSec > 0 ? Math.round(itemsDone / elapsedSec) : 0;
    const remainingItems = totalQueries - itemsDone;
    const etaSec = itemsPerSec > 0 ? Math.ceil(remainingItems / itemsPerSec) : 0;
    const percent = Math.round((itemsDone / totalQueries) * 100);

    if (onProgress) {
      onProgress({
        current: itemsDone,
        total: totalQueries,
        currentItem: queryItem.name,
        stage: 'matching',
        percentage: percent,
        itemsPerSecond: itemsPerSec,
        etaSeconds: etaSec
      });
    }

    // Time-sliced non-blocking yield: yield at least every 15ms or every 10 queries
    const now = performance.now();
    if (now - lastYieldTime > 15 || i % 10 === 0) {
      await new Promise(r => setTimeout(r, 0));
      lastYieldTime = performance.now();
    }
  }

  return results;
}

