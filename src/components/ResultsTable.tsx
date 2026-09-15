import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ArrowUpDown,
  Building,
  CheckCircle2,
  XCircle,
  Globe,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Filter,
  Sparkles,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { ProcessedRow } from '../types';

interface ResultsTableProps {
  results: ProcessedRow[];
  isLoading: boolean;
  progressText?: string;
}

type SortField =
  | 'query'
  | 'bestMatch'
  | 'confidenceScore'
  | 'nameScore'
  | 'queryCountry'
  | 'targetCountry'
  | 'comparisonStatus';
type SortOrder = 'asc' | 'desc';

type QuickConfidenceFilter = 'all' | 'high' | 'review' | 'low' | 'country-discrepancy';

export const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  isLoading,
  progressText
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<QuickConfidenceFilter>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>('confidenceScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jumpPageInput, setJumpPageInput] = useState('1');

  // Reset page to 1 when filters or sorting change
  useEffect(() => {
    setPage(1);
    setJumpPageInput('1');
  }, [searchTerm, confidenceFilter, minConfidence, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'confidenceScore' || field === 'nameScore' ? 'desc' : 'asc');
    }
  };

  const copyRow = async (row: ProcessedRow) => {
    const score = row.confidenceScore ?? row.matchPercent;
    const text = `${row.query}\t${row.bestMatch}\t${score}%\tName: ${row.nameScore ?? score}%\t${row.queryCountry || 'N/A'}\t${row.targetCountry || 'N/A'}\t${row.comparisonLabel || row.comparisonStatus}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // Precalculate stats for filter badges
  const counts = useMemo(() => {
    const total = results.length;
    const high = results.filter(r => (r.confidenceScore ?? r.matchPercent) >= 80).length;
    const review = results.filter(r => {
      const score = r.confidenceScore ?? r.matchPercent;
      return (score < 80 && score > 0) || r.comparisonLabel === 'Country Discrepancy';
    }).length;
    const low = results.filter(r => (r.confidenceScore ?? r.matchPercent) < 50 && (r.confidenceScore ?? r.matchPercent) > 0).length;
    const discrepancies = results.filter(r => r.comparisonLabel === 'Country Discrepancy').length;

    return { total, high, review, low, discrepancies };
  }, [results]);

  const filteredAndSorted = useMemo(() => {
    let list = [...results];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        r =>
          r.query.toLowerCase().includes(q) ||
          r.bestMatch.toLowerCase().includes(q) ||
          (r.queryCountry && r.queryCountry.toLowerCase().includes(q)) ||
          (r.targetCountry && r.targetCountry.toLowerCase().includes(q)) ||
          r.comparisonStatus.toLowerCase().includes(q) ||
          (r.comparisonLabel && r.comparisonLabel.toLowerCase().includes(q))
      );
    }

    // Quick Confidence Filter
    if (confidenceFilter === 'high') {
      list = list.filter(r => (r.confidenceScore ?? r.matchPercent) >= 80);
    } else if (confidenceFilter === 'review') {
      // Lower-accuracy matches or country discrepancies requiring manual review
      list = list.filter(r => {
        const score = r.confidenceScore ?? r.matchPercent;
        return (score < 80 && score > 0) || r.comparisonLabel === 'Country Discrepancy';
      });
    } else if (confidenceFilter === 'low') {
      list = list.filter(r => {
        const score = r.confidenceScore ?? r.matchPercent;
        return score < 50 && score > 0;
      });
    } else if (confidenceFilter === 'country-discrepancy') {
      list = list.filter(r => r.comparisonLabel === 'Country Discrepancy');
    }

    // Minimum confidence threshold filter
    if (minConfidence > 0) {
      list = list.filter(r => (r.confidenceScore ?? r.matchPercent) >= minConfidence);
    }

    // Sorting
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Fallback for confidenceScore
      if (sortField === 'confidenceScore') {
        valA = a.confidenceScore ?? a.matchPercent ?? 0;
        valB = b.confidenceScore ?? b.matchPercent ?? 0;
      } else if (sortField === 'nameScore') {
        valA = a.nameScore ?? a.matchPercent ?? 0;
        valB = b.nameScore ?? b.matchPercent ?? 0;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [results, searchTerm, confidenceFilter, minConfidence, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // Virtualized slice: render ONLY the active page of results to maintain 60fps responsiveness
  const pagedResults = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setPage(p);
    } else {
      setJumpPageInput(String(safePage));
    }
  };

  return (
    <div className="result-container mt-6 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-800">Results</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
              {filteredAndSorted.length} of {results.length} records
            </span>
            {counts.review > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>{counts.review} for manual review</span>
              </span>
            )}
          </div>

          {/* Search Input */}
          {results.length > 0 && (
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search company, country, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Confidence Filters & Minimum Threshold Control */}
        {results.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
            {/* Quick Confidence Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter:
              </span>

              <button
                type="button"
                onClick={() => setConfidenceFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  confidenceFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({counts.total})
              </button>

              <button
                type="button"
                onClick={() => setConfidenceFilter('high')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                  confidenceFilter === 'high'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>High (≥80%)</span>
                <span className="ml-0.5 text-[10px] opacity-80">({counts.high})</span>
              </button>

              <button
                type="button"
                onClick={() => setConfidenceFilter('review')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                  confidenceFilter === 'review'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                }`}
                title="Filter lower-accuracy matches or country discrepancies that may require manual inspection"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Manual Review (&lt;80%)</span>
                <span className="ml-0.5 text-[10px] opacity-80">({counts.review})</span>
              </button>

              <button
                type="button"
                onClick={() => setConfidenceFilter('low')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                  confidenceFilter === 'low'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                }`}
              >
                <XCircle className="w-3 h-3" />
                <span>Low (&lt;50%)</span>
                <span className="ml-0.5 text-[10px] opacity-80">({counts.low})</span>
              </button>
            </div>

            {/* Min Confidence Slider */}
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 font-medium whitespace-nowrap">Min Confidence:</span>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-20 accent-blue-600 cursor-pointer h-1.5"
              />
              <span className="font-mono font-bold text-slate-800 w-8 text-right">
                {minConfidence}%
              </span>
              {minConfidence > 0 && (
                <button
                  type="button"
                  onClick={() => setMinConfidence(0)}
                  className="text-[11px] text-slate-400 hover:text-slate-700 ml-1 underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table id="resultTable" className="w-full border-collapse bg-white text-left text-sm text-slate-700">
          <thead>
            <tr className="bg-slate-800 text-white select-none">
              <th
                onClick={() => handleSort('query')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>QUERY (TABLE 1)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('bestMatch')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>TARGET MASTER (TABLE 2)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              {/* Dedicated Confidence Score Column (0-100%) */}
              <th
                onClick={() => handleSort('confidenceScore')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors text-center w-48 whitespace-nowrap bg-slate-900/50"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>CONFIDENCE SCORE</span>
                  <ArrowUpDown className="w-3 h-3 opacity-80 text-amber-300" />
                </div>
              </th>
              <th
                onClick={() => handleSort('queryCountry')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>QUERY COUNTRY</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('targetCountry')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>TARGET COUNTRY</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('comparisonStatus')}
                className="py-3 px-4 font-semibold text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>STATUS</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-xs tracking-wider uppercase text-right w-16">
                Action
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
                      {progressText || 'Matching Query Records with Target Master...'}
                    </span>
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
                    Enter company data in Table 1 (Query List) &amp; Table 2 (Target Master), then click &quot;Run Fuzzy Lookup&quot;.
                  </p>
                </td>
              </tr>
            )}

            {!isLoading && results.length > 0 && filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  <AlertCircle className="w-7 h-7 mx-auto mb-2 text-slate-400" />
                  <p className="font-medium text-sm text-slate-700">No records match your active search or confidence filter.</p>
                  <p className="text-xs text-slate-400 mt-1">Try relaxing the minimum confidence threshold or selecting &quot;All&quot;.</p>
                </td>
              </tr>
            )}

            {!isLoading &&
              pagedResults.map((row) => {
                const confidence = row.confidenceScore ?? row.matchPercent ?? 0;
                const nameScore = row.nameScore ?? confidence;
                const isScoreHigh = confidence >= 80;
                const isScoreMedium = confidence >= 50 && confidence < 80;
                const isNoMatch = row.bestMatch === 'No match found' || confidence === 0;
                const isMatch = row.comparisonStatus === 'Match';
                const isDiscrepancy = row.comparisonLabel === 'Country Discrepancy';

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/90 transition-colors group"
                  >
                    {/* QUERY (TABLE 1) */}
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">
                      {row.query}
                    </td>

                    {/* TARGET MASTER (TABLE 2) */}
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {isNoMatch ? (
                        <span className="text-slate-400 italic">No match found</span>
                      ) : (
                        <span className="font-semibold">{row.bestMatch}</span>
                      )}
                    </td>

                    {/* CONFIDENCE SCORE (0-100%) COLUMN */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 border shadow-2xs ${
                              isNoMatch
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : isScoreHigh
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isScoreMedium
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                            }`}
                          >
                            <span>{confidence}%</span>
                            {isScoreHigh && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {isScoreMedium && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          </span>
                        </div>

                        {/* Mini Progress Bar */}
                        {!isNoMatch && (
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isScoreHigh
                                  ? 'bg-emerald-500'
                                  : isScoreMedium
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                        )}

                        {/* Breakdown Subtitle */}
                        {!isNoMatch && (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            Name: <span className="font-semibold text-slate-600">{nameScore}%</span>
                            {' · '}
                            Country: <span className="font-semibold text-slate-600">{row.comparisonDetails.countryMatch ? 'Verified' : (row.targetCountry === 'N/A' || !row.targetCountry ? 'N/A' : 'Differs')}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* QUERY COUNTRY */}
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {row.queryCountry && row.queryCountry !== 'N/A' ? (
                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{row.queryCountry}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">N/A</span>
                      )}
                    </td>

                    {/* TARGET COUNTRY */}
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {row.targetCountry && row.targetCountry !== 'N/A' ? (
                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{row.targetCountry}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">N/A</span>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isDiscrepancy ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs"
                          title="High company name match, but countries differ. Manual review suggested."
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Country Discrepancy</span>
                        </span>
                      ) : isMatch ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{row.comparisonLabel || 'Match'}</span>
                        </span>
                      ) : row.comparisonLabel === 'Country Mismatch' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Country Mismatch</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>No Match</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => copyRow(row)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Copy row to clipboard"
                      >
                        {copiedId === row.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar for Results Table */}
      {!isLoading && filteredAndSorted.length > 0 && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Record count summary & page size selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-slate-500 font-medium">
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredAndSorted.length).toLocaleString()} of{' '}
              {filteredAndSorted.length.toLocaleString()} records
            </span>

            {filteredAndSorted.length > 25 && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                  <option value={250}>250 / page</option>
                  <option value={500}>500 / page</option>
                </select>
              </div>
            )}
          </div>

          {/* Page navigation buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={safePage <= 1}
                className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 rounded-md hover:bg-slate-100 shadow-2xs transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 rounded-md hover:bg-slate-100 shadow-2xs transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Jump Form */}
              <form onSubmit={handleJumpPage} className="flex items-center gap-1 px-1">
                <span className="text-[11px] text-slate-500">Page</span>
                <input
                  type="text"
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  onBlur={() => setJumpPageInput(String(safePage))}
                  className="w-12 text-center py-1 px-1 bg-white border border-slate-200 rounded-md text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 shadow-2xs"
                />
                <span className="text-[11px] text-slate-500">of {totalPages.toLocaleString()}</span>
              </form>

              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 rounded-md hover:bg-slate-100 shadow-2xs transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
                className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 rounded-md hover:bg-slate-100 shadow-2xs transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
