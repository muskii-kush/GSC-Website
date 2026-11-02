import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
nextEnv.loadEnvConfig(root, true);
const apiPort = Number(process.env.GSC_LOCAL_API_PORT || 8788);
if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) throw new Error("Invalid GSC_LOCAL_API_PORT");
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

function start(file, args, env = process.env) {
  const child = spawn(process.execPath, [join(root, file), ...args], { cwd: root, stdio: "inherit", env });
  children.add(child);
  child.on("error", (error) => { console.error(error.message); stop(1); });
  child.on("exit", (code) => { children.delete(child); if (!stopping) stop(code || 0); });
  return child;
}

try {
  // These bindings use Wrangler's local storage, including across dev restarts.
  // Blank push-delivery bindings keep local test applications in local storage.
  await mkdir(join(root, ".wrangler/dev-assets"), { recursive: true });
  start("node_modules/wrangler/bin/wrangler.js", [
    "pages", "dev", ".wrangler/dev-assets", "--ip", "127.0.0.1", "--port", String(apiPort),
    "--compatibility-date", "2026-10-09", "--persist-to", ".wrangler/local-development",
    "--r2", "DECKS", "--kv", "APPLICANTS", "--binding", "SHEET_KEY=local-development",
    "--binding", "APPLICATION_ADMIN_SECRET=local-development", "--binding", "APPLICATION_SYNC_URL=",
    "--binding", "APPLICATION_SYNC_SECRET=", "--binding", "DECK_LINK_SECRET=",
    "--binding", "SESSION_SECRET=local-development", "--binding", "MAIL_URL=", "--binding", "MAIL_SECRET=",
    "--show-interactive-dev-session=false",
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
    try {
      const response = await fetch(`${apiOrigin}/api/admin/export`, { signal: AbortSignal.timeout(500) });
      if (response.status === 401) { ready = true; break; }
    } catch { /* Wrangler is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready && !stopping) throw new Error("Local Cloudflare API did not start");
  if (ready && !stopping) {
    console.log(`Local application API ready at ${apiOrigin} (local R2 and KV).`);
    if (!process.argv.includes("--api-only")) {
      start("node_modules/next/dist/bin/next", ["dev", ...process.argv.slice(2)], { ...process.env, GSC_LOCAL_API_ORIGIN: apiOrigin });
    }
  }
} catch (error) { console.error(error.message); stop(1); }
