export interface LinkedInCompanyInfo {
  verification: 'Verified Page' | 'Claimed Page' | 'Community Page' | 'N/A';
  companySize: string;
  industry: string;
  headquarters?: string;
  founded?: number | string;
  website?: string;
  linkedinUrl?: string;
  description?: string;
}

export interface ProcessedRow {
  id: string;
  query: string;
  bestMatch: string;
  matchScore: number; // 0 to 1 (Fuse score: 0 is exact match, 1 is no match)
  matchPercent: number; // 0 to 100%
  verification: string;
  companySize: string;
  industry: string;
  headquarters?: string;
  website?: string;
  linkedinUrl?: string;
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
