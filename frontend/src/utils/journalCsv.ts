// CSV serialization + download for the Journal des sorties export. Kept pure and
// i18n-agnostic: the caller passes already-localized headers and cell values.

// UTF-8 byte-order mark so Excel reads accented characters correctly.
const BOM = String.fromCharCode(0xfeff);

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV string (prefixed with a UTF-8 BOM). */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return BOM + lines.join('\r\n');
}

/** Trigger a client-side download of the given CSV content. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
