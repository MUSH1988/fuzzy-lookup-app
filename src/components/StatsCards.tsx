import React from 'react';
import { CheckCircle, AlertCircle, HelpCircle, Layers, Award } from 'lucide-react';
import { ProcessedRow } from '../types';

interface StatsCardsProps {
  results: ProcessedRow[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ results }) => {
  if (results.length === 0) return null;

  const total = results.length;
  const highMatches = results.filter(r => r.matchPercent >= 70).length;
  const mediumMatches = results.filter(r => r.matchPercent >= 40 && r.matchPercent < 70).length;
  const lowMatches = results.filter(r => r.matchPercent < 40).length;
  const avgScore = Math.round(
    results.reduce((acc, curr) => acc + curr.matchPercent, 0) / (total || 1)
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Total Processed</p>
          <p className="text-xl font-bold text-slate-900">{total}</p>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">High Match (≥70%)</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-emerald-700">{highMatches}</p>
            <span className="text-xs text-emerald-600 font-medium">
              ({Math.round((highMatches / total) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Moderate (40–69%)</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-amber-700">{mediumMatches}</p>
            <span className="text-xs text-amber-600 font-medium">
              ({Math.round((mediumMatches / total) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Avg Similarity</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-indigo-700">{avgScore}%</p>
            <span className="text-xs text-slate-400">
              {lowMatches > 0 ? `${lowMatches} low` : 'all matched'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
