import * as XLSX from 'xlsx';
import { ProcessedRow } from '../types';

/**
 * Formats row data into spreadsheet schema:
 * QUERY (TABLE 1) | TARGET MASTER (TABLE 2) | SIMILARITY SCORE | QUERY COUNTRY | TARGET COUNTRY | STATUS | NOTES
 */
export function formatDataForExport(rows: ProcessedRow[]) {
  return rows.map(row => {
    const confidence = row.confidenceScore ?? row.matchPercent ?? 0;
    const nameScore = row.nameScore ?? confidence;
    return {
      'Query (Table 1)': row.query,
      'Target Master (Table 2)': row.bestMatch,
      'Confidence Score': `${confidence}%`,
      'Name Match': `${nameScore}%`,
      'Query Country': row.queryCountry || 'N/A',
      'Target Country': row.targetCountry || 'N/A',
      'Status': row.comparisonLabel || row.comparisonStatus,
      'Notes': row.comparisonDetails.comparisonNote || (row.comparisonStatus === 'Match' ? 'Valid match' : (row.mismatchReason || 'Mismatch detected'))
    };
  });
}

/**
 * Exports processed results to an Excel (.xlsx) file
 */
export function exportResultsToExcel(rows: ProcessedRow[], filename = 'Fuzzy_Lookup_by_Christian.xlsx') {
  if (rows.length === 0) {
    throw new Error('No data available to export. Please run a lookup first.');
  }

  const exportData = formatDataForExport(rows);
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Auto-fit column widths
  const colWidths = [
    { wch: 28 }, // Query (Table 1)
    { wch: 32 }, // Target Master (Table 2)
    { wch: 18 }, // Confidence Score
    { wch: 16 }, // Name Match
    { wch: 20 }, // Query Country
    { wch: 20 }, // Target Country
    { wch: 24 }, // Status
    { wch: 36 }  // Notes
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fuzzy Lookup Results');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports processed results to a CSV (.csv) file
 */
export function exportResultsToCSV(rows: ProcessedRow[], filename = 'Fuzzy_Lookup_by_Christian.csv') {
  if (rows.length === 0) {
    throw new Error('No data available to export. Please run a lookup first.');
  }

  const exportData = formatDataForExport(rows);
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies processed results to clipboard as Tab-Separated Values (TSV)
 */
export async function copyResultsToClipboard(rows: ProcessedRow[]): Promise<boolean> {
  if (rows.length === 0) return false;

  const headers = [
    'QUERY (TABLE 1)',
    'TARGET MASTER (TABLE 2)',
    'CONFIDENCE SCORE',
    'NAME MATCH',
    'QUERY COUNTRY',
    'TARGET COUNTRY',
    'STATUS',
    'NOTES'
  ];
  const lines = [headers.join('\t')];

  for (const r of rows) {
    const confidence = r.confidenceScore ?? r.matchPercent ?? 0;
    const nameScore = r.nameScore ?? confidence;
    lines.push([
      r.query,
      r.bestMatch,
      `${confidence}%`,
      `${nameScore}%`,
      r.queryCountry || 'N/A',
      r.targetCountry || 'N/A',
      r.comparisonLabel || r.comparisonStatus,
      r.comparisonDetails.comparisonNote || (r.comparisonStatus === 'Match' ? 'Valid match' : (r.mismatchReason || 'Mismatch detected'))
    ].join('\t'));
  }

  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}
