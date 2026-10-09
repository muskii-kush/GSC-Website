// Confirmation email after an application is recorded. Sent through a small Apps Script
// web app (docs/apps-script/gsc_mailer.gs) running as the GSC Google account, so the email
// comes from the challenge's own address. Without MAIL_URL and MAIL_SECRET nothing is sent.
import { applicationKey } from "./applications";

const CONTACT = "grandstartupchallenge@cars24.com";

/** The short application ID founders see, e.g. GSC27-2A7C9B18. */
export const reference = (applicationId) => `GSC27-${String(applicationId).slice(0, 8).toUpperCase()}`;

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const value = (v) => Array.isArray(v) ? v.join("\n") : String(v ?? "");
const when = (iso) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }) + " IST";

export function confirmationEmail(application) {
  const ref = reference(application.applicationId);
  const answered = application.answers.filter((a) => value(a.value).trim());
  const subject = `Grand Startup Challenge 2027: application received (${ref})`;
  const intro = [
    `Your application to the Grand Startup Challenge 2027 has been received.`,
    ``,
    `Application ID: ${ref}`,
    `Company: ${application.company || ""}`,
    `Submitted: ${when(application.submittedAt)}`,
    ``,
    `Applications are reviewed on a rolling basis. We may contact you for clarification; that does not mean the application has been selected.`,
    `You can see a copy of your answers at https://gsc.cars24.com/#register after verifying the same mobile number.`,
    `Answers cannot be edited once submitted. If something is wrong, reply to this email or write to ${CONTACT} and quote your application ID.`,
  ];
  const text = [...intro, ``, `Your answers`, ``, ...answered.flatMap((a) => [a.title, value(a.value), ``]), `Pitch deck: ${application.deck?.name || ""}`].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#14121c;max-width:640px">
<p>Your application to the <strong>Grand Startup Challenge 2027</strong> has been received.</p>
<table style="border-collapse:collapse;margin:12px 0 18px"><tr><td style="padding:4px 16px 4px 0;color:#666">Application ID</td><td style="padding:4px 0"><strong>${escape(ref)}</strong></td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#666">Company</td><td style="padding:4px 0">${escape(application.company || "")}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#666">Submitted</td><td style="padding:4px 0">${escape(when(application.submittedAt))}</td></tr></table>
<p>Applications are reviewed on a rolling basis. We may contact you for clarification; that does not mean the application has been selected.</p>
<p>You can see a copy of your answers at <a href="https://gsc.cars24.com/#register">gsc.cars24.com</a> after verifying the same mobile number. Answers cannot be edited once submitted. If something is wrong, reply to this email or write to <a href="mailto:${CONTACT}">${CONTACT}</a> and quote your application ID.</p>
<h3 style="margin:28px 0 8px;font-size:16px">Your answers</h3>
${answered.map((a) => `<p style="margin:0 0 14px"><span style="color:#666">${escape(a.title)}</span><br>${escape(value(a.value)).replace(/\n/g, "<br>")}</p>`).join("\n")}
<p style="margin:0 0 14px"><span style="color:#666">Pitch deck</span><br>${escape(application.deck?.name || "")}</p>
</div>`;
  return { to: application.email, subject, text, html, replyTo: CONTACT, name: "Grand Startup Challenge" };
}

/** Sends the email and records the outcome on the application. Never throws: the application is already safe. */
export async function sendConfirmation(application, env) {
  if (!env.MAIL_URL || !env.MAIL_SECRET || !application.email) {
    application.confirmation = { status: "not-sent", reason: "not-configured" };
  } else {
    try {
      const url = new URL(env.MAIL_URL);
      if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw new Error("Invalid mailer URL");
      const response = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: env.MAIL_SECRET, applicationId: application.applicationId, ...confirmationEmail(application) }),
        signal: AbortSignal.timeout(15000), redirect: "follow",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error("Mailer refused");
      application.confirmation = { status: "sent", at: new Date().toISOString() };
    } catch {
      application.confirmation = { status: "not-sent", reason: "mailer-unavailable", attemptedAt: new Date().toISOString() };
      console.error(JSON.stringify({ event: "confirmation-email-failed", applicationId: application.applicationId }));
    }
  }
  try { await env.DECKS.put(applicationKey(application.applicationId), JSON.stringify(application), { httpMetadata: { contentType: "application/json" } }); }
  catch { console.error(JSON.stringify({ event: "confirmation-status-failed", applicationId: application.applicationId })); }
  return application;
}
