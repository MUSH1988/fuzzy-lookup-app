import React from 'react';
import { X, Sliders, Info, RotateCcw } from 'lucide-react';
import { FuzzyConfig } from '../types';
import { DEFAULT_FUZZY_CONFIG } from '../utils/fuzzyMatcher';

interface FuzzyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FuzzyConfig;
  onChange: (config: FuzzyConfig) => void;
}

export const FuzzyConfigModal: React.FC<FuzzyConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onChange({ ...DEFAULT_FUZZY_CONFIG });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Fuse.js Match Parameters</h3>
              <p className="text-xs text-slate-500">Fine-tune fuzzy distance & matching tolerance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Threshold */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Fuzzy Threshold</label>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {config.threshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={config.threshold}
              onChange={(e) => onChange({ ...config, threshold: parseFloat(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>0.0 (Strict Exact)</span>
              <span className="text-blue-600 font-medium">0.6 (Balanced Default)</span>
              <span>1.0 (Loose)</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                At <strong>0.0</strong>, a perfect match is required. At <strong>0.6</strong>, moderate typos like &quot;Microsft&quot; or &quot;Spotfy&quot; match seamlessly.
              </span>
            </p>
          </div>

          {/* Distance */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Matching Distance</label>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {config.distance}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={config.distance}
              onChange={(e) => onChange({ ...config, distance: parseInt(e.target.value, 10) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Determines how close the match must be to the fuzzy search index position.
            </p>
          </div>

          {/* Case Sensitivity */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">Case Sensitive</p>
              <p className="text-[11px] text-slate-400">Match uppercase and lowercase characters strictly</p>
            </div>
            <input
              type="checkbox"
              checked={config.isCaseSensitive}
              onChange={(e) => onChange({ ...config, isCaseSensitive: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Default (0.6)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
