/**
 * Authenticated GSC website -> Google Sheets receiver.
 * Deploy as a Web app: Execute as Me, access Anyone. The shared secret is required.
 * Script Properties: GSC_SPREADSHEET_ID (the review Sheet ID), GSC_SYNC_SECRET.
 * Cloudflare secrets: APPLICATION_SYNC_URL (the /exec URL), APPLICATION_SYNC_SECRET.
 * Writes a separate "Website applications" tab; the original Form responses stay intact.
 */
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('GSC_SYNC_SECRET');
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (_) { return sheetReply({ ok: false, code: 'bad-request' }); }
  if (!secret || body.secret !== secret) return sheetReply({ ok: false, code: 'unauthorised' });
  var app = body.application;
  if (!app || !/^[0-9a-f-]{36}$/i.test(app.applicationId) || !Array.isArray(app.answers) || app.answers.length > 100 || !app.deck || !app.deck.url) {
    return sheetReply({ ok: false, code: 'bad-request' });
  }
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(20000)) return sheetReply({ ok: false, code: 'busy' });
    var book = SpreadsheetApp.openById(props.getProperty('GSC_SPREADSHEET_ID'));
    var sheet = book.getSheetByName('Website applications') || book.insertSheet('Website applications');
    var base = ['Application ID', 'Submitted at', 'Email', 'Company', 'CIN / LLPIN', 'Pitch deck link'];
    var lastRow = sheet.getLastRow();
    // A timed-out delivery can be replayed safely: one row per application ID.
    if (lastRow > 1 && sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(app.applicationId).matchEntireCell(true).findNext()) {
      return sheetReply({ ok: true, applicationId: app.applicationId });
    }
    var headers = lastRow ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : base.slice();
    app.answers.forEach(function (answer) {
      var column = answer.entry + ' | ' + answer.title;
      if (headers.indexOf(column) === -1) headers.push(column);
    });
    var row = headers.map(function () { return ''; });
    [app.applicationId, app.submittedAt, app.email, app.company, app.cin, app.deck.url].forEach(function (v, i) { row[i] = sheetLiteral(v); });
    app.answers.forEach(function (answer) {
      row[headers.indexOf(answer.entry + ' | ' + answer.title)] = sheetLiteral(Array.isArray(answer.value) ? answer.value.join('\n') : answer.value);
    });
    if (headers.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    if (lastRow + 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(Math.max(2, lastRow + 1), 1, 1, headers.length).setValues([row]);
    sheet.setFrozenRows(1);
    return sheetReply({ ok: true, applicationId: app.applicationId });
  } catch (_) {
    console.error('Website application Sheet delivery failed. Application remains in R2.');
    return sheetReply({ ok: false, code: 'sheet-unavailable' });
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}

function sheetLiteral(value) {
  var s = String(value === null || value === undefined ? '' : value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function sheetReply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function checkSheetSetup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('GSC_SYNC_SECRET')) throw new Error('Set GSC_SYNC_SECRET in Script Properties.');
  Logger.log(SpreadsheetApp.openById(props.getProperty('GSC_SPREADSHEET_ID')).getUrl());
}
