import React, { useState, useRef } from 'react';
import { Play, FileSpreadsheet, Download, Copy, Check, RefreshCw, AlertTriangle, Sparkles, XCircle, Database, Search } from 'lucide-react';
import { Header } from './components/Header';
import { ExcelGridInput } from './components/ExcelGridInput';
import { StatsCards } from './components/StatsCards';
import { ResultsTable } from './components/ResultsTable';
import { FuzzyConfigModal } from './components/FuzzyConfigModal';
import { SAMPLE_PRESETS } from './data/sampleData';
import { DEFAULT_FUZZY_CONFIG, performFuzzyLookup, validatePastedQueryData } from './utils/fuzzyMatcher';
import { exportResultsToExcel, exportResultsToCSV, copyResultsToClipboard } from './utils/excelExporter';
import { FuzzyConfig, ProcessedRow, SamplePreset, MatchProgressInfo } from './types';

export default function App() {
  const defaultPreset = SAMPLE_PRESETS[0];

  const [table1Text, setTable1Text] = useState(defaultPreset.table1.join('\n'));
  const [table2Text, setTable2Text] = useState(defaultPreset.table2.join('\n'));
  const [activePresetId, setActivePresetId] = useState<string>(defaultPreset.id);

  const [fuzzyConfig, setFuzzyConfig] = useState<FuzzyConfig>(DEFAULT_FUZZY_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [results, setResults] = useState<ProcessedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressInfo, setProgressInfo] = useState<MatchProgressInfo | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSelectPreset = (preset: SamplePreset) => {
    setTable1Text(preset.table1.join('\n'));
    setTable2Text(preset.table2.join('\n'));
    setActivePresetId(preset.id);
    setAlertMessage(null);
  };

  const handleCancelLookup = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRunLookup = async () => {
    const text1 = table1Text.trim();
    const text2 = table2Text.trim();

    if (!text1 || !text2) {
      setAlertMessage('Please enter or paste data into both Table 1 and Table 2 before running the lookup.');
      return;
    }

    const validation = validatePastedQueryData(text1);
    if (!validation.isValid) {
      setAlertMessage(`Invalid data structure in Table 1 (Query List): ${validation.errors.join(' ')}`);
      return;
    }

    setAlertMessage(null);
    setIsLoading(true);
    setProgressInfo(null);
    setProgressText('Initializing high-speed lookup engine...');

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const list1 = text1.split('\n').map(i => i.trim()).filter(Boolean);
      const list2 = text2.split('\n').map(i => i.trim()).filter(Boolean);

      const processed = await performFuzzyLookup(
        list1,
        list2,
        fuzzyConfig,
        (currentOrInfo, total, currentItem) => {
          if (typeof currentOrInfo === 'object') {
            setProgressInfo(currentOrInfo);
            if (currentOrInfo.stage === 'indexing') {
              setProgressText(`Indexing ${currentOrInfo.current.toLocaleString()} of ${currentOrInfo.total.toLocaleString()} target master companies...`);
            } else {
              setProgressText(`Matching query ${currentOrInfo.current.toLocaleString()} of ${currentOrInfo.total.toLocaleString()}: "${currentOrInfo.currentItem}"`);
            }
          } else {
            const current = currentOrInfo;
            const tot = total ?? 1;
            const item = currentItem ?? '';
            setProgressInfo({
              current,
              total: tot,
              currentItem: item,
              stage: 'matching',
              percentage: Math.round((current / tot) * 100)
            });
            setProgressText(`Matching query ${current.toLocaleString()} of ${tot.toLocaleString()}: "${item}"`);
          }
        },
        { signal: abortCtrl.signal }
      );

      if (abortCtrl.signal.aborted) {
        setAlertMessage(`Lookup stopped by user. Found ${processed.length.toLocaleString()} matching records.`);
      }
      setResults(processed);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setAlertMessage('Lookup was cancelled by user.');
      } else {
        console.error('Error during fuzzy lookup:', err);
        setAlertMessage('An unexpected error occurred during processing.');
      }
    } finally {
      setIsLoading(false);
      setProgressText('');
      setProgressInfo(null);
      abortControllerRef.current = null;
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      setAlertMessage('Please run a lookup before exporting to Excel.');
      return;
    }
    setAlertMessage(null);
    try {
      exportResultsToExcel(results, 'Fuzzy_Lookup_by_Christian.xlsx');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAlertMessage(err.message);
      } else {
        setAlertMessage('Failed to export Excel file.');
      }
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      setAlertMessage('Please run a lookup before exporting to CSV.');
      return;
    }
    setAlertMessage(null);
    try {
      exportResultsToCSV(results, 'Fuzzy_Lookup_by_Christian.csv');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAlertMessage(err.message);
      }
    }
  };

  const handleCopyClipboard = async () => {
    if (results.length === 0) return;
    const ok = await copyResultsToClipboard(results);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    }
  };

  const handleClearAll = () => {
    setTable1Text('');
    setTable2Text('');
    setResults([]);
    setActivePresetId('');
    setAlertMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Navigation & App Bar */}
      <Header
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
        onOpenSettings={() => setIsConfigOpen(true)}
        threshold={fuzzyConfig.threshold}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Inline Notification Banner */}
        {alertMessage && (
          <div
            id="app-alert"
            className="mb-5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center justify-between text-xs sm:text-sm animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{alertMessage}</span>
            </div>
            <button
              onClick={() => setAlertMessage(null)}
              className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded hover:bg-amber-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Two-Column Tables Container */}
        <div className="tables-container grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="table-box">
            <ExcelGridInput
              id="table-box-1"
              value={table1Text}
              onChange={(val) => {
                setTable1Text(val);
                setActivePresetId('');
              }}
              title="Table 1: Query List (Excel Grid)"
              subtitle="Paste from Excel or Sheets. Columns: Company Name and Country."
              emptyMessage="Query table is empty. Copy 2 columns (Company Name, Country) from Excel or Sheets and press Ctrl+V, or click 'Paste from Excel'."
              accentColor="blue"
            />
          </div>

          <div className="table-box">
            <ExcelGridInput
              id="table-box-2"
              value={table2Text}
              onChange={(val) => {
                setTable2Text(val);
                setActivePresetId('');
              }}
              title="Table 2: Target Master List (Excel Grid)"
              subtitle="The verified master directory. If no country is specified, it automatically defaults to N/A."
              defaultEmptyCountry="N/A"
              emptyMessage="Target Master table is empty. Copy verified master records from Excel or Sheets. Missing country automatically defaults to N/A."
              accentColor="emerald"
            />
          </div>
        </div>

        {/* Action Button Group */}
        <div className="btn-group flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          {isLoading ? (
            <button
              id="btn-cancel-lookup"
              type="button"
              onClick={handleCancelLookup}
              className="btn-run flex-1 py-3.5 px-6 font-semibold text-sm sm:text-base text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              <span>Stop / Cancel Lookup</span>
            </button>
          ) : (
            <button
              id="btn-run-lookup"
              type="button"
              onClick={handleRunLookup}
              className="btn-run flex-1 py-3.5 px-6 font-semibold text-sm sm:text-base text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Run Fuzzy Lookup</span>
            </button>
          )}

          <button
            id="btn-export-excel"
            type="button"
            disabled={isLoading || results.length === 0}
            onClick={handleExportExcel}
            className="btn-export flex-1 py-3.5 px-6 font-semibold text-sm sm:text-base text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Export Results to Excel (.xlsx)</span>
          </button>

          {/* Auxiliary utilities when results are ready */}
          {results.length > 0 && !isLoading && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="py-3 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                title="Export as comma-separated values (.csv)"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span className="hidden md:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCopyClipboard}
                className="py-3 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                title="Copy entire table to clipboard for Google Sheets / Excel"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span className="hidden md:inline">Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="py-3 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
                title="Clear all lists & results"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Real-time Progress Display during Lookup */}
        {isLoading && (
          <div className="mb-6 p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  {progressInfo?.stage === 'indexing'
                    ? 'Phase 1: Building High-Speed Master Index'
                    : 'Phase 2: Ultra-Fast Fuzzy Matching'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {progressInfo?.itemsPerSecond && (
                  <span className="text-xs text-slate-400 font-mono">
                    {Math.round(progressInfo.itemsPerSecond).toLocaleString()} items/sec
                  </span>
                )}
                <span className="text-sm font-mono font-bold text-white">
                  {progressInfo?.percentage ?? 0}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full bg-linear-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-150"
                style={{ width: `${Math.min(100, Math.max(2, progressInfo?.percentage ?? 0))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2 truncate pr-2">
                {progressInfo?.stage === 'indexing' ? (
                  <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{progressText}</span>
              </div>

              {progressInfo && progressInfo.total > 0 && (
                <span className="text-slate-400 shrink-0 font-mono text-[11px]">
                  {progressInfo.current.toLocaleString()} / {progressInfo.total.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Statistical Summary Cards */}
        <StatsCards results={results} />

        {/* Results Table */}
        <ResultsTable
          results={results}
          isLoading={isLoading}
          progressText={progressText}
        />

        {/* How It Works & Footer Note */}
        <div className="mt-8 p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">
                About Fuzzy Lookup by Christian
              </p>
              <p className="mt-1">
                This utility uses <strong>Fuse.js</strong> approximate string matching to find the best match for company names between <strong>Table 1 (Query List)</strong> and <strong>Table 2 (Target Master List)</strong>. It validates <strong>Company Name</strong> and <strong>Country</strong> comparisons with clear match or country mismatch status, and provides 1-click Excel and CSV export.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Fuzzy Matching Parameters Configuration Modal */}
      <FuzzyConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={fuzzyConfig}
        onChange={setFuzzyConfig}
      />
    </div>
  );
}
