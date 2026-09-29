import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { fail, json, readJson } from "@/lib/server/http";
import { cleanFields, missingRequired } from "@/lib/server/application";

export const dynamic = "force-dynamic";

// Final submission. Locks the application.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Not signed in.", 401);
  const body = await readJson(req);
  const data = body && cleanFields(body.data);
  if (!data) return fail("Invalid application data.");
  const missing = missingRequired(data);
  if (missing.length) return fail(`Some required answers are missing: ${missing.join(", ")}.`, 422);

  const q = await db();
  const rows = await q(
    `insert into applications (user_id, data, status, submitted_at) values ($1, $2, 'submitted', now())
     on conflict (user_id) do update set data = excluded.data, status = 'submitted', submitted_at = now(), updated_at = now()
     where applications.status = 'draft'
     returning submitted_at`,
    [user.id, JSON.stringify(data)],
  );
  if (!rows.length) return fail("This application has already been submitted.", 409);
  return json({ ok: true, submittedAt: rows[0].submitted_at });
}
