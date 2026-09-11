import React from 'react';
import { CheckCircle2, AlertTriangle, Layers, Sparkles } from 'lucide-react';
import { ProcessedRow } from '../types';

interface StatsCardsProps {
  results: ProcessedRow[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ results }) => {
  if (results.length === 0) return null;

  const total = results.length;
  const highConfidenceCount = results.filter(r => (r.confidenceScore ?? r.matchPercent) >= 80).length;
  const reviewCount = results.filter(r => {
    const score = r.confidenceScore ?? r.matchPercent;
    return (score < 80 && score > 0) || r.comparisonLabel === 'Country Discrepancy';
  }).length;
  
  const avgConfidence = Math.round(
    results.reduce((acc, r) => acc + (r.confidenceScore ?? r.matchPercent ?? 0), 0) / total
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
      {/* Total Processed */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Total Records</p>
          <p className="text-xl font-bold text-slate-900">{total}</p>
        </div>
      </div>

      {/* High Confidence Matches (>= 80%) */}
      <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">High Confidence (≥80%)</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-emerald-700">{highConfidenceCount}</p>
            <span className="text-xs text-emerald-600 font-medium">
              ({Math.round((highConfidenceCount / total) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Manual Review Required (< 80% or Country Discrepancy) */}
      <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Manual Review (&lt;80%)</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-amber-700">{reviewCount}</p>
            <span className="text-xs text-amber-600 font-medium">
              ({Math.round((reviewCount / total) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Average Confidence Score */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Avg Confidence</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-indigo-700">{avgConfidence}%</p>
            <span className="text-xs text-slate-400 font-normal">weighted</span>
          </div>
        </div>
      </div>
    </div>
  );
};
