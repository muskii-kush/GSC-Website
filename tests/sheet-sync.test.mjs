import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../docs/apps-script/gsc_sheet_sync.gs', import.meta.url), 'utf8');
const bookId = '1YkL9tQyJrpG4sUsNDl7XVIQag9VvEGCowMY0MMnhT5c';
const secret = 'private-test-key';
const headings = ['Application ID', 'Submitted at', 'Email', 'Company', 'CIN / LLPIN', 'Pitch deck URL', ...Array.from({ length: 78 }, (_, i) => `entry.${i} | Question ${i}`), 'Additional answers (JSON)'];
const id = i => `11111111-1111-4111-8111-${String(i).padStart(12, '0')}`;
const fixture = (count = 334) => [headings.slice(), ...Array.from({ length: count }, (_, i) => {
  const row = headings.map(() => '');
  [id(i + 1), '2026-11-11T08:29:07.919Z', 'fixture@example.test', 'Test company', 'TEST-CIN', 'https://example.test/deck'].forEach((value, j) => { row[j] = value; });
  row[6] = '=HYPERLINK("https://example.test", "Literal answer")';
  row[7] = 'A comma, a "quote", and\na new line';
  return row;
})];
const clone = value => JSON.parse(JSON.stringify(value));

// Only Apps Script services are simulated; run the unmodified installable script.
function harness(options = {}) {
  const incoming = clone(options.rows || fixture());
  const events = [], writes = [], batches = [], fetches = [];
  const props = new Map(options.unconfigured ? [] : [['GSC_SHEET_KEY', secret]]);
  let stageWrites = 0, releases = 0;
  class Sheet {
    constructor(name, sheetId, data = [], formula = '') {
      Object.assign(this, { name, sheetId, data: clone(data), formula, note: '', maxRows: 998, maxColumns: 90, hidden: false });
    }
    getSheetId() { return this.sheetId; }
    getName() { return this.name; }
    getMaxRows() { return this.maxRows; }
    getMaxColumns() { return this.maxColumns; }
    insertRowsAfter(_, count) { this.maxRows += count; }
    insertColumnsAfter(_, count) { this.maxColumns += count; }
    hideSheet() { this.hidden = true; }
    getLastRow() { return this.data.reduce((last, row, i) => row.some(value => value !== '') ? i + 1 : last, this.formula ? 1 : 0); }
    getLastColumn() { return Math.max(1, ...this.data.map(row => row.reduce((last, value, i) => value !== '' ? i + 1 : last, 0))); }
    getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), this.getLastColumn()); }
    getRange(row, col = 1, height = 1, width = 1) {
      if (row === 'A1') row = 1;
      const sheet = this;
      const range = {
        getFormula: () => row === 1 && col === 1 ? sheet.formula : '',
        getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => sheet.data[row - 1 + i]?.[col - 1 + j] ?? '')),
        getValue: () => sheet.data[row - 1]?.[col - 1] ?? '',
        setNumberFormat: value => { assert.equal(value, '@'); return range; },
        setValues: values => {
          assert.equal(values.length, height); assert.ok(values.every(value => value.length === width));
          if (sheet.sheetId !== 0 && ++stageWrites === options.failStageWrite) throw new Error(`Private provider error: ${secret}`);
          writes.push({ sheetId: sheet.sheetId, row, height });
          values.forEach((valuesRow, i) => valuesRow.forEach((value, j) => {
            sheet.data[row - 1 + i] ||= []; sheet.data[row - 1 + i][col - 1 + j] = value;
          }));
          options.onStageWrite?.(target);
          return range;
        },
        clearContent: () => {
          for (let i = row - 1; i < row - 1 + height; i++) for (let j = col - 1; j < col - 1 + width; j++) if (sheet.data[i]) sheet.data[i][j] = '';
          return range;
        },
      };
      return range;
    }
  }
  const initialFormula = `=IMPORTDATA("https://gsc.cars24.com/api/admin/export?key=${secret}&v=1791538687568")`;
  const target = new Sheet('Sheet1', 0, options.existing || [['#N/A']], options.existing ? '' : initialFormula);
  const sheets = [target];
  const book = {
    getId: () => bookId,
    getSheetByName: name => sheets.find(sheet => sheet.name === name),
    getSheets: () => sheets,
    insertSheet: name => { const sheet = new Sheet(name, 7); sheets.push(sheet); return sheet; },
  };
  const triggers = [{ getHandlerFunction: () => 'unrelatedMailer' }];
  const services = {
    console: { log: message => events.push(JSON.parse(message)), error: message => events.push(JSON.parse(message)) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => props.get(key) ?? null, setProperty: (key, value) => props.set(key, value) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !options.busy, releaseLock: () => releases++ }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => book, openById: value => { assert.equal(value, bookId); return book; }, flush: () => {} },
    Utilities: { parseCsv: value => { assert.equal(value, 'fixture-csv'); if (options.parseError) throw new Error(`Parser failed ${secret}`); return clone(incoming); } },
    UrlFetchApp: { fetch: (url, init) => {
      fetches.push({ url, init });
      if (options.fetchError) throw new Error(`Fetch failed for ${url}, fixture@example.test`);
      return {
        getResponseCode: () => options.status || 200,
        getAllHeaders: () => ({ 'Content-Type': options.contentType || 'text/csv; charset=utf-8', 'X-GSC-Request-ID': '11111111-1111-4111-8111-111111111111' }),
        getContentText: () => 'fixture-csv',
      };
    } },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      newTrigger: handler => ({ timeBased: () => ({ everyMinutes: minutes => {
        assert.equal(minutes, 15); return { create: () => { const trigger = { getHandlerFunction: () => handler }; triggers.push(trigger); return trigger; } };
      } }) }),
      deleteTrigger: trigger => triggers.splice(triggers.indexOf(trigger), 1),
    },
    Sheets: { Spreadsheets: { batchUpdate: (body, spreadsheetId) => {
      assert.equal(spreadsheetId, bookId); batches.push(clone(body));
      if (options.failCommit) throw new Error(`Commit failed ${secret}`);
      for (const request of body.requests) {
        if (request.updateSheetProperties) {
          const grid = request.updateSheetProperties.properties.gridProperties;
          target.maxRows = grid.rowCount; target.maxColumns = grid.columnCount;
        } else if (request.repeatCell) {
          const range = request.repeatCell.range;
          target.getRange(1, 1, range.endRowIndex, range.endColumnIndex).clearContent(); target.formula = '';
        } else if (request.copyPaste) {
          const { source } = request.copyPaste;
          const staging = sheets.find(sheet => sheet.sheetId === source.sheetId);
          const values = staging.getRange(1, 1, source.endRowIndex, source.endColumnIndex).getValues();
          values.forEach((row, i) => row.forEach((value, j) => { target.data[i] ||= []; target.data[i][j] = value; }));
        } else if (request.updateCells) target.note = request.updateCells.rows[0].values[0].note;
      }
    } } },
  };
  if (options.noSheetsService) delete services.Sheets;
  const context = vm.createContext(services);
  vm.runInContext(source, context, { filename: 'gsc_sheet_sync.gs' });
  return { context, target, sheets, incoming, events, writes, batches, fetches, props, triggers, releases: () => releases };
}

test('334 applications stage in batches, publish atomically, preserve the tab and escape formulas', () => {
  const h = harness();
  const result = h.context.syncGscApplications();
  assert.equal(result.applications, 334); assert.equal(result.columns, 85);
  assert.deepEqual(h.writes.map(write => write.height), [100, 100, 100, 35]);
  assert.ok(h.writes.every(write => write.sheetId !== 0));
  assert.equal(h.batches.length, 1); assert.equal(h.batches[0].requests.length, 4);
  assert.equal(h.target.formula, ''); assert.equal(h.target.data[0][0], 'Application ID');
  assert.equal(h.target.data[334][0], id(334)); assert.match(h.target.data[1][6], /^'=HYPERLINK/);
  assert.equal(h.target.data[1][7], 'A comma, a "quote", and\na new line');
  assert.equal(h.target.getSheetId(), 0); assert.equal(h.target.maxRows, 998); assert.equal(h.target.maxColumns, 90);
  assert.match(h.target.note, /Applications: 334/); assert.equal(h.sheets[1].hidden, true);
  assert.equal(h.fetches[0].init.followRedirects, false); assert.equal(h.releases(), 1);
  assert.doesNotMatch(JSON.stringify(h.events), /private-test-key|fixture@example\.test|Test company|https?:/);
});

test('HTTP blocks and provider exceptions preserve Sheet1 and omit private details', () => {
  for (const options of [{ status: 403 }, { fetchError: true }, { contentType: 'text/html' }, { parseError: true }]) {
    const h = harness(options); const before = JSON.stringify(h.target);
    assert.throws(() => h.context.syncGscApplications(), /GSC Sheet sync failed/);
    assert.equal(JSON.stringify(h.target), before); assert.equal(h.batches.length, 0); assert.equal(h.writes.length, 0);
    assert.doesNotMatch(JSON.stringify(h.events), /private-test-key|fixture@example\.test|https?:/);
    assert.equal(h.releases(), 1);
  }
});

test('empty, malformed, oversized and duplicate application data never replaces the live tab', () => {
  const cases = [[], [headings], [['wrong header'], ['value']]];
  for (const mutate of [
    rows => rows[1].pop(),
    rows => rows.push(rows[1]),
    rows => { rows[1][0] = 'not-an-application-id'; },
    rows => { rows[1][1] = 'invalid-date'; },
    rows => { rows[1][6] = 'x'.repeat(50001); },
  ]) { const rows = fixture(1); mutate(rows); cases.push(rows); }
  for (const rows of cases) {
    const h = harness({ rows }); const before = JSON.stringify(h.target);
    assert.throws(() => h.context.syncGscApplications(), /GSC Sheet sync failed/);
    assert.equal(JSON.stringify(h.target), before); assert.equal(h.batches.length, 0);
  }
});

test('missing previously visible applications aborts the sync even if the new CSV is valid', () => {
  const h = harness({ rows: fixture(2), existing: fixture(3) }); const before = JSON.stringify(h.target);
  assert.throws(() => h.context.syncGscApplications(), /feed-missing-existing-applications/);
  assert.equal(JSON.stringify(h.target), before); assert.equal(h.writes.length, 0);
});

test('staging and commit failures retain the last successful snapshot', () => {
  for (const options of [{ failStageWrite: 2 }, { failCommit: true }]) {
    const h = harness({ ...options, existing: fixture(2) }); const before = JSON.stringify(h.target);
    assert.throws(() => h.context.syncGscApplications(), /GSC Sheet sync failed/);
    assert.equal(JSON.stringify(h.target), before);
    assert.ok(h.writes.every(write => write.sheetId !== 0)); assert.equal(h.releases(), 1);
  }
});

test('setup reads the original key and is repeatable without deleting unrelated triggers', () => {
  const h = harness({ unconfigured: true, rows: fixture(3) });
  h.context.setupGscSheetSync(); h.context.setupGscSheetSync();
  assert.equal(h.props.get('GSC_SHEET_KEY'), secret); assert.equal(h.target.formula, '');
  assert.equal(h.sheets.length, 2); assert.equal(h.batches.length, 2);
  assert.deepEqual(h.triggers.map(trigger => trigger.getHandlerFunction()).sort(), ['syncGscApplications', 'unrelatedMailer']);
  assert.doesNotMatch(JSON.stringify(h.events), /private-test-key|fixture@example\.test|https?:/);
});

test('a failed initial restoration does not install an automatic trigger', () => {
  const h = harness({ unconfigured: true, failCommit: true });
  assert.throws(() => h.context.setupGscSheetSync(), /GSC Sheet sync failed/);
  assert.equal(h.triggers.length, 1); assert.match(h.target.formula, /^=IMPORTDATA/);
});

test('concurrent executions and changed headers are handled without overwriting Sheet1', () => {
  const busy = harness({ busy: true });
  assert.equal(busy.context.syncGscApplications().skipped, true); assert.equal(busy.fetches.length, 0);
  const existing = fixture(2); existing[0][6] = 'Reviewer notes';
  const changed = harness({ existing }); const before = JSON.stringify(changed.target);
  assert.throws(() => changed.context.syncGscApplications(), /sheet1-header-changed/);
  assert.equal(JSON.stringify(changed.target), before);
  const editing = harness({ onStageWrite: target => { target.formula = '=SUM(1,2)'; } });
  assert.throws(() => editing.context.syncGscApplications(), /unrecognised-sheet1-formula/);
  assert.equal(editing.batches.length, 0); assert.equal(editing.target.formula, '=SUM(1,2)');
});

test('missing advanced service is reported before making any request', () => {
  const h = harness({ noSheetsService: true });
  assert.throws(() => h.context.setupGscSheetSync(), /enable-google-sheets-api-service/);
  assert.equal(h.fetches.length, 0); assert.equal(h.writes.length, 0);
});
