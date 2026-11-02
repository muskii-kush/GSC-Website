import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'gsc-client-test-'));
await build({ entryPoints: ['lib/application-submission.ts'], outfile: join(dir, 'submission.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
const { submitApplication } = await import(pathToFileURL(join(dir, 'submission.mjs')));
test.after(() => rm(dir, { recursive: true, force: true }));
const hints = { email: 'diagnostic@example.test', cin: 'U72900KA2026PTC123456' };
const receipt = { ok: true, applicationId: '11111111-1111-4111-8111-111111111111', reference: 'GSC27-11111111', submittedAt: '2026-10-19T05:00:00.000Z', recovered: true };
const absent = () => Response.json({ ok: false, code: 'not-found' }, { status: 404 });

test('a lost submission response recovers the saved receipt instead of showing a connection failure', async () => {
  let checks = 0, uploads = 0, checking = 0;
  const out = await submitApplication('/api/apply', new FormData(), hints, () => checking++, async (url, options) => {
    if (url === '/api/application/status') {
      assert.deepEqual(JSON.parse(options.body), hints); assert.equal(options.credentials, 'same-origin');
      return ++checks === 1 ? absent() : Response.json(receipt);
    }
    uploads++; throw new TypeError('Network connection was lost after save');
  });
  assert.equal(out.reference, receipt.reference); assert.equal(out.ok, true);
  assert.equal(checks, 2); assert.equal(uploads, 1); assert.equal(checking, 1);
});

test('an earlier receipt is shown without uploading the PDF again', async () => {
  let uploads = 0;
  const out = await submitApplication('/api/apply', new FormData(), hints, () => {}, async (url) => {
    if (url === '/api/application/status') return Response.json(receipt);
    uploads++; throw new Error('No duplicate upload');
  });
  assert.equal(out.applicationId, receipt.applicationId); assert.equal(uploads, 0);
});

test('an HTML gateway error still checks for a committed application', async () => {
  let checks = 0;
  const out = await submitApplication('/api/apply', new FormData(), hints, () => {}, async (url) => url === '/api/application/status' ? (++checks === 1 ? absent() : Response.json(receipt)) : new Response('<html>Gateway failure</html>', { status: 502 }));
  assert.equal(out.ok, true); assert.equal(out.reference, receipt.reference);
});

test('a genuine company conflict remains an actionable field error', async () => {
  const out = await submitApplication('/api/apply', new FormData(), hints, () => {}, async (url) => url === '/api/application/status' ? absent() : Response.json({ ok: false, code: 'duplicate', entry: 'entry.1619968075', message: 'This CIN/LLPIN is already on an application.' }, { status: 409 }));
  assert.equal(out.ok, false); assert.equal(out.entry, 'entry.1619968075'); assert.match(out.message, /CIN/);
});

test('unconfirmed requests preserve the draft and never manufacture a success receipt', async () => {
  const out = await submitApplication('/api/apply', new FormData(), hints, () => {}, async (url) => {
    if (url === '/api/application/status') return absent();
    throw new TypeError('File or connection unavailable');
  });
  assert.equal(out.ok, false); assert.equal(out.code, 'receipt-unconfirmed'); assert.match(out.message, /answers are still saved/);
  assert.equal(out.reference, undefined);
});

test('an expired sign-in returns to verification before uploading', async () => {
  let uploads = 0;
  const out = await submitApplication('/api/apply', new FormData(), hints, () => {}, async (url) => {
    if (url === '/api/application/status') return Response.json({ ok: false, code: 'signed-out' }, { status: 401 });
    uploads++; return Response.json(receipt);
  });
  assert.equal(out.code, 'signed-out'); assert.equal(uploads, 0);
});
