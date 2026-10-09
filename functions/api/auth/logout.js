// Signs the founder out, so the next person on this computer starts from the mobile number screen.
import { reply } from "../../_lib/applications";
import { clearedCookie } from "../../_lib/session";

export async function onRequestPost() {
  const res = reply(true, "ok", "Signed out.");
  res.headers.append("set-cookie", clearedCookie);
  return res;
}

export const onRequest = () => reply(false, "method-not-allowed", "Use POST.", 405);
