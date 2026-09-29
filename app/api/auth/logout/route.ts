import { destroySession } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return json({ ok: true });
}
