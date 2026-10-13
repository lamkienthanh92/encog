// ENCOG – minimal RFC 4180 CSV reader/writer (quotes, CRLF, BOM; comma, semicolon or tab).
import type { ParsedCsv } from '../types';

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
}

export function parseCSV(input: string): ParsedCsv {
  const text = input.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const table: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      table.push(row); row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); table.push(row); }
  const lines = table.filter((r) => r.some((c) => c.trim() !== ''));
  if (!lines.length) return { headers: [], rows: [], delimiter };
  const headers = lines[0].map((h) => h.trim());
  const rows = lines.slice(1).map((r, idx) => {
    const values: Record<string, string> = {};
    headers.forEach((h, j) => { values[h] = (r[j] ?? '').trim(); });
    return { line: idx + 2, values };
  });
  return { headers, rows, delimiter };
}

function quote(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(headers: readonly string[], rows: readonly Record<string, unknown>[]): string {
  const lines = [headers.map(quote).join(',')];
  for (const r of rows) lines.push(headers.map((h) => quote(r[h])).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
