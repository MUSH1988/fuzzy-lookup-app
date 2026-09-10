import * as XLSX from 'xlsx';
import { ProcessedRow } from '../types';

/**
 * Formats row data into standardized spreadsheet schema
 */
export function formatDataForExport(rows: ProcessedRow[]) {
  return rows.map(row => ({
    'Query (Table 2)': row.query,
    'Best Match (Table 1)': row.bestMatch,
    'Similarity Score': `${row.matchPercent}%`,
    'LinkedIn Verification': row.verification,
    'Company Size': row.companySize,
    'Industry': row.industry,
    'Headquarters': row.headquarters || 'N/A',
    'LinkedIn URL': row.linkedinUrl || 'N/A'
  }));
}

/**
 * Exports processed results to an Excel (.xlsx) file
 */
export function exportResultsToExcel(rows: ProcessedRow[], filename = 'Fuzzy_Lookup_LinkedIn_Data.xlsx') {
  if (rows.length === 0) {
    throw new Error('No data available to export. Please run a lookup first.');
  }

  const exportData = formatDataForExport(rows);
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Auto-fit column widths
  const colWidths = [
    { wch: 25 }, // Query
    { wch: 30 }, // Best Match
    { wch: 18 }, // Similarity Score
    { wch: 24 }, // LinkedIn Verification
    { wch: 22 }, // Company Size
    { wch: 32 }, // Industry
    { wch: 30 }, // Headquarters
    { wch: 45 }  // LinkedIn URL
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fuzzy Lookup Results');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports processed results to a CSV (.csv) file
 */
export function exportResultsToCSV(rows: ProcessedRow[], filename = 'Fuzzy_Lookup_LinkedIn_Data.csv') {
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

  const headers = ['Query (Table 2)', 'Best Match (Table 1)', 'Similarity Score', 'LinkedIn Verification', 'Company Size', 'Industry'];
  const lines = [headers.join('\t')];

  for (const r of rows) {
    lines.push([
      r.query,
      r.bestMatch,
      `${r.matchPercent}%`,
      r.verification,
      r.companySize,
      r.industry
    ].join('\t'));
  }

  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}
