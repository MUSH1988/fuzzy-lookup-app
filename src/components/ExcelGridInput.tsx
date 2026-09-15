import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
  Clipboard,
  Check,
  Globe,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2
} from 'lucide-react';
import { normalizeCountry } from '../data/companyDirectory';
import { splitLineIntoCompanyAndCountry } from '../utils/fuzzyMatcher';

export interface ExcelGridRow {
  name: string;
  country: string;
}

export interface GridNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string[];
}

interface ExcelGridInputProps {
  id: string;
  value: string;
  onChange: (newValue: string) => void;
  title?: string;
  subtitle?: string;
  defaultEmptyCountry?: string;
  emptyMessage?: string;
  accentColor?: 'blue' | 'emerald';
}

/**
 * Parses pasted text into structured ExcelGridRow entries with 2 columns:
 * 1. Company Name
 * 2. Country
 */
export function parseExcelDataToRows(
  text: string,
  defaultEmptyCountry: string = ''
): ExcelGridRow[] {
  const result = parseAndValidateExcelPaste(text, defaultEmptyCountry);
  return result.rows;
}

/**
 * Validates and parses pasted data from Excel or text (tabs, pipes, commas).
 */
export function parseAndValidateExcelPaste(
  text: string,
  defaultEmptyCountry: string = ''
): {
  rows: ExcelGridRow[];
  notification: GridNotification | null;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      rows: [],
      notification: {
        type: 'error',
        title: 'Empty Clipboard Input',
        message: 'The clipboard is empty. Please copy rows containing Company Name and Country from Excel or Sheets.'
      }
    };
  }

  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: ExcelGridRow[] = [];
  const errors: string[] = [];
  let defaultedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const { name, country } = splitLineIntoCompanyAndCountry(line);

    if (!name) {
      continue;
    }

    // Skip recognizable header row
    const c0 = name.toLowerCase();
    if (
      i === 0 &&
      (c0 === 'company' ||
        c0 === 'company name' ||
        c0 === 'target' ||
        c0 === 'target name' ||
        c0 === 'query' ||
        c0 === 'name' ||
        c0 === 'master list' ||
        /^(country|nation|location)$/i.test(country))
    ) {
      continue;
    }

    let finalCountry = '';
    if (country) {
      const normalizedCountry = normalizeCountry(country);
      if (normalizedCountry === 'N/A' || normalizedCountry === '-') {
        finalCountry = defaultEmptyCountry || 'N/A';
      } else {
        finalCountry = normalizedCountry;
      }
    } else {
      finalCountry = defaultEmptyCountry || '';
    }

    if (!country && defaultEmptyCountry) {
      defaultedCount++;
    }

    rows.push({
      name,
      country: finalCountry
    });
  }

  let notification: GridNotification | null = null;

  if (rows.length === 0 && errors.length > 0) {
    notification = {
      type: 'error',
      title: 'Invalid Pasted Data Structure',
      message: 'Unable to parse pasted content into company records. Each row must have a valid Company Name in Column 1 and optional Country in Column 2.',
      details: errors
    };
  } else if (errors.length > 0) {
    notification = {
      type: 'error',
      title: 'Pasting Completed with Warnings',
      message: `Parsed ${rows.length} valid row${rows.length > 1 ? 's' : ''}, but found ${errors.length} invalid row${errors.length > 1 ? 's' : ''}:`,
      details: errors
    };
  } else if (rows.length > 0) {
    const defaultNote = defaultedCount > 0 && defaultEmptyCountry === 'N/A'
      ? ` (${defaultedCount} row${defaultedCount > 1 ? 's' : ''} with no country auto-set to N/A)`
      : '';

    notification = {
      type: 'success',
      title: 'Excel Data Parsed Successfully',
      message: `Successfully loaded ${rows.length} company record${rows.length > 1 ? 's' : ''}${defaultNote}.`
    };
  }

  return { rows, notification };
}

/**
 * Converts structured ExcelGridRow list back to newline-delimited text.
 */
export function serializeRowsToText(rows: ExcelGridRow[]): string {
  return rows
    .filter(r => r.name.trim() !== '')
    .map(r => {
      const name = r.name.trim();
      const ctry = r.country.trim();
      return ctry ? `${name} | ${ctry}` : name;
    })
    .join('\n');
}

export const ExcelGridInput: React.FC<ExcelGridInputProps> = ({
  id,
  value,
  onChange,
  title = 'Table 1: Query List (Excel Grid)',
  subtitle = 'Paste from Excel or Sheets. Columns: Company Name and Country.',
  defaultEmptyCountry = '',
  emptyMessage,
  accentColor = 'blue'
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'raw'>('grid');
  const [rows, setRows] = useState<ExcelGridRow[]>(() =>
    parseExcelDataToRows(value, defaultEmptyCountry)
  );
  const [notification, setNotification] = useState<GridNotification | null>(null);
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jumpPageInput, setJumpPageInput] = useState('1');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalChangeRef = useRef(false);

  const isEmerald = accentColor === 'emerald';

  // Synchronize when value changes externally (e.g. preset selection or reset)
  // Skip re-parsing when change was triggered internally to prevent UI lag on 200k items
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    const parsed = parseExcelDataToRows(value, defaultEmptyCountry);
    setRows(parsed);
    setPage(1);
  }, [value, defaultEmptyCountry]);

  const updateRowsAndNotify = (newRows: ExcelGridRow[]) => {
    isInternalChangeRef.current = true;
    setRows(newRows);
    const serialized = serializeRowsToText(newRows);
    onChange(serialized);
  };

  const handleCellChange = (originalIndex: number, field: keyof ExcelGridRow, val: string) => {
    if (originalIndex < 0 || originalIndex >= rows.length) return;
    const updated = [...rows];
    updated[originalIndex] = {
      ...updated[originalIndex],
      [field]: val
    };
    updateRowsAndNotify(updated);
  };

  const handleCountryBlur = (originalIndex: number) => {
    if (defaultEmptyCountry && !rows[originalIndex]?.country.trim()) {
      handleCellChange(originalIndex, 'country', defaultEmptyCountry);
    }
  };

  const handleAddRow = () => {
    const updated = [...rows, { name: '', country: defaultEmptyCountry || '' }];
    updateRowsAndNotify(updated);
    // Jump to the last page where the new row was added
    const newTotalPages = Math.ceil(updated.length / pageSize);
    setPage(newTotalPages);
  };

  const handleDeleteRow = (originalIndex: number) => {
    const updated = rows.filter((_, i) => i !== originalIndex);
    updateRowsAndNotify(updated);
  };

  const handleClear = () => {
    updateRowsAndNotify([]);
    setSearchFilter('');
    setPage(1);
    setNotification(null);
  };

  const handleProcessPastedText = async (pastedText: string) => {
    if (!pastedText.trim()) {
      setNotification({
        type: 'error',
        title: 'Empty Clipboard Content',
        message: 'The pasted text is empty. Please copy rows from Excel or Sheets.'
      });
      return;
    }

    setIsImporting(true);
    // Allow browser to render loading spinner before heavy parsing
    await new Promise(r => setTimeout(r, 10));

    try {
      const { rows: parsedRows, notification: notif } = parseAndValidateExcelPaste(
        pastedText,
        defaultEmptyCountry
      );
      if (parsedRows.length > 0) {
        updateRowsAndNotify(parsedRows);
        setPage(1);
      }
      setNotification(notif);

      if (notif?.type === 'success') {
        setTimeout(() => {
          setNotification(prev => (prev?.type === 'success' ? null : prev));
        }, 4000);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          await handleProcessPastedText(clipText);
          return;
        }
      }
      setNotification({
        type: 'info',
        title: 'Keyboard Shortcut',
        message: 'Please press Ctrl+V (or Cmd+V) to paste directly into the grid table.'
      });
      setTimeout(() => setNotification(prev => (prev?.type === 'info' ? null : prev)), 3500);
    } catch {
      setNotification({
        type: 'warning',
        title: 'Clipboard Permission Needed',
        message: 'Direct clipboard reading was blocked by browser security. Please use Ctrl+V (or Cmd+V) to paste.'
      });
      setTimeout(() => setNotification(prev => (prev?.type === 'warning' ? null : prev)), 4000);
    }
  };

  const handleContainerPaste = (e: React.ClipboardEvent) => {
    if (viewMode === 'raw') return;

    const text = e.clipboardData.getData('text');
    if (text && (text.includes('\t') || text.includes('\n') || text.includes('|') || text.includes(','))) {
      e.preventDefault();
      handleProcessPastedText(text);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsImporting(true);
    await new Promise(r => setTimeout(r, 10));

    try {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });

        const parsedLines: string[] = [];
        for (const row of jsonData) {
          if (Array.isArray(row) && row.length > 0) {
            const cells = row.map(c => String(c ?? '').trim());
            if (cells.some(Boolean)) {
              parsedLines.push(cells.slice(0, 2).join('\t'));
            }
          }
        }
        if (parsedLines.length > 0) {
          await handleProcessPastedText(parsedLines.join('\n'));
        }
      } else {
        const text = await file.text();
        await handleProcessPastedText(text);
      }
    } catch (err) {
      console.error('File import error:', err);
      setNotification({
        type: 'error',
        title: 'Import Failure',
        message: 'Unable to import file. Please check that the file format is a valid Excel spreadsheet (.xlsx, .xls) or CSV.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyGridAsTSV = async () => {
    if (rows.length === 0) return;
    const tsv = rows
      .map(r => `${r.name}\t${r.country}`)
      .join('\n');
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Filtered rows with preserved original index for instant in-memory search across 200,000 records
  const indexedFilteredRows = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) {
      return rows.map((row, index) => ({ originalIndex: index, row }));
    }
    const result: { originalIndex: number; row: ExcelGridRow }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.name.toLowerCase().includes(q) || (r.country && r.country.toLowerCase().includes(q))) {
        result.push({ originalIndex: i, row: r });
      }
    }
    return result;
  }, [rows, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(indexedFilteredRows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // Virtualized slice: ONLY render the current page in the DOM (e.g. 50 rows)
  // This eliminates DOM freezing and makes 200,000 rows completely lag-free!
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return indexedFilteredRows.slice(start, start + pageSize);
  }, [indexedFilteredRows, safePage, pageSize]);

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
    <div
      id={id}
      onPaste={handleContainerPaste}
      tabIndex={0}
      className={`flex flex-col bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs focus:outline-none focus:ring-1 ${
        isEmerald ? 'focus:ring-emerald-400' : 'focus:ring-blue-400'
      }`}
    >
      {/* Header bar */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 rounded-t-xl">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isEmerald ? 'text-emerald-600' : 'text-blue-600'}`} />
            <span className="font-bold text-slate-800 text-sm">{title}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                isEmerald
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {rows.length.toLocaleString()} {rows.length === 1 ? 'row' : 'rows'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
            id={`${id}-file-input`}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />

          {/* Paste from Excel Button */}
          <button
            type="button"
            id={`${id}-paste-btn`}
            disabled={isImporting}
            onClick={handlePasteFromClipboard}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg shadow-2xs transition-colors disabled:opacity-50 ${
              isEmerald
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
            title="Paste directly from Excel or Google Sheets (Company Name and Country)"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clipboard className="w-3.5 h-3.5" />}
            <span>Paste from Excel</span>
          </button>

          {/* Import file */}
          <button
            type="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-md border border-slate-200 transition-colors"
            title="Import Excel file (.xlsx, .xls) or CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Import</span>
          </button>

          {/* Copy as TSV */}
          <button
            type="button"
            onClick={handleCopyGridAsTSV}
            disabled={rows.length === 0 || isImporting}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 rounded-md border border-slate-200 transition-colors"
            title="Copy as Tab-Separated Values (Excel format)"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clipboard className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Spreadsheet columns view"
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                viewMode === 'raw'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Raw text / CSV view"
            >
              Text
            </button>
          </div>

          {/* Clear Grid */}
          <button
            type="button"
            onClick={handleClear}
            disabled={rows.length === 0 || isImporting}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 rounded-md border border-slate-200 transition-colors"
            title="Clear all rows"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Filter Bar (Active in Grid mode when records exist) */}
      {viewMode === 'grid' && rows.length > 0 && (
        <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setPage(1);
              }}
              placeholder={`Filter among ${rows.length.toLocaleString()} records...`}
              className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Pagination Stats */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              Showing {indexedFilteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, indexedFilteredRows.length).toLocaleString()} of{' '}
              {indexedFilteredRows.length.toLocaleString()}
            </span>
            {searchFilter && (
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                filtered
              </span>
            )}
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {notification && (
        <div
          className={`px-4 py-2.5 border-b text-xs flex items-start justify-between gap-3 transition-all ${
            notification.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-900'
              : notification.type === 'warning'
              ? 'bg-amber-50/95 border-amber-200 text-amber-900'
              : notification.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
              : 'bg-blue-50/95 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-start gap-2.5 flex-1">
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : notification.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold">{notification.title}</p>
              <p className="text-slate-600 leading-relaxed">{notification.message}</p>
              {notification.details && notification.details.length > 0 && (
                <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px] opacity-90 pl-1 font-mono">
                  {notification.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 rounded-md hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Loading Overlay when importing large files (e.g. 200k records) */}
      {isImporting && (
        <div className="p-6 text-center bg-slate-50/90 border-b border-slate-100 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-700">Importing and indexing records into grid...</p>
          <p className="text-[11px] text-slate-400">Please wait while the dataset is prepared for fast zero-lag matching.</p>
        </div>
      )}

      {/* Content Area: Grid Mode vs Raw Text Mode */}
      {viewMode === 'grid' ? (
        <div className="flex flex-col">
          {/* Spreadsheet Table Container */}
          <div className="max-h-80 overflow-y-auto overflow-x-auto border-b border-slate-100 divide-y divide-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 sticky top-0 z-10 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-mono">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">
                    <div className="flex items-center gap-1">
                      <span>Company Name</span>
                      <span className="text-[10px] text-red-500">*</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 min-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Country</span>
                      {defaultEmptyCountry ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200/80 text-slate-600 rounded font-normal">
                          auto: {defaultEmptyCountry}
                        </span>
                      ) : null}
                    </div>
                  </th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {indexedFilteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">
                        {searchFilter ? 'No matching records found' : 'Table is empty'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        {searchFilter ? (
                          <>
                            No company matches &quot;{searchFilter}&quot;.{' '}
                            <button
                              type="button"
                              onClick={() => setSearchFilter('')}
                              className="text-blue-600 underline"
                            >
                              Clear filter
                            </button>
                          </>
                        ) : (
                          emptyMessage || (
                            <>
                              Copy columns (Company Name, Country) from Excel or Sheets and press{' '}
                              <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">
                                Ctrl+V
                              </kbd>
                              , or click &quot;Paste from Excel&quot;.
                            </>
                          )
                        )}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map(({ originalIndex, row }) => (
                    <tr
                      key={originalIndex}
                      className={`transition-colors group ${
                        isEmerald ? 'hover:bg-emerald-50/30' : 'hover:bg-blue-50/30'
                      }`}
                    >
                      {/* Row index */}
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {originalIndex + 1}
                      </td>

                      {/* Column 1: Company Name */}
                      <td className="py-1 px-3">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleCellChange(originalIndex, 'name', e.target.value)}
                          placeholder="e.g. Apple Inc."
                          className={`w-full px-2.5 py-1.5 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 rounded-md text-slate-800 text-xs font-medium focus:outline-none transition-all ${
                            isEmerald ? 'focus:border-emerald-500' : 'focus:border-blue-500'
                          }`}
                        />
                      </td>

                      {/* Column 2: Country */}
                      <td className="py-1 px-3">
                        <input
                          type="text"
                          value={row.country}
                          onChange={(e) => handleCellChange(originalIndex, 'country', e.target.value)}
                          onBlur={() => handleCountryBlur(originalIndex)}
                          placeholder={defaultEmptyCountry ? defaultEmptyCountry : 'e.g. United States'}
                          className={`w-full px-2.5 py-1.5 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 rounded-md text-xs focus:outline-none transition-all ${
                            isEmerald ? 'focus:border-emerald-500' : 'focus:border-blue-500'
                          } ${row.country === 'N/A' ? 'text-slate-400 font-mono italic' : 'text-slate-800'}`}
                        />
                      </td>

                      {/* Row delete button */}
                      <td className="py-1 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(originalIndex)}
                          className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Grid Footer Controls: Add Row + High-Performance Pagination */}
          <div className="p-2.5 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs transition-colors"
              >
                <Plus className={`w-3.5 h-3.5 ${isEmerald ? 'text-emerald-600' : 'text-blue-600'}`} />
                <span>Add Row</span>
              </button>

              {/* Rows per page selector */}
              {indexedFilteredRows.length > 25 && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 text-xs">
                {/* First page */}
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={safePage <= 1}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 rounded hover:bg-slate-100"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                {/* Prev page */}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 rounded hover:bg-slate-100"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Page Jump Input */}
                <form onSubmit={handleJumpPage} className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500">Page</span>
                  <input
                    type="text"
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    onBlur={() => setJumpPageInput(String(safePage))}
                    className="w-12 text-center py-0.5 px-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                  <span className="text-[11px] text-slate-500">of {totalPages.toLocaleString()}</span>
                </form>

                {/* Next page */}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 rounded hover:bg-slate-100"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last page */}
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-slate-200 rounded hover:bg-slate-100"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Raw Text View Mode */
        <div className="p-3">
          <textarea
            id={`${id}-raw-textarea`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              defaultEmptyCountry
                ? 'Apple Inc. | United States\nTesla Inc. | N/A\nGoogle LLC | United States\nNetflix Inc. | N/A'
                : 'Apple | United States\nNetflix | United States\nGoogle | United States\nMeralco | Philippines'
            }
            rows={8}
            className={`w-full p-3 font-mono text-xs text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all resize-y ${
              isEmerald ? 'focus:ring-emerald-500' : 'focus:ring-blue-500'
            }`}
            spellCheck={false}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Delimiters supported: Tabs (\t from Excel), Pipe (|), or Comma (,)</span>
            <span>Switch to &quot;Grid&quot; view to edit cells</span>
          </div>
        </div>
      )}
    </div>
  );
};
