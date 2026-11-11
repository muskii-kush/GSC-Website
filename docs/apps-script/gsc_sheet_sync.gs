/**
 * Install in GSC 2027 Applications > Extensions > Apps Script, as a NEW script file.
 * Enable Services > Google Sheets API, then run setupGscSheetSync once.
 * No web-app deployment or Cloudflare changes are required.
 * See docs/SHEET-SYNC.md. Do not paste the feed key into this source file.
 */
var GSC_SYNC_BOOK_ID = '1YkL9tQyJrpG4sUsNDl7XVIQag9VvEGCowMY0MMnhT5c';
var GSC_SYNC_TAB = 'Sheet1';
var GSC_SYNC_STAGE = '__GSC_SYNC_STAGING';
var GSC_SYNC_BASE = ['Application ID', 'Submitted at', 'Email', 'Company', 'CIN / LLPIN', 'Pitch deck URL'];
var GSC_SYNC_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Restores Sheet1 first, then installs a 15-minute refresh owned by this account. */
function setupGscSheetSync() {
  if (typeof Sheets === 'undefined') gscSyncFail_('enable-google-sheets-api-service');
  var book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book || book.getId() !== GSC_SYNC_BOOK_ID) gscSyncFail_('open-the-original-application-spreadsheet');
  var target = book.getSheetByName(GSC_SYNC_TAB);
  if (!target) gscSyncFail_('sheet1-missing');
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('GSC_SHEET_KEY')) {
    var formula = target.getRange('A1').getFormula();
    var match = formula.match(/^=IMPORTDATA\("https:\/\/gsc\.cars24\.com\/api\/admin\/export\?([^"\r\n]+)"\)$/i);
    var key = match && match[1].match(/(?:^|&)key=([^&]+)/);
    if (!key) gscSyncFail_('existing-import-key-missing');
    props.setProperty('GSC_SHEET_KEY', decodeURIComponent(key[1].replace(/\+/g, ' ')));
  }
  var result = syncGscApplications();
  if (!result || result.skipped) gscSyncFail_('sync-already-running');
  // Create the replacement first. Never touch triggers belonging to other functions.
  var previous = ScriptApp.getProjectTriggers().filter(function (trigger) { return trigger.getHandlerFunction() === 'syncGscApplications'; });
  ScriptApp.newTrigger('syncGscApplications').timeBased().everyMinutes(15).create();
  previous.forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  console.log(JSON.stringify({ event: 'gsc-sheet-schedule-installed', intervalMinutes: 15, applications: result.applications }));
}

/** Complete fetch -> validation -> hidden staging -> one atomic publish to Sheet1. */
function syncGscApplications() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { skipped: true };
  var stage = 'configuration', status, reference;
  try {
    if (typeof Sheets === 'undefined') gscSyncFail_('enable-google-sheets-api-service');
    var props = PropertiesService.getScriptProperties();
    var key = props.getProperty('GSC_SHEET_KEY');
    if (!key) gscSyncFail_('run-setup-first');
    var book = SpreadsheetApp.openById(GSC_SYNC_BOOK_ID);
    var target = book.getSheetByName(GSC_SYNC_TAB);
    if (!target) gscSyncFail_('sheet1-missing');

    stage = 'fetch-csv';
    // Never log this URL or raw fetch exceptions: they may contain the private key.
    var response = UrlFetchApp.fetch('https://gsc.cars24.com/api/admin/export?key=' + encodeURIComponent(key), {
      method: 'get', headers: { Accept: 'text/csv' }, muteHttpExceptions: true,
      followRedirects: false, timeoutSeconds: 240,
    });
    status = response.getResponseCode();
    var headers = response.getAllHeaders();
    var header = function (name) { var found = Object.keys(headers).filter(function (item) { return item.toLowerCase() === name; })[0]; return found ? String(headers[found]) : ''; };
    var rawReference = header('x-gsc-request-id') || header('cf-ray');
    reference = /^[a-z0-9-]{1,80}$/i.test(rawReference) ? rawReference : undefined;
    if (status !== 200) gscSyncFail_('feed-http-error');
    if (!/^text\/csv(?:;|$)/i.test(header('content-type'))) gscSyncFail_('feed-not-csv');

    stage = 'validate-csv';
    var rows = gscValidateCsv_(response.getContentText('UTF-8'));
    var width = rows[0].length;
    var before = gscTargetState_(target, rows[0]);
    var incoming = new Set(rows.slice(1).map(function (row) { return row[0]; }));
    if (before.ids.some(function (id) { return !incoming.has(id); })) gscSyncFail_('feed-missing-existing-applications');

    stage = 'write-staging';
    var savedStageId = Number(props.getProperty('GSC_SYNC_STAGE_ID'));
    var staging = savedStageId && book.getSheets().filter(function (sheet) { return sheet.getSheetId() === savedStageId; })[0];
    if (!staging) {
      if (book.getSheetByName(GSC_SYNC_STAGE)) gscSyncFail_('staging-name-already-in-use');
      staging = book.insertSheet(GSC_SYNC_STAGE);
      props.setProperty('GSC_SYNC_STAGE_ID', String(staging.getSheetId()));
    }
    if (staging.getSheetId() === target.getSheetId() || staging.getName() !== GSC_SYNC_STAGE) gscSyncFail_('invalid-staging-sheet');
    staging.hideSheet();
    gscGrowSheet_(staging, rows.length, width);
    staging.getDataRange().clearContent();
    for (var offset = 0; offset < rows.length; offset += 100) {
      var chunk = rows.slice(offset, offset + 100).map(function (row) { return row.map(gscSyncLiteral_); });
      staging.getRange(offset + 1, 1, chunk.length, width).setNumberFormat('@').setValues(chunk);
    }
    SpreadsheetApp.flush();
    if (staging.getLastRow() !== rows.length || staging.getRange(rows.length, 1).getValue() !== rows[rows.length - 1][0]) gscSyncFail_('staging-incomplete');
    // A collaborator may have changed the original tab while the sync was running.
    if (JSON.stringify(gscTargetState_(target, rows[0])) !== JSON.stringify(before)) gscSyncFail_('sheet1-changed-during-sync');

    stage = 'publish-sheet1';
    var targetId = target.getSheetId();
    var destination = { sheetId: targetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: width };
    var timestamp = new Date().toISOString();
    // The Sheets API validates/applies all requests atomically. Never clear Sheet1
    // in a separate call. Keep its sheet ID, formatting, links and extra columns.
    Sheets.Spreadsheets.batchUpdate({ requests: [
      { updateSheetProperties: { properties: { sheetId: targetId, gridProperties: { rowCount: Math.max(target.getMaxRows(), rows.length), columnCount: Math.max(target.getMaxColumns(), width) } }, fields: 'gridProperties.rowCount,gridProperties.columnCount' } },
      { repeatCell: { range: { sheetId: targetId, startRowIndex: 0, endRowIndex: Math.max(target.getLastRow(), rows.length), startColumnIndex: 0, endColumnIndex: width }, cell: {}, fields: 'userEnteredValue' } },
      { copyPaste: { source: { sheetId: staging.getSheetId(), startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: width }, destination: destination, pasteType: 'PASTE_VALUES', pasteOrientation: 'NORMAL' } },
      { updateCells: { range: { sheetId: targetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ note: 'Last successful GSC sync: ' + timestamp + '\nApplications: ' + (rows.length - 1) + '\nRefresh: every 15 minutes. This tab is managed by syncGscApplications; keep review notes in another tab.' }] }], fields: 'note' } },
    ] }, book.getId());
    console.log(JSON.stringify({ event: 'gsc-sheet-sync-completed', applications: rows.length - 1, columns: width, syncedAt: timestamp, supportReference: reference }));
    return { applications: rows.length - 1, columns: width };
  } catch (error) {
    var code = error && error.gscSyncCode || 'service-error';
    console.error(JSON.stringify({ event: 'gsc-sheet-sync-failed', stage: stage, code: code, httpStatus: status, supportReference: reference }));
    // Re-throw only our own safe message, never a provider exception or response body.
    throw new Error('GSC Sheet sync failed at ' + stage + ' (' + code + '). Check Apps Script Executions. The source application records are unchanged.');
  } finally { lock.releaseLock(); }
}

function gscValidateCsv_(text) {
  var rows = Utilities.parseCsv(text.replace(/^\uFEFF/, ''));
  while (rows.length && rows[rows.length - 1].every(function (cell) { return cell === ''; })) rows.pop();
  var headings = rows[0] || [];
  if (rows.length < 2 || headings.length < 7 || GSC_SYNC_BASE.some(function (heading, index) { return headings[index] !== heading; }) || headings[headings.length - 1] !== 'Additional answers (JSON)') gscSyncFail_('invalid-csv-header-or-empty-feed');
  if (new Set(headings).size !== headings.length) gscSyncFail_('duplicate-csv-columns');
  var ids = new Set();
  rows.slice(1).forEach(function (row) {
    if (row.length !== headings.length || !GSC_SYNC_UUID.test(row[0]) || ids.has(row[0]) || !/^\d{4}-\d{2}-\d{2}T/.test(row[1]) || !isFinite(Date.parse(row[1]))) gscSyncFail_('invalid-or-duplicate-csv-row');
    if (row.some(function (cell) { return cell.length > 50000; })) gscSyncFail_('csv-cell-too-large');
    ids.add(row[0]);
  });
  return rows;
}

function gscTargetState_(sheet, headings) {
  var formula = sheet.getRange('A1').getFormula();
  if (formula) {
    if (!/^=IMPORTDATA\("https:\/\/gsc\.cars24\.com\/api\/admin\/export\?[^"\r\n]+"\)$/i.test(formula)) gscSyncFail_('unrecognised-sheet1-formula');
    return { formula: formula, ids: [] };
  }
  if (sheet.getRange(1, 1, 1, headings.length).getValues()[0].some(function (value, index) { return value !== headings[index]; })) gscSyncFail_('sheet1-header-changed');
  var ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (row) { return String(row[0]); }).filter(Boolean) : [];
  if (ids.some(function (id) { return !GSC_SYNC_UUID.test(id); })) gscSyncFail_('sheet1-unrecognised-rows');
  return { formula: '', ids: ids };
}

function gscGrowSheet_(sheet, rows, columns) {
  if (rows > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (columns > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
}

function gscSyncLiteral_(value) { return /^[\s\uFEFF]*[=+@-]/.test(value) ? "'" + value : value; }
function gscSyncFail_(code) { var error = new Error(code); error.gscSyncCode = code; throw error; }
