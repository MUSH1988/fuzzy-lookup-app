import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Trash2, Clipboard, FileText, Check } from 'lucide-react';

interface TableInputBoxProps {
  id: string;
  textareaId: string;
  title: string;
  subtitle: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  badgeLabel: string;
  badgeColor?: string;
  hintText?: string;
}

export const TableInputBox: React.FC<TableInputBoxProps> = ({
  id,
  textareaId,
  title,
  subtitle,
  placeholder,
  value,
  onChange,
  badgeLabel,
  badgeColor = 'bg-slate-100 text-slate-700',
  hintText
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute non-empty items
  const items = value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const handleFileUpload = async (file: File) => {
    try {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        // Convert to array of rows
        const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });
        const extractedLines: string[] = [];

        for (const row of jsonData) {
          if (Array.isArray(row) && row.length > 0) {
            const firstCell = String(row[0] || '').trim();
            if (
              firstCell &&
              firstCell.toLowerCase() !== 'company' &&
              firstCell.toLowerCase() !== 'name' &&
              firstCell.toLowerCase() !== 'query'
            ) {
              // If multiple columns, preserve them with pipe delimiter
              const validCells = row
                .map(c => String(c ?? '').trim())
                .filter(Boolean);
              extractedLines.push(validCells.join(' | '));
            }
          }
        }
        if (extractedLines.length > 0) {
          onChange(extractedLines.join('\n'));
        }
      } else {
        // Plain text or CSV
        const text = await file.text();
        const lines = text
          .split(/\r?\n/)
          .map(l => {
            const clean = l.trim();
            return clean;
          })
          .filter(Boolean);
        onChange(lines.join('\n'));
      }
    } catch (err) {
      console.error('File read error:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCopy = async () => {
    if (!value) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      id={id}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col bg-white rounded-xl border transition-all duration-150 shadow-xs ${
        isDragging
          ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Header bar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">{title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
              {items.length} {items.length === 1 ? 'row' : 'rows'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />

          <button
            type="button"
            onClick={async () => {
              try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                  const clip = await navigator.clipboard.readText();
                  if (clip.trim()) {
                    onChange(clip.trim());
                  }
                }
              } catch (e) {
                console.warn('Clipboard read error', e);
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
            title="Paste column from Excel or clipboard"
          >
            <Clipboard className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Paste Excel</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
            title="Import from TXT, CSV, or Excel (.xlsx)"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 rounded-md border border-slate-200 transition-colors"
            title="Copy list to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clipboard className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={() => onChange('')}
            disabled={!value}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 rounded-md border border-slate-200 transition-colors"
            title="Clear list"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div className="p-3 relative">
        <textarea
          id={textareaId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={7}
          className="w-full p-3 font-mono text-xs sm:text-sm text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-y"
          spellCheck={false}
        />
        {value === '' && (
          <div className="absolute inset-x-6 top-10 pointer-events-none text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Or drag &amp; drop a .csv, .xlsx, or .txt file here
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pb-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>{hintText || 'One entry per line'}</span>
        <span>{badgeLabel}</span>
      </div>
    </div>
  );
};
