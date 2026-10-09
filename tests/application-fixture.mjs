import { randomUUID } from "node:crypto";

export function fixture(pages) {
  const fields = [];
  for (const p of pages) for (const q of p.questions) {
    if (!q.required || q.kind === "file" || q.entry === "emailAddress") continue;
    if (q.kind === "checkbox") { fields.push(...q.choices.map((c) => [q.entry, c])); continue; }
    let value = q.choices?.[0] || `Our team has considered ${q.title.toLowerCase()} and has documented the assumptions with specific customer evidence.`;
    if (q.kind === "email") value = "gsc.diagnostic@cars24.com";
    if (q.kind === "phone") value = "9176578432";
    if (q.kind === "number") value = "0";
    if (q.kind === "url") value = "https://youtu.be/GSCdiagnostic";
    if (q.key?.endsWith(".name")) value = "Diagnostic Founder";
    if (q.key?.endsWith(".linkedin")) value = "https://www.linkedin.com/in/gsc-diagnostic";
    const special = { "entry.1737370904": "GSC Diagnostic Private Limited", "entry.1619968075": "U72900KA2026PTC123456", "entry.1789543938": "Bengaluru, Karnataka", "entry.1411802012": "No", "entry.1845685828": "2", "entry.1208877657": "One founder, full time", "entry.546859427": "12" };
    value = special[q.entry] || value;
    fields.push([q.entry, q.max ? value.slice(0, q.max) : value]);
  }
  return { email: "gsc.diagnostic@cars24.com", submissionId: randomUUID(), fields, deckName: "Diagnostic.pdf" };
}
