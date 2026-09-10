import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, ArrowUpDown, Building, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { ProcessedRow } from '../types';

interface ResultsTableProps {
  results: ProcessedRow[];
  isLoading: boolean;
  progressText?: string;
}

type SortField = 'query' | 'bestMatch' | 'matchPercent' | 'verification' | 'companySize' | 'industry';
type SortOrder = 'asc' | 'desc';

export const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  isLoading,
  progressText
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortField, setSortField] = useState<SortField>('matchPercent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'matchPercent' ? 'desc' : 'asc');
    }
  };

  const copyRow = async (row: ProcessedRow) => {
    const text = `${row.query}\t${row.bestMatch}\t${row.matchPercent}%\t${row.verification}\t${row.companySize}\t${row.industry}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...results];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        r =>
          r.query.toLowerCase().includes(q) ||
          r.bestMatch.toLowerCase().includes(q) ||
          r.industry.toLowerCase().includes(q) ||
          r.companySize.toLowerCase().includes(q)
      );
    }

    // Tier filter
    if (filterTier === 'high') {
      list = list.filter(r => r.matchPercent >= 70);
    } else if (filterTier === 'medium') {
      list = list.filter(r => r.matchPercent >= 40 && r.matchPercent < 70);
    } else if (filterTier === 'low') {
      list = list.filter(r => r.matchPercent < 40);
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [results, searchTerm, filterTier, sortField, sortOrder]);

  return (
    <div className="result-container mt-6 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-800">Results</h3>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
            {filteredAndSorted.length} of {results.length}
          </span>
        </div>

        {results.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search within results */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter results..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setFilterTier('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterTier === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterTier('high')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterTier === 'high' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                ≥70%
              </button>
              <button
                type="button"
                onClick={() => setFilterTier('medium')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterTier === 'medium' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                40–69%
              </button>
              <button
                type="button"
                onClick={() => setFilterTier('low')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterTier === 'low' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-500 hover:text-red-700'
                }`}
              >
                &lt;40%
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table id="resultTable" className="w-full border-collapse bg-white text-left text-sm text-slate-700">
          <thead>
            <tr className="bg-slate-800 text-white select-none">
              <th
                onClick={() => handleSort('query')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Query (Table 2)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('bestMatch')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Best Match (Table 1)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('matchPercent')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors text-center w-36"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Similarity Score</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('verification')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>LinkedIn Verification</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('companySize')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Company Size</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('industry')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Industry</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-xs tracking-wider uppercase text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium text-slate-700 text-sm">
                      {progressText || 'Processing & Fetching LinkedIn Data...'}
                    </span>
                    <span className="text-xs text-slate-400">Comparing company tokens using Fuse.js</span>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && results.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Building className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No lookup results yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter or paste company names in Table 1 and Table 2 above, then click &quot;Run Fuzzy Lookup &amp; Get LinkedIn Data&quot;.
                  </p>
                </td>
              </tr>
            )}

            {!isLoading && results.length > 0 && filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No records match your active search or score filter.
                </td>
              </tr>
            )}

            {!isLoading &&
              filteredAndSorted.map((row) => {
                const isHigh = row.matchPercent >= 70;
                const isMedium = row.matchPercent >= 40 && row.matchPercent < 70;
                const isNoMatch = row.bestMatch === 'No match found' || row.matchPercent < 20;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Query (Table 2) */}
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">
                      {row.query}
                    </td>

                    {/* Best Match (Table 1) */}
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {isNoMatch ? (
                        <span className="text-slate-400 italic">No match found</span>
                      ) : (
                        <span className="font-semibold">{row.bestMatch}</span>
                      )}
                    </td>

                    {/* Similarity Score */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                            isHigh
                              ? 'score-high bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isMedium
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'score-low bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {row.matchPercent}%
                        </span>
                      </div>
                    </td>

                    {/* LinkedIn Verification */}
                    <td className="py-3 px-4">
                      {row.verification === 'Verified Page' ? (
                        <span className="badge-verified inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{row.verification}</span>
                        </span>
                      ) : row.verification !== 'N/A' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
                          {row.verification}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </td>

                    {/* Company Size */}
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {row.companySize}
                    </td>

                    {/* Industry */}
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <span className="line-clamp-1">{row.industry}</span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => copyRow(row)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="Copy row to clipboard"
                        >
                          {copiedId === row.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {row.linkedinUrl && (
                          <a
                            href={row.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors inline-flex items-center"
                            title="Open company search on LinkedIn"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
