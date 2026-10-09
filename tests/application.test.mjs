import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID, webcrypto } from "node:crypto";
import vm from "node:vm";
import { fixture as makeFixture } from "./application-fixture.mjs";

globalThis.crypto ||= webcrypto;
const dir = await mkdtemp(join(tmpdir(), "gsc-test-"));
for (const [name, entry] of [["apply", "functions/api/apply.js"], ["admin", "functions/api/admin/applications.js"], ["export", "functions/api/admin/export.js"], ["schema", "lib/application-questions.ts"]]) {
  await build({ entryPoints: [entry], outfile: join(dir, `${name}.mjs`), bundle: true, platform: "node", format: "esm", logLevel: "silent" });
}
const apply = await import(pathToFileURL(join(dir, "apply.mjs")));
const admin = await import(pathToFileURL(join(dir, "admin.mjs")));
const sheetExport = await import(pathToFileURL(join(dir, "export.mjs")));
const { pages } = await import(pathToFileURL(join(dir, "schema.mjs")));
test.after(() => rm(dir, { recursive: true, force: true }));

class Bucket {
  records = new Map();
  failArchive = false;
  async put(key, value, options = {}) {
    if (this.failArchive && key.startsWith("applications/")) throw new Error("R2 unavailable");
    if (options.onlyIf?.etagDoesNotMatch === "*" && this.records.has(key)) return null;
    if (options.onlyIf?.etagMatches && this.records.get(key)?.etag !== options.onlyIf.etagMatches) return null;
    this.records.set(key, { value, uploaded: new Date(), etag: randomUUID() });
    return { key };
  }
  async head(key) { return this.records.has(key) ? { key } : null; }
  async get(key) { const obj = this.records.get(key); return obj ? { etag: obj.etag, json: async () => JSON.parse(obj.value) } : null; }
  async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) this.records.delete(key); }
  async list({ prefix }) { return { objects: [...this.records].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, uploaded: value.uploaded })), truncated: false }; }
}

const fixture = () => makeFixture(pages);
function request(payload, pdf = true) {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  form.set("deck", new Blob([pdf ? "%PDF-1.7\n" : "NOT A PDF", " ".repeat(12_000)], { type: "application/pdf" }), "Diagnostic.pdf");
  return new Request("https://gsc.cars24.com/api/apply", { method: "POST", body: form });
}
async function submit(payload, bucket = new Bucket(), extra = {}, pdf = true) {
  const work = [];
  const response = await apply.onRequestPost({ request: request(payload, pdf), env: { DECKS: bucket, ...extra }, waitUntil: (p) => work.push(p) });
  await Promise.all(work);
  return { response, result: await response.json(), bucket };
}
const archives = (bucket) => [...bucket.records].filter(([key]) => key.startsWith("applications/")).map(([, object]) => JSON.parse(object.value));

function parseCsv(text) {
  const rows = []; let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(value); value = ""; }
    else if (c === '\n' && !quoted) { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += c;
  }
  return rows;
}
const exportRequest = (key = "sheet-secret") => new Request(`https://gsc.cars24.com/api/admin/export?key=${encodeURIComponent(key)}`);

test("the existing SHEET_KEY protects the CSV before reading storage", async () => {
  let reads = 0;
  const env = { SHEET_KEY: "sheet-secret", DECKS: { list() { reads++; throw new Error("Must not read"); } } };
  for (const request of [exportRequest("wrong"), new Request("https://gsc.cars24.com/api/admin/export")]) {
    assert.equal((await sheetExport.onRequestGet({ request, env })).status, 401);
  }
  assert.equal((await sheetExport.onRequestGet({ request: exportRequest(), env: { ...env, SHEET_KEY: undefined } })).status, 401);
  assert.equal(reads, 0);
  assert.equal((await sheetExport.onRequestGet({ request: exportRequest(), env: { SHEET_KEY: "sheet-secret" } })).status, 503);
});

test("saved submissions export every answer, CSV punctuation and deck link to the existing Sheet", async () => {
  const { result, bucket } = await submit(fixture(), new Bucket(), { SHEET_KEY: "sheet-secret" });
  const [record] = archives(bucket);
  assert.equal(record.delivery.reason, "sheet-export");
  record.company = '=untrusted()';
  record.answers[0].value = 'Hindi, English "quotes"\nand a second line';
  record.answers.push({ entry: "entry.retired", title: "Historical question", value: "Preserved answer" });
  await bucket.put(`applications/${record.applicationId}.json`, JSON.stringify(record));
  const response = await sheetExport.onRequestGet({ request: exportRequest(), env: { DECKS: bucket, SHEET_KEY: "sheet-secret" } });
  assert.equal(response.status, 200); assert.match(response.headers.get("content-type"), /^text\/csv/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const rows = parseCsv(await response.text());
  assert.equal(rows.length, 2); assert.equal(rows[1][0], result.applicationId); assert.equal(rows[1][3], "'=untrusted()");
  assert.equal(rows[1][5], record.deck.url);
  for (const answer of record.answers.filter((answer) => answer.entry !== "entry.retired")) {
    const column = rows[0].findIndex((header) => header.startsWith(`${answer.entry} |`));
    const expected = Array.isArray(answer.value) ? answer.value.join("\n") : String(answer.value);
    assert.equal(rows[1][column], /^[\s\uFEFF]*[=+@-]/.test(expected) ? "'" + expected : expected);
  }
  assert.equal(JSON.parse(rows[1].at(-1))[0].value, "Preserved answer");
});

test("CSV exports every R2 page in submission order and never silently truncates failed reads", async () => {
  const bucket = new Bucket(), cursors = [];
  for (const [id, submittedAt] of [["c", "2026-10-01T00:00:00Z"], ["a", "2026-10-02T00:00:00Z"], ["b", "2026-10-03T00:00:00Z"]]) {
    await bucket.put(`applications/${id}.json`, JSON.stringify({ applicationId: id, submittedAt, answers: [], deck: {} }));
  }
  bucket.list = async ({ prefix, cursor, include }) => {
    assert.equal(prefix, "applications/"); assert.deepEqual(include, ["customMetadata"]); cursors.push(cursor);
    const keys = [...bucket.records.keys()].sort(), index = Number(cursor || 0), key = keys[index];
    return { objects: [{ key, customMetadata: { submittedAt: JSON.parse(bucket.records.get(key).value).submittedAt } }], truncated: index < keys.length - 1, cursor: String(index + 1) };
  };
  const env = { DECKS: bucket, SHEET_KEY: "sheet-secret" };
  const response = await sheetExport.onRequestGet({ request: exportRequest(), env });
  assert.deepEqual(parseCsv(await response.text()).slice(1).map((row) => row[0]), ["c", "a", "b"]);
  assert.deepEqual(cursors, [undefined, "1", "2"]);
  bucket.get = async () => null;
  const broken = await sheetExport.onRequestGet({ request: exportRequest(), env });
  await assert.rejects(() => broken.text(), /Application export unavailable/);
  bucket.list = async () => { throw new Error("R2 unavailable"); };
  assert.equal((await sheetExport.onRequestGet({ request: exportRequest(), env })).status, 503);
});

test("complete application and PDF are durable before receipt; no public Google request", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("Public Google endpoint must not be called"); };
  try {
    const { result, bucket } = await submit(fixture());
    assert.equal(result.ok, true);
    const [record] = archives(bucket);
    assert.equal(record.applicationId, result.applicationId);
    assert.equal(record.email, "gsc.diagnostic@cars24.com");
    assert.equal(record.answers.find((x) => x.entry === "entry.57854905").value, "0");
    assert.equal(record.answers.find((x) => x.entry === "entry.1335098423").value.length, 6);
    assert.ok(bucket.records.has(record.deck.key));
    assert.equal(record.delivery.reason, "not-configured");
  } finally { globalThis.fetch = original; }
});
test("missing declarations are rejected before storage", async () => {
  const payload = fixture(); payload.fields = payload.fields.filter(([entry]) => entry !== "entry.1335098423");
  const { response, result, bucket } = await submit(payload);
  assert.equal(response.status, 422); assert.equal(result.entry, "entry.1335098423"); assert.equal(bucket.records.size, 0);
});
test("a hidden traction section does not need revenue answers", async () => {
  const payload = fixture();
  payload.fields.find(([entry]) => entry === "entry.870262506")[1] = "No, not yet";
  const hidden = new Set(pages.find((p) => p.conditional).questions.map((q) => q.entry));
  payload.fields = payload.fields.filter(([entry]) => !hidden.has(entry));
  const { result, bucket } = await submit(payload);
  assert.equal(result.ok, true); assert.ok(archives(bucket)[0].answers.every((x) => !hidden.has(x.entry)));
});
test("a started optional founder must be complete", async () => {
  const payload = fixture(); payload.fields.push(["entry.1815689355", "Second Founder"]);
  const { response, bucket } = await submit(payload);
  assert.equal(response.status, 422); assert.equal(bucket.records.size, 0);
});
test("invalid PDF content is rejected", async () => {
  const { response, bucket } = await submit(fixture(), new Bucket(), {}, false);
  assert.equal(response.status, 422); assert.equal(bucket.records.size, 0);
});
test("archive storage failure returns a failure and cleans up the deck and claims", async () => {
  const bucket = new Bucket(); bucket.failArchive = true;
  const { response, result } = await submit(fixture(), bucket);
  assert.equal(response.status, 503); assert.equal(result.ok, false); assert.equal(bucket.records.size, 0);
});
test("a lost success response can be retried without a second application", async () => {
  const payload = fixture(), bucket = new Bucket();
  const first = await submit(payload, bucket), second = await submit(payload, bucket);
  assert.equal(second.result.ok, true); assert.equal(second.result.applicationId, first.result.applicationId); assert.equal(archives(bucket).length, 1);
});
test("email and company duplicates are refused, including simultaneous requests", async () => {
  const bucket = new Bucket(), a = fixture(), b = fixture();
  const results = await Promise.all([submit(a, bucket), submit(b, bucket)]);
  assert.equal(results.filter((x) => x.result.ok).length, 1); assert.equal(archives(bucket).length, 1);
  const c = fixture(); c.email = "other.diagnostic@cars24.com";
  assert.equal((await submit(c, bucket)).result.code, "duplicate");
  assert.equal([...bucket.records.keys()].filter((k) => k.startsWith("applicants/email/")).length, 1);
});
test("Google delivery failure never deletes a received application or its PDF", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("<html>Unavailable</html>", { status: 503 });
  try {
    const { result, bucket } = await submit(fixture(), new Bucket(), { APPLICATION_SYNC_URL: "https://script.google.com/macros/s/diagnostic/exec", APPLICATION_SYNC_SECRET: "test-secret" });
    assert.equal(result.ok, true); const [record] = archives(bucket);
    assert.equal(record.delivery.status, "pending"); assert.ok(bucket.records.has(record.deck.key));
  } finally { globalThis.fetch = original; }
});
test("an abandoned expired reservation can be recovered", async () => {
  const payload = fixture(), bucket = new Bucket();
  const digest = Buffer.from(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(payload.email))).toString("hex");
  await bucket.put(`applicants/email/${digest}.json`, JSON.stringify({ applicationId: randomUUID(), leaseExpiresAt: "2020-01-01T00:00:00Z" }));
  const { result } = await submit(payload, bucket);
  assert.equal(result.ok, true); assert.equal(archives(bucket).length, 1);
});
test("private admin retrieval and authenticated replay deliver saved records", async () => {
  const env = { DECKS: new Bucket(), APPLICATION_ADMIN_SECRET: "admin-secret", APPLICATION_SYNC_URL: "https://script.google.com/macros/s/diagnostic/exec", APPLICATION_SYNC_SECRET: "sync-secret" };
  const { result } = await submit(fixture(), env.DECKS);
  assert.equal((await admin.onRequestGet({ env, request: new Request("https://gsc.cars24.com/api/admin/applications") })).status, 401);
  const headers = { authorization: "Bearer admin-secret", "content-type": "application/json" };
  const loaded = await admin.onRequestGet({ env, request: new Request(`https://gsc.cars24.com/api/admin/applications?id=${result.applicationId}`, { headers }) });
  assert.equal((await loaded.json()).application.applicationId, result.applicationId);
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); assert.equal(body.secret, "sync-secret");
    return Response.json({ ok: true, applicationId: body.application.applicationId });
  };
  try {
    const replay = await admin.onRequestPost({ env, request: new Request("https://gsc.cars24.com/api/admin/applications", { method: "POST", headers, body: JSON.stringify({ applicationId: result.applicationId }) }) });
    assert.equal(replay.status, 200); assert.equal(archives(env.DECKS)[0].delivery.status, "delivered");
  } finally { globalThis.fetch = original; }
});

test("Sheet receiver keeps headers, records once, and treats formulas as literal text", async () => {
  const rows = [];
  const sheet = {
    getLastRow: () => rows.length, getLastColumn: () => rows[0]?.length || 0,
    getMaxColumns: () => 100, getMaxRows: () => 1000, setFrozenRows() {},
    getRange: (r, c, n, width) => ({
      getValues: () => rows.slice(r - 1, r - 1 + n).map((row) => row.slice(c - 1, c - 1 + width)),
      setValues: (values) => values.forEach((row, i) => { rows[r - 1 + i] = [...row]; }),
      createTextFinder: (id) => ({ matchEntireCell: () => ({ findNext: () => rows.slice(1).find((row) => row[0] === id) }) }),
    }),
  };
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => key === "GSC_SYNC_SECRET" ? "secret" : "sheet-id" }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, hasLock: () => true, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (value) => ({ setMimeType: () => JSON.parse(value) }) }, console,
  };
  vm.createContext(context); vm.runInContext(await readFile("docs/apps-script/gsc_sheet_receiver.gs", "utf8"), context);
  const app = { applicationId: randomUUID(), email: "gsc.diagnostic@cars24.com", company: "=malicious()", deck: { url: "https://gsc.cars24.com/api/deck/test.pdf" }, answers: [{ entry: "entry.57854905", title: "Revenue", value: "0" }] };
  const call = (secret = "secret") => context.doPost({ postData: { contents: JSON.stringify({ secret, application: app }) } });
  assert.equal(call("wrong").ok, false); assert.equal(rows.length, 0);
  assert.equal(call().ok, true); assert.equal(call().ok, true); assert.equal(rows.length, 2);
  assert.equal(rows[0][0], "Application ID"); assert.equal(rows[1][0], app.applicationId); assert.equal(rows[1][3], "'=malicious()"); assert.equal(rows[1][6], "0");
});
