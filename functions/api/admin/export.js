import { pages } from "../../../lib/application-questions";
import { reply } from "../../_lib/applications";

const questions = pages.flatMap((page) => page.questions).filter((question) => question.kind !== "file");
const entries = new Set(questions.map((question) => question.entry));
const headers = ["Application ID", "Submitted at", "Email", "Company", "CIN / LLPIN", "Pitch deck URL",
  ...questions.map((question) => `${question.entry} | ${question.title}`), "Additional answers (JSON)"];

async function authorised(request, env) {
  if (typeof env.SHEET_KEY !== "string" || !env.SHEET_KEY) return false;
  const key = new URL(request.url).searchParams.get("key") || "";
  const digest = async (value) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const actual = await digest(key), expected = await digest(env.SHEET_KEY);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

function csvCell(value) {
  let text = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  // Keep applicant input literal when the CSV is opened in a spreadsheet.
  if (/^[\s\uFEFF]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
const csvRow = (values) => values.map(csvCell).join(",") + "\r\n";

function applicationRow(application) {
  if (!application.applicationId || !Array.isArray(application.answers)) throw new Error("Invalid application archive");
  const answers = new Map(application.answers.map((answer) => [answer.entry, answer.value]));
  const additional = application.answers.filter((answer) => !entries.has(answer.entry));
  return csvRow([application.applicationId, application.submittedAt, application.email, application.company, application.cin,
    application.deck?.url, ...questions.map((question) => answers.get(question.entry)), additional.length ? JSON.stringify(additional) : ""]);
}

// Existing Sheet1 IMPORTDATA formula uses this exact route and SHEET_KEY.
// Every saved application is included, even when optional push delivery is pending.
export async function onRequestGet({ request, env }) {
  if (!await authorised(request, env)) return reply(false, "unauthorised", "Not authorised.", 401);
  if (!env.DECKS) return reply(false, "not-configured", "Storage is not configured.", 503);
  const objects = [];
  try {
    let cursor;
    do {
      const page = await env.DECKS.list({ prefix: "applications/", limit: 100, cursor, include: ["customMetadata"] });
      objects.push(...page.objects.filter((object) => /^applications\/[^/]+\.json$/.test(object.key)));
      if (page.truncated && (!page.cursor || page.cursor === cursor)) throw new Error("Invalid storage cursor");
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  } catch {
    console.error(JSON.stringify({ event: "application-export-list-failed" }));
    return reply(false, "storage-unavailable", "Applications could not be loaded. Please try again.", 503);
  }
  objects.sort((a, b) => String(a.customMetadata?.submittedAt || a.uploaded?.toISOString() || "").localeCompare(String(b.customMetadata?.submittedAt || b.uploaded?.toISOString() || "")) || a.key.localeCompare(b.key));
  const encoder = new TextEncoder();
  let index = -1;
  // Read one record at a time so the CSV can grow without buffering all answers.
  const body = new ReadableStream({
    async pull(controller) {
      try {
        if (index === -1) { index = 0; controller.enqueue(encoder.encode(csvRow(headers))); return; }
        if (index >= objects.length) { controller.close(); return; }
        const object = await env.DECKS.get(objects[index++].key);
        if (!object) throw new Error("Application archive unavailable");
        controller.enqueue(encoder.encode(applicationRow(await object.json())));
      } catch {
        console.error(JSON.stringify({ event: "application-export-read-failed" }));
        controller.error(new Error("Application export unavailable"));
      }
    },
  });
  return new Response(body, { headers: {
    "content-type": "text/csv; charset=utf-8", "cache-control": "no-store, private",
    "content-disposition": 'inline; filename="gsc-applications.csv"', "x-content-type-options": "nosniff",
  } });
}

export const onRequest = () => reply(false, "method-not-allowed", "Use GET.", 405);
