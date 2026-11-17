// The family's spreadsheet of every Filipino and Ilokano text in the game.
//
//   npm run lang:sheet         writes language-review.xlsx (English is shown for reference)
//   npm run lang:sheet:import  reads the family's corrections back into content/lang
//
// The family types in two columns only: "Filipino correction" and "Ilokano".
// Nothing is machine-translated. Text they type is copied exactly as written.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const root = fileURLToPath(new URL('../', import.meta.url));
const FILE = join(root, 'language-review.xlsx');
const langPath = (code) => join(root, 'content', 'lang', `${code}.json`);
const read = (code) => JSON.parse(readFileSync(langPath(code), 'utf8'));

const GROUPS = [
  ['item.', 'Words and questions the child hears'],
  ['instr.', 'Instructions Butil says'],
  ['fb.', 'Praise and "try again"'],
  ['sort.', 'Basket names'],
  ['bye.', 'Goodbye screen'],
  ['gn.', 'Gawin natin cards (read by the adult)'],
  ['theme.', 'Names of themes'],
  ['place.', 'Names of places'],
  ['level.', 'Names of levels'],
  ['stage.', 'Parent Corner'],
  ['engine.', 'Parent Corner'],
  ['comp.', 'Parent Corner'],
  ['area.', 'Parent Corner'],
  ['mastery.', 'Parent Corner'],
  ['sources.', 'Parent Corner'],
  ['parent.', 'Parent Corner'],
  ['gate.', 'Parent gate'],
  ['lang.', 'Parent Corner'],
  ['ui.', 'Buttons and screen labels'],
  ['app.', 'Buttons and screen labels'],
];
const groupOf = (key) => (GROUPS.find(([prefix]) => key.startsWith(prefix)) ?? ['', 'Other'])[1];
const spoken = (key) => /^(item\.|instr\.|fb\.|sort\.)/.test(key) || key === 'bye.session' || key === 'bye.daily';

async function exportSheet() {
  const fil = read('fil');
  const en = read('en');
  const ilo = read('ilo');
  const book = new ExcelJS.Workbook();
  book.creator = 'Laro at Aral';

  const help = book.addWorksheet('How to use');
  help.columns = [{ width: 110 }];
  for (const line of [
    'Laro at Aral: words for the family to check',
    '',
    'Each row is one text in the game. English is there only to show the meaning.',
    '1. Read the Filipino column. If it is wrong or sounds unnatural for a small child, type the better Filipino in "Filipino correction".',
    '2. If you speak Ilokano, type the Ilokano in the "Ilokano" column. Leave it empty if unsure: an empty row stays empty in the game.',
    '3. Do not change the "key" column. It is how the game finds the text.',
    '4. "Spoken?" = yes means a voice will say it, so a short and natural sentence matters most there.',
    '5. Save the file with the same name (Excel format, .xlsx) and send it back.',
    '',
    'Words like {name} or {min} are filled in by the game. Keep them exactly as they are.',
  ]) help.addRow([line]);
  help.getRow(1).font = { bold: true, size: 14 };

  const sheet = book.addWorksheet('Words', { views: [{ state: 'frozen', ySplit: 1, xSplit: 1 }] });
  sheet.columns = [
    { header: 'key', key: 'key', width: 30 },
    { header: 'Where it appears', key: 'group', width: 30 },
    { header: 'Spoken?', key: 'spoken', width: 9 },
    { header: 'English (meaning)', key: 'en', width: 40 },
    { header: 'Filipino now', key: 'fil', width: 42 },
    { header: 'Filipino correction', key: 'filFix', width: 42 },
    { header: 'Ilokano', key: 'ilo', width: 42 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  const keys = Object.keys(fil).sort((a, b) =>
    GROUPS.findIndex(([p]) => a.startsWith(p)) - GROUPS.findIndex(([p]) => b.startsWith(p)) || 0);
  for (const key of keys) {
    sheet.addRow({ key, group: groupOf(key), spoken: spoken(key) ? 'yes' : '', en: en[key] ?? '', fil: fil[key], filFix: '', ilo: ilo[key] ?? '', notes: '' });
  }
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2B63C' } };
  for (const col of ['F', 'G', 'H']) {
    sheet.getColumn(col).eachCell((cell, row) => {
      if (row > 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
    });
  }
  sheet.eachRow((row) => { row.alignment = { wrapText: true, vertical: 'top' }; });
  sheet.autoFilter = { from: 'A1', to: 'H1' };
  await book.xlsx.writeFile(FILE);
  const iloFilled = Object.values(ilo).filter((v) => v.trim()).length;
  console.log(`language-review.xlsx: ${keys.length} texts (${keys.filter(spoken).length} spoken). Ilokano filled: ${iloFilled}.`);
}

async function importSheet() {
  if (!existsSync(FILE)) throw new Error('language-review.xlsx is not in the project folder.');
  const fil = read('fil');
  const ilo = read('ilo');
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(FILE);
  const sheet = book.getWorksheet('Words');
  if (!sheet) throw new Error('The "Words" sheet is missing.');
  const head = sheet.getRow(1).values.map((v) => String(v ?? '').trim());
  const col = (name) => head.indexOf(name);
  for (const name of ['key', 'Filipino correction', 'Ilokano']) if (col(name) < 0) throw new Error(`Column "${name}" is missing.`);
  const text = (cell) => {
    const v = cell?.value;
    if (v == null) return '';
    if (typeof v === 'object' && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
    if (typeof v === 'object' && 'text' in v) return String(v.text).trim();
    return String(v).trim();
  };
  const changedFil = [];
  const changedIlo = [];
  const problems = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const key = text(row.getCell(col('key')));
    if (!key) return;
    if (!(key in fil)) { problems.push(`row ${n}: unknown key "${key}"`); return; }
    const vars = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    const fix = text(row.getCell(col('Filipino correction')));
    if (fix && fix !== fil[key]) {
      if (vars(fix) !== vars(fil[key])) problems.push(`row ${n} (${key}): keep ${vars(fil[key]) || 'no {words}'} exactly as they are`);
      else { fil[key] = fix; changedFil.push(key); }
    }
    const iloText = text(row.getCell(col('Ilokano')));
    if (iloText !== (ilo[key] ?? '')) {
      if (iloText && vars(iloText) !== vars(fil[key])) problems.push(`row ${n} (${key}): Ilokano must keep ${vars(fil[key])}`);
      else { ilo[key] = iloText; changedIlo.push(key); }
    }
  });
  writeFileSync(langPath('fil'), JSON.stringify(fil, null, 2) + '\n');
  writeFileSync(langPath('ilo'), JSON.stringify(ilo, null, 2) + '\n');
  console.log(`Filipino corrections applied: ${changedFil.length}`);
  for (const k of changedFil) console.log(`  ${k}: ${fil[k]}`);
  console.log(`Ilokano texts changed: ${changedIlo.length}`);
  if (problems.length) console.log(`\nNot applied, please check:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  if (changedFil.length) console.log('\nNext: npm run narration:csv, then npm run narration (only the changed lines are spoken again).');
}

(process.argv.includes('--import') ? importSheet() : exportSheet()).catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
