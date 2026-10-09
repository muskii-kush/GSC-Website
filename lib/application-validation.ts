import { pages, type Page, type Question } from "./application-questions";
import { E, FOUNDER_CORE, checkEmail, checkField, checkLinkedinProfile, checkPhone, checkRevenue, checkWritten, checkXProfile, type AnswerMap } from "./application-checks";

type Answers = AnswerMap;
const text = (v: Answers[string] | undefined) => typeof v === "string" ? v : "";
const list = (v: Answers[string] | undefined) => Array.isArray(v) ? v : [];
export const BY_KEY: Record<string, string> = Object.fromEntries(pages.flatMap((p) => p.questions).filter((q) => q.key).map((q) => [q.key!, q.entry]));

/** Founder slots 2 to 4: optional, but once started, the core fields are required. */
export function required(q: Question, answers: Answers): boolean {
  if (q.required) return true;
  const m = q.key?.match(/^f([2-4])\.(\w+)$/);
  if (!m || !FOUNDER_CORE.includes(m[2])) return false;
  return FOUNDER_CORE.some((f) => text(answers[BY_KEY[`f${m[1]}.${f}`]]).trim());
}

export function validateAnswer(q: Question, v: Answers[string] | undefined, answers: Answers): string | null {
  if (q.kind === "file") return null; // The caller validates the uploaded PDF.
  if (q.kind === "checkbox") {
    const picked = list(v);
    if (picked.some((x) => !q.choices?.includes(x)) || new Set(picked).size !== picked.length) return "Select valid answers for this question.";
    if (q.required && picked.length < (q.choices?.length ?? 1)) return `Please tick all ${q.choices?.length === 6 ? "six" : q.choices?.length}.`;
    return null;
  }
  const s = text(v).trim();
  if (!s) {
    if (!required(q, answers)) return null;
    return q.required ? "This question needs an answer." : "You have started this founder's details, so this is needed too.";
  }
  if (q.choices && !q.choices.includes(s)) return "Select one of the available answers.";
  if (q.max && s.length > q.max) return `Keep it to ${q.max} characters. You are at ${s.length}.`;
  if (q.kind === "phone") return checkPhone(s);
  if (q.key?.endsWith(".linkedin")) return checkLinkedinProfile(s);
  if (q.key?.endsWith(".x")) return checkXProfile(s);
  if (q.key?.endsWith(".name") && (s.length < 3 || !/^[\p{L} .'-]+$/u.test(s) || !/\s/.test(s))) return "Give the founder's full name, first and last.";
  if (q.kind === "email") return checkEmail(s);
  if (q.kind === "number") return checkRevenue(s);
  const specific = checkField(q.entry, s, answers);
  if (specific) return specific;
  if (q.kind === "url") {
    try {
      const u = new URL(s);
      if (!/^https?:$/.test(u.protocol) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) throw new Error();
    } catch { return "Paste the full link, starting with https://"; }
  }
  // Written answers: no placeholders, keyboard mash or one-word answers.
  if (q.kind === "paragraph" && q.required && q.entry !== E.linkedin && q.entry !== E.family) return checkWritten(s, 30);
  if (q.kind === "paragraph" && q.entry !== E.linkedin && q.entry !== E.family) return checkWritten(s, 5);
  return null;
}

/** Pages the founder actually sees, given their answers so far. */
export function visiblePages(answers: Answers): Page[] {
  const out: Page[] = [];
  let skip = false;
  for (const p of pages) {
    if (p.conditional && skip) { skip = false; continue; }
    skip = p.questions.some((q) => q.skipNext?.includes(text(answers[q.entry])));
    out.push(p);
  }
  return out;
}

