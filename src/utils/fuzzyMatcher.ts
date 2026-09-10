import Fuse, { IFuseOptions } from 'fuse.js';
import { FuzzyConfig, ProcessedRow, LinkedInCompanyInfo } from '../types';
import { generateLinkedInInfo } from '../data/companyDirectory';

export const DEFAULT_FUZZY_CONFIG: FuzzyConfig = {
  threshold: 0.6,
  distance: 100,
  minMatchCharLength: 1,
  ignoreLocation: true,
  isCaseSensitive: false
};

export interface MatchProgressCallback {
  (current: number, total: number, currentItem: string): void;
}

/**
 * Executes fuzzy matching between query list (Table 2) and master target list (Table 1)
 */
export async function performFuzzyLookup(
  masterList: string[],
  queryList: string[],
  config: FuzzyConfig = DEFAULT_FUZZY_CONFIG,
  onProgress?: MatchProgressCallback,
  fetchLiveLinkedIn?: (company: string) => Promise<LinkedInCompanyInfo | null>
): Promise<ProcessedRow[]> {
  const cleanMaster = masterList.map(s => s.trim()).filter(Boolean);
  const cleanQueries = queryList.map(s => s.trim()).filter(Boolean);

  if (cleanMaster.length === 0 || cleanQueries.length === 0) {
    return [];
  }

  // Configure Fuse.js
  const fuseOptions: IFuseOptions<string> = {
    includeScore: true,
    threshold: config.threshold,
    distance: config.distance,
    minMatchCharLength: config.minMatchCharLength,
    ignoreLocation: config.ignoreLocation,
    isCaseSensitive: config.isCaseSensitive,
    findAllMatches: true
  };

  const fuse = new Fuse(cleanMaster, fuseOptions);
  const results: ProcessedRow[] = [];

  for (let i = 0; i < cleanQueries.length; i++) {
    const query = cleanQueries[i];
    if (onProgress) {
      onProgress(i + 1, cleanQueries.length, query);
    }

    // Direct check for exact match first (case insensitive)
    const exactMatch = cleanMaster.find(m => m.toLowerCase() === query.toLowerCase());

    let bestMatch = 'No match found';
    let matchPercent = 0;
    let rawFuseScore = 1;

    if (exactMatch) {
      bestMatch = exactMatch;
      matchPercent = 100;
      rawFuseScore = 0;
    } else {
      const searchResults = fuse.search(query);
      if (searchResults && searchResults.length > 0) {
        bestMatch = searchResults[0].item;
        const score = searchResults[0].score ?? 0;
        rawFuseScore = score;
        matchPercent = Math.max(0, Math.min(100, Math.round((1 - score) * 100)));
      }
    }

    // Fetch or generate LinkedIn data
    let linkedinInfo: LinkedInCompanyInfo = {
      verification: 'N/A',
      companySize: 'N/A',
      industry: 'N/A'
    };

    if (bestMatch !== 'No match found') {
      if (fetchLiveLinkedIn) {
        try {
          const live = await fetchLiveLinkedIn(bestMatch);
          if (live) {
            linkedinInfo = live;
          } else {
            linkedinInfo = generateLinkedInInfo(bestMatch);
          }
        } catch {
          linkedinInfo = generateLinkedInInfo(bestMatch);
        }
      } else {
        // Instant simulated/enriched knowledge base
        linkedinInfo = generateLinkedInInfo(bestMatch);
      }
    }

    results.push({
      id: `row-${i}-${Date.now()}`,
      query,
      bestMatch,
      matchScore: rawFuseScore,
      matchPercent,
      rawFuseScore,
      verification: linkedinInfo.verification,
      companySize: linkedinInfo.companySize,
      industry: linkedinInfo.industry,
      headquarters: linkedinInfo.headquarters,
      website: linkedinInfo.website,
      linkedinUrl: linkedinInfo.linkedinUrl
    });

    // Small yield so the browser remains fully responsive on larger datasets
    if (i % 10 === 0 && i > 0) {
      await new Promise(r => setTimeout(r, 10));
    }
  }

  return results;
}
