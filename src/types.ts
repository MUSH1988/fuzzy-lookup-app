export interface QueryRecord {
  name: string;
  country?: string;
  raw: string;
}

export interface MasterRecord {
  name: string;
  country?: string;
  raw: string;
}

export interface ComparisonResult {
  status: 'Match' | 'Mismatch';
  comparisonLabel: string; // e.g. "Match", "Country Discrepancy", "No Match"
  mismatchReason?: string;
  color: 'green' | 'red' | 'amber';
  countryMatch: boolean;
  queryCountry?: string;
  targetCountry?: string;
  comparisonNote?: string;
  countryScore?: number; // 0.0 - 1.0
}

export interface ProcessedRow {
  id: string;
  query: string; // Query company name from Table 1
  bestMatch: string; // Best matched company name from Table 2 (Target Master List)
  matchScore: number;
  matchPercent: number; // Backwards-compatible
  confidenceScore: number; // 0 - 100% weighted confidence score
  nameScore: number; // 0 - 100% company name similarity score (primary 85%)
  countryScore: number; // 0 - 100% country verification score (secondary 15%)
  queryCountry?: string; // Query company country
  targetCountry?: string; // Target master company country
  comparisonStatus: 'Match' | 'Mismatch';
  comparisonLabel: string; // e.g. "Verified Match", "Country Discrepancy", "No Match"
  mismatchReason?: string;
  comparisonColor: 'green' | 'red' | 'amber';
  comparisonDetails: {
    countryMatch: boolean;
    queryCountry?: string;
    targetCountry?: string;
    comparisonNote?: string;
    nameSimilarity?: number;
    countryScore?: number;
  };
  rawFuseScore?: number;
}

export interface FuzzyConfig {
  threshold: number; // 0.0 - 1.0 (default 0.6)
  distance: number;
  minMatchCharLength: number;
  ignoreLocation: boolean;
  isCaseSensitive: boolean;
}

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  table1: string[];
  table2: string[];
}

export interface MatchProgressInfo {
  current: number;
  total: number;
  currentItem: string;
  stage: 'indexing' | 'matching';
  percentage: number;
  itemsPerSecond?: number;
  etaSeconds?: number;
}

