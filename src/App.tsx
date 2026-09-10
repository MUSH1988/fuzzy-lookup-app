import React, { useState } from 'react';
import { Play, FileSpreadsheet, Download, Copy, Check, RefreshCw, AlertTriangle, Sparkles, Sliders } from 'lucide-react';
import { Header } from './components/Header';
import { TableInputBox } from './components/TableInputBox';
import { StatsCards } from './components/StatsCards';
import { ResultsTable } from './components/ResultsTable';
import { FuzzyConfigModal } from './components/FuzzyConfigModal';
import { SAMPLE_PRESETS } from './data/sampleData';
import { DEFAULT_FUZZY_CONFIG, performFuzzyLookup } from './utils/fuzzyMatcher';
import { exportResultsToExcel, exportResultsToCSV, copyResultsToClipboard } from './utils/excelExporter';
import { FuzzyConfig, ProcessedRow, SamplePreset } from './types';

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
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleSelectPreset = (preset: SamplePreset) => {
    setTable1Text(preset.table1.join('\n'));
    setTable2Text(preset.table2.join('\n'));
    setActivePresetId(preset.id);
    setAlertMessage(null);
  };

  const handleRunLookup = async () => {
    const text1 = table1Text.trim();
    const text2 = table2Text.trim();

    if (!text1 || !text2) {
      setAlertMessage('Paki-paste ang data sa parehong Table 1 at Table 2 (Please paste data into both Table 1 and Table 2).');
      return;
    }

    setAlertMessage(null);
    setIsLoading(true);
    setProgressText('Processing & Fetching LinkedIn Data...');

    try {
      const list1 = text1.split('\n').map(i => i.trim()).filter(Boolean);
      const list2 = text2.split('\n').map(i => i.trim()).filter(Boolean);

      const processed = await performFuzzyLookup(
        list1,
        list2,
        fuzzyConfig,
        (current, total, currentItem) => {
          setProgressText(`Matching query ${current} of ${total}: "${currentItem}"...`);
        }
      );

      setResults(processed);
    } catch (err) {
      console.error('Error during fuzzy lookup:', err);
      setAlertMessage('An unexpected error occurred during processing.');
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      setAlertMessage('Mag-run muna ng lookup bago mag-export (Please run a lookup before exporting).');
      return;
    }
    setAlertMessage(null);
    try {
      exportResultsToExcel(results, 'Fuzzy_Lookup_LinkedIn_Data.xlsx');
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
      setAlertMessage('Mag-run muna ng lookup bago mag-export.');
      return;
    }
    setAlertMessage(null);
    try {
      exportResultsToCSV(results, 'Fuzzy_Lookup_LinkedIn_Data.csv');
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
        <div className="tables-container grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="table-box">
            <TableInputBox
              id="table-box-1"
              textareaId="table1"
              title="Table 1: Master List / Target Data"
              subtitle="The verified source list of official company names to match against"
              placeholder={'Apple Inc.\nGoogle LLC\nMicrosoft Corp'}
              value={table1Text}
              onChange={(val) => {
                setTable1Text(val);
                setActivePresetId('');
              }}
              badgeLabel="Master targets"
              badgeColor="bg-blue-50 text-blue-700 border border-blue-200"
            />
          </div>

          <div className="table-box">
            <TableInputBox
              id="table-box-2"
              textareaId="table2"
              title="Table 2: Lookup List / Query Data"
              subtitle="The uncleaned query list (with potential typos, abbreviations, or variants)"
              placeholder={'Apple\nGoogle\nMicrosft'}
              value={table2Text}
              onChange={(val) => {
                setTable2Text(val);
                setActivePresetId('');
              }}
              badgeLabel="Queries to match"
              badgeColor="bg-purple-50 text-purple-700 border border-purple-200"
            />
          </div>
        </div>

        {/* Action Button Group */}
        <div className="btn-group flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <button
            id="btn-run-lookup"
            type="button"
            disabled={isLoading}
            onClick={handleRunLookup}
            className="btn-run flex-1 py-3.5 px-6 font-semibold text-sm sm:text-base text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing Lookup...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Run Fuzzy Lookup &amp; Get LinkedIn Data</span>
              </>
            )}
          </button>

          <button
            id="btn-export-excel"
            type="button"
            onClick={handleExportExcel}
            className="btn-export flex-1 py-3.5 px-6 font-semibold text-sm sm:text-base text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Export Results to Excel (.xlsx)</span>
          </button>

          {/* Auxiliary utilities when results are ready */}
          {results.length > 0 && (
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

        {/* Statistical Summary Cards */}
        <StatsCards results={results} />

        {/* Results Table */}
        <ResultsTable
          results={results}
          isLoading={isLoading}
          progressText={progressText}
        />

        {/* How It Works & Educational Footer Note */}
        <div className="mt-8 p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">
                About Fuzzy Matching &amp; LinkedIn Company Data Enrichment
              </p>
              <p className="mt-1">
                This utility uses <strong>Bitap</strong> approximate string matching via <strong>Fuse.js</strong> to compare phonetic and character distance between variations (e.g., &quot;Microsft&quot; → &quot;Microsoft Corp&quot; with 86% match). Upon matching, company organization profiles (Verification status, Employee tier, and Industry sector) are resolved and prepared for 1-click export to formatted Microsoft Excel (<code>.xlsx</code>) spreadsheets.
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
