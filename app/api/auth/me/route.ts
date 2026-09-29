import { currentUser } from "@/lib/server/auth";
import { fail, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Not signed in.", 401);
  return json({ ok: true, user: { email: user.email, phone: user.phone } });
}
