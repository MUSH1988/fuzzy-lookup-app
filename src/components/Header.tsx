import React from 'react';
import { SlidersHorizontal, Sparkles, Database } from 'lucide-react';
import { SamplePreset } from '../types';
import { SAMPLE_PRESETS } from '../data/sampleData';

interface HeaderProps {
  onSelectPreset: (preset: SamplePreset) => void;
  activePresetId?: string;
  onOpenSettings: () => void;
  threshold: number;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectPreset,
  activePresetId,
  onOpenSettings,
  threshold
}) => {
  return (
    <header className="border-b border-slate-200 bg-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Fuzzy Lookup + LinkedIn Company Auto-Fetcher
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Batch fuzzy matching with Fuse.js, real-time company verification, and Excel export
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-settings-config"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Adjust Fuse.js matching threshold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Threshold: {(threshold * 100).toFixed(0)}% ({threshold})</span>
            </button>

            <div className="hidden sm:block h-5 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Presets:
              </span>
              {SAMPLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  id={`btn-preset-${preset.id}`}
                  onClick={() => onSelectPreset(preset)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${
                    activePresetId === preset.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  }`}
                  title={preset.description}
                >
                  {preset.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
