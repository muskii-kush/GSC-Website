import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'gsc-client-test-'));
await build({ entryPoints: ['lib/application-submission.ts'], outfile: join(dir, 'submission.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
const client = await import(pathToFileURL(join(dir, 'submission.mjs')));
const fastRetries = { retryDelays: [0, 0, 0, 0, 0] };
const submitApplication = (url, body, hints, onChecking, fetcher) => client.submitApplication(url, body, hints, onChecking, fetcher, fastRetries);
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

test('HTTP security, routing, rate limit and gateway failures retain their actual remedy and support reference', async () => {
  for (const [status, code] of [[401,'signed-out'],[403,'request-blocked'],[404,'service-unavailable'],[405,'service-unavailable'],[413,'deck-too-large'],[429,'rate-limited'],[502,'server-unavailable'],[503,'server-unavailable'],[504,'server-unavailable']]) {
    const out = await submitApplication('/api/apply',new FormData(),hints,()=>{},async url=>url==='/api/application/status'?absent():new Response('<html>Edge response</html>',{status,headers:{'cf-ray':'abc123-DEL'}}));
    assert.equal(out.ok,false); assert.equal(out.code,code); assert.equal(out.httpStatus,status);
    assert.equal(out.requestId,'abc123-DEL'); assert.match(out.message,/abc123-DEL/);
    assert.doesNotMatch(out.message,/check your connection/i);
  }
});

test('an unavailable status service is never treated as permission for another PDF upload', async () => {
  for (const response of [()=>new Response('<html>Not found</html>',{status:404}),()=>Response.json({ok:false,code:'status-unavailable',message:'Storage unavailable'},{status:503})]) {
    let uploads=0,files=0;
    const out=await submitApplication('/api/apply',async()=>{files++;return new FormData();},hints,()=>{},async url=>{
      if(url==='/api/application/status') return response();
      uploads++;return Response.json(receipt);
    });
    assert.equal(out.ok,false);assert.equal(uploads,0);assert.equal(files,0);
    assert.notEqual(out.code,'receipt-unconfirmed');
  }
});

test('a receipt that appears after the old retry window is recovered with one upload', async () => {
  let checks=0,uploads=0;
  const out=await submitApplication('/api/apply',new FormData(),hints,()=>{},async url=>{
    if(url==='/api/application/status') return ++checks<5?absent():Response.json(receipt);
    uploads++;throw new TypeError('Response lost before the archive committed');
  });
  assert.equal(out.ok,true);assert.equal(out.applicationId,receipt.applicationId);
  assert.equal(uploads,1);assert.equal(checks,5);
});

test('a live reservation polls to its receipt without reading or uploading the file again', async () => {
  let checks=0,uploads=0,files=0;
  const out=await submitApplication('/api/apply',async()=>{files++;return new FormData();},hints,()=>{},async url=>{
    if(url==='/api/application/status') return ++checks<4?Response.json({ok:false,code:'submission-in-progress'},{status:202}):Response.json(receipt);
    uploads++;throw new Error('Must not upload');
  });
  assert.equal(out.ok,true);assert.equal(checks,4);assert.equal(uploads,0);assert.equal(files,0);
});

test('processing is never misreported as a missing receipt or a successful application', async () => {
  const out=await submitApplication('/api/apply',new FormData(),hints,()=>{},async()=>Response.json({ok:false,code:'submission-in-progress'},{status:202}));
  assert.equal(out.ok,false);assert.equal(out.code,'submission-in-progress');
  assert.match(out.message,/still being processed/);assert.equal(out.reference,undefined);
});

test('lost file access requests reattachment, while an existing receipt needs no file access', async () => {
  let files=0,uploads=0;
  const body=async()=>{files++;throw new DOMException('File unavailable','NotReadableError');};
  const fetcher=async url=>{if(url==='/api/application/status')return absent();uploads++;throw new Error('Must not upload');};
  const failed=await submitApplication('/api/apply',body,hints,()=>{},fetcher);
  assert.equal(failed.code,'deck-unreadable');assert.equal(failed.entry,'deck');assert.equal(uploads,0);
  const recovered=await submitApplication('/api/apply',body,hints,()=>{},async()=>Response.json(receipt));
  assert.equal(recovered.ok,true);assert.equal(files,1);
});

test('read-only status recovery works without FormData and can follow processing to completion', async () => {
  let checks=0;
  const out=await client.checkSubmissionStatus(hints,async()=>++checks<3?Response.json({ok:false,code:'submission-in-progress'},{status:202}):Response.json(receipt),fastRetries);
  assert.equal(out.ok,true);assert.equal(out.reference,receipt.reference);assert.equal(checks,3);
});

test('a malformed success response cannot manufacture an application receipt', async () => {
  const out=await submitApplication('/api/apply',new FormData(),hints,()=>{},async url=>url==='/api/application/status'?absent():Response.json({ok:true,code:'ok'}));
  assert.equal(out.ok,false);assert.equal(out.reference,undefined);assert.equal(out.code,'invalid-response');
});
