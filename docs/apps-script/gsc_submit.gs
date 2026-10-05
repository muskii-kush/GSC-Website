/**
 * Grand Startup Challenge 2027: receiver for applications sent from the website.
 *
 * The website form posts here. This script:
 *   1. saves the pitch deck PDF into a private Drive folder you own (applicants cannot change it later),
 *   2. adds the deck's Drive link to the "Pitch deck link" question,
 *   3. submits every answer to the Google Form, so it lands in the normal Form responses and Sheet,
 *   4. tells the website whether it worked, and refuses a second application with the same CIN or email.
 *
 * Deploy: Deploy > New deployment > type "Web app", Execute as "Me", Who has access "Anyone".
 * Copy the web app URL and send it to whoever maintains the site (it goes in lib/application-form.ts).
 *
 * The Form must NOT contain a file upload question (that forces Google sign-in and blocks this script).
 * Instead it needs a Short answer question titled exactly: Pitch deck link
 */

var FORM_PUBLIC_ID = '1FAIpQLSe7uI5-KB-8DN-TtK8S6fjeqLjCn8rH62kORvhx2F8sC84rUg';
var DECK_QUESTION_TITLE = 'Pitch deck link';
var DECK_FOLDER_ID = '1LUZbTJRJpSWerP81XVQWWoP3mfmGV5Y4'; // "GSC 2027 Pitch Decks" folder (shared by IT)
var MAX_DECK_BYTES = 30 * 1024 * 1024; // 30MB: Apps Script accepts about 50MB per request, and base64 adds a third.
var CIN_ENTRY = 'entry.1619968075';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents);
    var fields = body.fields || [];          // [[name, value], ...] exactly as the Form expects
    var email = String(body.email || '').trim().toLowerCase();
    var cin = '';
    fields.forEach(function (f) { if (f[0] === CIN_ENTRY) cin = String(f[1]).trim().toUpperCase(); });

    if (!email) return reply(false, 'missing-email', 'An email address is required.');
    if (!body.deck || !body.deck.data) return reply(false, 'missing-deck', 'Please attach your pitch deck as a PDF.');

    // One application per company and per email.
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('email:' + email)) return reply(false, 'duplicate', 'An application with this email has already been submitted.');
    if (cin && props.getProperty('cin:' + cin)) return reply(false, 'duplicate', 'An application for this company (CIN or LLPIN) has already been submitted.');

    // 1. Save the deck.
    var bytes = Utilities.base64Decode(body.deck.data);
    if (bytes.length > MAX_DECK_BYTES) return reply(false, 'deck-too-large', 'The deck must be 30MB or smaller.');
    var head = String.fromCharCode.apply(null, bytes.slice(0, 4).map(function (b) { return b & 255; }));
    if (head !== '%PDF') return reply(false, 'deck-not-pdf', 'The deck must be a PDF file.');
    var name = safeName(body.deck.name || 'PitchDeck.pdf');
    var file = deckFolder().createFile(Utilities.newBlob(bytes, 'application/pdf', name));
    file.setDescription('Applicant: ' + email + (cin ? ' · ' + cin : '') + ' · ' + new Date().toISOString());

    // 2. Find the deck question's entry ID on the live Form and add the link.
    var deckEntry = entryForTitle(DECK_QUESTION_TITLE);
    if (!deckEntry) return reply(false, 'form-not-ready', 'The application form is being updated. Please try again shortly.');
    fields.push([deckEntry, file.getUrl()]);
    fields.push(['emailAddress', email]);
    fields.push(['fvv', '1']);
    if (body.pageHistory) fields.push(['pageHistory', String(body.pageHistory)]);

    // 3. Submit to the Form.
    var payload = fields.map(function (f) { return encodeURIComponent(f[0]) + '=' + encodeURIComponent(String(f[1])); }).join('&');
    var res = UrlFetchApp.fetch('https://docs.google.com/forms/d/e/' + FORM_PUBLIC_ID + '/formResponse', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: payload,
      followRedirects: true,
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    var html = res.getContentText();
    var accepted = code === 200 && ['has been received', 'Your response has been recorded', 'freebirdFormviewerViewResponseConfirmationMessage']
      .some(function (t) { return html.indexOf(t) !== -1; });
    if (!accepted) {
      file.setTrashed(true);
      console.error('Form rejected the submission', code, html.slice(0, 2000));
      return reply(false, 'form-rejected', 'We could not record the application. Please check your answers and try again, or write to grandstartupchallenge@cars24.com.');
    }

    // 4. Remember this applicant.
    props.setProperty('email:' + email, new Date().toISOString());
    if (cin) props.setProperty('cin:' + cin, new Date().toISOString());
    return reply(true, 'ok', 'Application received.');
  } catch (err) {
    console.error(err);
    return reply(false, 'error', 'Something went wrong on our side. Please try again in a minute.');
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/** Reads the live Form and returns "entry.<id>" for the question with this title. Cached for 10 minutes. */
function entryForTitle(title) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('entry:' + title);
  if (hit) return hit;
  var html = UrlFetchApp.fetch('https://docs.google.com/forms/d/e/' + FORM_PUBLIC_ID + '/viewform', { muteHttpExceptions: true }).getContentText();
  var m = html.match(/FB_PUBLIC_LOAD_DATA_ = ([\s\S]*?);<\/script>/);
  if (!m) return null;
  var data = JSON.parse(m[1]);
  var items = data[1][1] || [];
  for (var i = 0; i < items.length; i++) {
    if (String(items[i][1]).trim() === title && items[i][4] && items[i][4][0]) {
      var entry = 'entry.' + items[i][4][0][0];
      cache.put('entry:' + title, entry, 600);
      return entry;
    }
  }
  return null;
}

function deckFolder() {
  // The account the script runs as needs edit access to this folder.
  return DriveApp.getFolderById(DECK_FOLDER_ID);
}

function safeName(n) {
  var clean = String(n).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  return /\.pdf$/i.test(clean) ? clean : clean + '.pdf';
}

function reply(ok, code, message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, code: code, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to check setup: prints the deck question's entry ID and the deck folder. */
function checkSetup() {
  Logger.log('Deck question: ' + entryForTitle(DECK_QUESTION_TITLE));
  Logger.log('Deck folder: ' + deckFolder().getUrl());
}
