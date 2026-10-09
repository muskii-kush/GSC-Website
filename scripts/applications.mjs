// Private admin export/replay. Keep the bearer secret in the environment, not shell arguments.
import { writeFile } from "node:fs/promises";
const [command = "export", destination = "applications.json"] = process.argv.slice(2);
const origin = process.env.GSC_SITE_URL || "https://gsc.cars24.com";
const secret = process.env.APPLICATION_ADMIN_SECRET;
if (!secret || !["export", "sync"].includes(command)) throw new Error("Set APPLICATION_ADMIN_SECRET and use: node scripts/applications.mjs [export <file.json> | sync]");
async function call(params = "", body) {
  const response = await fetch(`${origin}/api/admin/applications${params}`, {
    headers: { authorization: `Bearer ${secret}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`${result.code}: ${result.message}`);
  return result;
}
const applications = [];
let cursor;
do {
  const page = await call(cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");
  for (const row of page.applications) {
    const { application } = await call(`?id=${encodeURIComponent(row.applicationId)}`);
    if (command === "sync" && application.delivery.status !== "delivered") {
      await call("", { applicationId: row.applicationId });
      console.log(`Delivered ${row.applicationId}`);
    } else if (command === "export") applications.push(application);
  }
  cursor = page.cursor;
} while (cursor);
if (command === "export") { await writeFile(destination, JSON.stringify(applications, null, 2), { mode: 0o600 }); console.log(`Exported ${applications.length} applications to ${destination}`); }
