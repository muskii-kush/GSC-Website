// GET /api/application: the signed-in founder's own submitted application, read-only.
import { applicationKey, reply } from "../../_lib/applications";
import { reference } from "../../_lib/confirmation";
import { sessionPhone, submittedFor } from "../../_lib/session";

export async function onRequestGet({ request, env }) {
  const phone = await sessionPhone(request, env);
  if (!phone) return reply(false, "signed-out", "Verify your mobile number to see your application.", 401);
  const done = await submittedFor(phone, env);
  const object = done && await env.DECKS.get(applicationKey(done.applicationId));
  if (!object) return reply(false, "not-found", "There is no application from this mobile number yet.", 404);
  const app = await object.json();
  return reply(true, "ok", "Your application.", 200, {
    application: {
      reference: reference(app.applicationId), submittedAt: app.submittedAt, company: app.company, email: app.email,
      answers: app.answers.map(({ title, value }) => ({ title, value })),
      deck: { name: app.deck?.name, size: app.deck?.size },
    },
  });
}

export const onRequest = () => reply(false, "method-not-allowed", "Use GET.", 405);
