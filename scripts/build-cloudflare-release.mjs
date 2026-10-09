import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const handoff = join(root, "IT-handoff"), ready = join(handoff, "GSC-Website-deploy-ready"), source = join(handoff, "GSC-Website-source");
const stage = await mkdtemp(join(tmpdir(), "gsc-release-"));
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { cwd: root, stdio: "inherit", ...options });
try {
  for (const name of ["components", "lib", "public", "package.json", "package-lock.json", "tsconfig.json", "next.config.mjs", "next-env.d.ts"]) await cp(join(root, name), join(stage, name), { recursive: true });
  await cp(join(root, "app"), join(stage, "app"), { recursive: true, filter: (path) => path !== join(root, "app", "api") });
  await symlink(join(root, "node_modules"), join(stage, "node_modules"), "dir");
  run(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "build"], { cwd: stage, env: { ...process.env, STATIC_EXPORT: "true", NEXT_PUBLIC_STATIC_SITE: "true", NEXT_PUBLIC_BASE_PATH: "", NEXT_PUBLIC_SUBMIT_URL: "/api/apply" } });
  await mkdir(handoff, { recursive: true });
  await rm(ready, { recursive: true, force: true });
  await mkdir(ready);
  await cp(join(stage, "out"), join(ready, "out"), { recursive: true });
  const bundle = join(stage, "functions-bundle");
  run(process.execPath, [join(root, "node_modules/wrangler/bin/wrangler.js"), "pages", "functions", "build", "functions", "--outdir", bundle, "--compatibility-date", "2026-10-09", "--minify"]);
  await cp(join(bundle, "index.js"), join(ready, "out/_worker.js"));
  run(process.execPath, ["--check", join(ready, "out/_worker.js")]);
  if (!(await readFile(join(ready, "out/_worker.js"), "utf8")).includes("/api/admin/export")) throw new Error("Release is missing the existing Google Sheet CSV route");
  await writeFile(join(ready, "out/_routes.json"), JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }, null, 2));
  for (const name of ["functions", "lib", "docs", "scripts", "package.json", "package-lock.json"]) await cp(join(root, name), join(ready, name), { recursive: true });
  await writeFile(join(ready, "README-DEPLOY.txt"), "SHEET RESTORATION RELEASE\n\nDeploy from this directory to the existing gsc.cars24.com project:\n  npx wrangler login\n  npx wrangler pages deploy out --project-name <existing-project-name> --branch <production-branch>\n\nPreserve DECKS, SHEET_KEY, APPLICANTS and DECK_LINK_SECRET.\nThis release restores /api/admin/export?key=<existing SHEET_KEY>.\nThe original GSC 2027 Applications / Sheet1 imports that CSV.\nAll existing R2 applications are included automatically. No new Google credentials or replay are required.\nAfter deployment, refresh Sheet1 A1 by adding &v=20261009 to its existing import URL while preserving the key.\nSee docs/DEPLOY-CLOUDFLARE.md for verification steps.\n");
  await rm(source, { recursive: true, force: true });
  await mkdir(source);
  for (const name of ["app", "components", "lib", "public", "functions", "docs", "scripts", "tests", ".github", "package.json", "package-lock.json", "tsconfig.json", "next.config.mjs", "next-env.d.ts", "README.md", ".env.example", ".gitignore"]) {
    await cp(join(root, name), join(source, name), { recursive: true, filter: (path) => !/\/\.env(?:\.|$)/.test(path) || path.endsWith("/.env.example") });
  }
  for (const name of ["GSC-Website-deploy-ready", "GSC-Website-source"]) {
    const zip = join(handoff, `${name}.zip`);
    await rm(zip, { force: true });
    run("zip", ["-qr", zip, name], { cwd: handoff });
  }
  await cp(join(handoff, "GSC-Website-deploy-ready.zip"), join(handoff, "GSC-Website-sheet-fix.zip"));
  console.log(`Release packages: ${handoff}`);
} finally { await rm(stage, { recursive: true, force: true }); }
