import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { fail, json, readJson } from "@/lib/server/http";
import { cleanFields } from "@/lib/server/application";

export const dynamic = "force-dynamic";

// Load the signed-in candidate's application.
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Not signed in.", 401);
  const q = await db();
  const [row] = await q<{ data: Record<string, unknown>; status: string; submitted_at: Date | null }>(
    "select data, status, submitted_at from applications where user_id = $1",
    [user.id],
  );
  return json({ ok: true, data: row?.data ?? {}, status: row?.status ?? "draft", submittedAt: row?.submitted_at ?? null });
}

// Save a draft.
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Not signed in.", 401);
  const body = await readJson(req);
  const data = body && cleanFields(body.data);
  if (!data) return fail("Invalid application data.");
  const q = await db();
  const rows = await q(
    `insert into applications (user_id, data) values ($1, $2)
     on conflict (user_id) do update set data = excluded.data, updated_at = now()
     where applications.status = 'draft'
     returning status`,
    [user.id, JSON.stringify(data)],
  );
  if (!rows.length) return fail("This application has already been submitted.", 409);
  return json({ ok: true });
}
