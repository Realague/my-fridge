import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_CSV = path.join(__dirname, 'manquants_full.csv');
const BACKEND_TS = path.resolve(__dirname, '..', 'i18n', 'itemTranslations.ts');
const FRONTEND_DIR = path.resolve(__dirname, '..', '..', '..', 'frontend', 'src', 'i18n', 'locales');

function parseArgs(): { csvPath: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  };
  const has = (flag: string): boolean => args.includes(flag);
  return {
    csvPath: path.resolve(get('--csv') || DEFAULT_CSV),
    dryRun: has('--dry-run'),
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += c;
  }
  result.push(current.trim());
  return result;
}

interface CsvRow {
  nameKey: string;
  fr: string;
  en: string;
  es: string;
}

function readCSV(csvPath: string): CsvRow[] {
  const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
  const rows: CsvRow[] = [];
  for (const line of lines) {
    if (!line) continue;
    const parts = parseCSVLine(line);
    if (parts.length < 6 || parts[0] === 'nameKey' || !parts[0]) continue;
    const [nameKey, frenchName, , , englishName, spanishName] = parts;
    if (!nameKey?.trim()) continue;
    rows.push({
      nameKey: nameKey.trim(),
      fr: (frenchName || '').trim(),
      en: (englishName || '').trim(),
      es: (spanishName || '').trim(),
    });
  }
  return rows;
}

function escapeJsonValue(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function updateBackendTs(rows: CsvRow[], dryRun: boolean): { added: { en: number; es: number; fr: number } } {
  const original = fs.readFileSync(BACKEND_TS, 'utf-8');
  const lines = original.split('\n');

  const sectionRanges: Record<'en' | 'es' | 'fr', { start: number; end: number }> = {
    en: { start: -1, end: -1 },
    es: { start: -1, end: -1 },
    fr: { start: -1, end: -1 },
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^\s*"en":\s*\{/.test(line)) sectionRanges.en.start = i;
    else if (/^\s*"es":\s*\{/.test(line)) {
      sectionRanges.es.start = i;
      sectionRanges.en.end = i - 1;
    } else if (/^\s*"fr":\s*\{/.test(line)) {
      sectionRanges.fr.start = i;
      sectionRanges.es.end = i - 1;
    }
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*\}\s*;\s*$/.test(lines[i] ?? '')) {
      sectionRanges.fr.end = i - 1;
      break;
    }
  }

  function existingKeys(start: number, end: number): Set<string> {
    const keys = new Set<string>();
    for (let i = start + 1; i <= end; i++) {
      const m = (lines[i] ?? '').match(/^\s*"([^"]+)":\s*"/);
      if (m && m[1]) keys.add(m[1]);
    }
    return keys;
  }

  const added = { en: 0, es: 0, fr: 0 };
  const insertions: Array<{ atLine: number; lines: string[] }> = [];

  for (const lang of ['en', 'es', 'fr'] as const) {
    const range = sectionRanges[lang];
    if (range.start < 0 || range.end < 0) {
      throw new Error(`Could not locate section "${lang}" in ${BACKEND_TS}`);
    }
    const existing = existingKeys(range.start, range.end);

    let lastEntryIdx = -1;
    for (let i = range.end; i > range.start; i--) {
      if (/^\s*"[^"]+":\s*".*"\s*,?\s*$/.test(lines[i] ?? '')) {
        lastEntryIdx = i;
        break;
      }
    }
    if (lastEntryIdx < 0) throw new Error(`No entries found in ${lang} section`);

    const newRows = rows.filter((r) => r[lang] && !existing.has(r.nameKey));
    if (newRows.length === 0) continue;

    const newLines = newRows.map((r) => `    "${r.nameKey}": "${escapeJsonValue(r[lang])}",`);
    insertions.push({ atLine: lastEntryIdx, lines: newLines });
    added[lang] = newRows.length;
  }

  insertions.sort((a, b) => b.atLine - a.atLine);
  const updatedLines = [...lines];
  for (const ins of insertions) {
    const target = updatedLines[ins.atLine] ?? '';
    if (!target.trim().endsWith(',')) {
      updatedLines[ins.atLine] = target.replace(/(\s*)$/, ',$1');
    }
    updatedLines.splice(ins.atLine + 1, 0, ...ins.lines);
  }

  if (added.en + added.es + added.fr > 0) {
    const newContent = updatedLines.join('\n');
    const countMatch = newContent.match(/Contains (\d+) items/);
    let finalContent = newContent;
    if (countMatch && countMatch[1]) {
      const newCount = parseInt(countMatch[1], 10) + Math.max(added.en, added.es, added.fr);
      finalContent = newContent.replace(/Contains \d+ items/, `Contains ${newCount} items`);
    }
    if (!dryRun) fs.writeFileSync(BACKEND_TS, finalContent, 'utf-8');
  }

  return { added };
}

function updateFrontendJson(lang: 'en' | 'fr' | 'es', rows: CsvRow[], dryRun: boolean): number {
  const filePath = path.join(FRONTEND_DIR, `${lang}.json`);
  const original = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(original);
  if (!data.items || typeof data.items !== 'object') {
    throw new Error(`No "items" object in ${filePath}`);
  }
  let added = 0;
  for (const r of rows) {
    if (!r[lang]) continue;
    if (data.items[r.nameKey] !== undefined) continue;
    data.items[r.nameKey] = r[lang];
    added++;
  }
  if (added > 0 && !dryRun) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }
  return added;
}

function main() {
  const opts = parseArgs();
  console.log(`CSV: ${opts.csvPath}`);
  console.log(`Backend TS: ${BACKEND_TS}`);
  console.log(`Frontend JSON dir: ${FRONTEND_DIR}`);
  console.log(`Dry-run: ${opts.dryRun}\n`);

  if (!fs.existsSync(opts.csvPath)) {
    console.error(`CSV not found: ${opts.csvPath}`);
    process.exit(1);
  }

  const rows = readCSV(opts.csvPath);
  console.log(`Parsed ${rows.length} CSV rows.\n`);

  const { added: tsAdded } = updateBackendTs(rows, opts.dryRun);
  console.log(`Backend itemTranslations.ts: +${tsAdded.en} en, +${tsAdded.es} es, +${tsAdded.fr} fr`);

  const enAdded = updateFrontendJson('en', rows, opts.dryRun);
  const frAdded = updateFrontendJson('fr', rows, opts.dryRun);
  const esAdded = updateFrontendJson('es', rows, opts.dryRun);
  console.log(`Frontend en.json: +${enAdded}`);
  console.log(`Frontend fr.json: +${frAdded}`);
  console.log(`Frontend es.json: +${esAdded}`);

  if (opts.dryRun) console.log('\n[dry-run] No files written.');
  else console.log('\nFiles updated.');
}

main();
