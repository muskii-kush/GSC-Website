/**
 * GSC website -> confirmation email after an application is recorded.
 * Create this in the Google account that should send the email (ideally grandstartupchallenge@cars24.com).
 * Deploy as a Web app: Execute as Me, access Anyone. The shared secret is required.
 * Script Properties: GSC_MAIL_SECRET (a long random value).
 * Cloudflare secrets: MAIL_URL (the /exec URL) and MAIL_SECRET (the same value as GSC_MAIL_SECRET).
 * Google Workspace accounts can send to about 1,500 recipients a day this way.
 */
function doPost(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('GSC_MAIL_SECRET');
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (_) { return mailReply({ ok: false, code: 'bad-request' }); }
  if (!secret || body.secret !== secret) return mailReply({ ok: false, code: 'unauthorised' });
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(body.to || '') || !body.subject || !body.text) return mailReply({ ok: false, code: 'bad-request' });
  // One email per application, even if the website retries.
  var cache = CacheService.getScriptCache(), key = 'sent:' + body.applicationId;
  if (body.applicationId && cache.get(key)) return mailReply({ ok: true, duplicate: true });
  try {
    MailApp.sendEmail({ to: body.to, subject: body.subject, body: body.text, htmlBody: body.html, name: body.name || 'Grand Startup Challenge', replyTo: body.replyTo });
    if (body.applicationId) cache.put(key, '1', 21600);
    return mailReply({ ok: true });
  } catch (err) {
    console.error('Confirmation email failed: ' + err);
    return mailReply({ ok: false, code: 'mail-failed' });
  }
}
function mailReply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
/** Run once from the editor to grant the email permission and check the quota. */
function checkMailSetup() {
  if (!PropertiesService.getScriptProperties().getProperty('GSC_MAIL_SECRET')) throw new Error('Set GSC_MAIL_SECRET in Script Properties.');
  Logger.log('Emails left today: ' + MailApp.getRemainingDailyQuota());
}
