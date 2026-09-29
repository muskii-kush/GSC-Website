import "server-only";

// Application field rules, generated from the form in lib/registration-markup.ts.
const FIELDS: { name: string; required: boolean; checkbox: boolean }[] = [
  { name: "email", required: true, checkbox: false },
  { name: "incorporated", required: true, checkbox: false },
  { name: "funding", required: true, checkbox: false },
  { name: "fulltime", required: true, checkbox: false },
  { name: "cars24employee", required: true, checkbox: false },
  { name: "track", required: true, checkbox: false },
  { name: "company", required: true, checkbox: false },
  { name: "registration", required: true, checkbox: false },
  { name: "dpiit", required: false, checkbox: false },
  { name: "location", required: true, checkbox: false },
  { name: "website", required: false, checkbox: false },
  { name: "company_summary", required: true, checkbox: false },
  { name: "revenue_model", required: true, checkbox: false },
  { name: "family_cars24", required: true, checkbox: false },
  { name: "team_size", required: true, checkbox: false },
  { name: "founder_count", required: true, checkbox: false },
  { name: "founders", required: true, checkbox: false },
  { name: "linkedin", required: true, checkbox: false },
  { name: "founder_history", required: true, checkbox: false },
  { name: "technical_ownership", required: true, checkbox: false },
  { name: "equity", required: true, checkbox: false },
  { name: "runway", required: true, checkbox: false },
  { name: "problem", required: true, checkbox: false },
  { name: "competition", required: true, checkbox: false },
  { name: "market", required: true, checkbox: false },
  { name: "product_stage", required: true, checkbox: false },
  { name: "customers", required: true, checkbox: false },
  { name: "tech_stack", required: true, checkbox: false },
  { name: "performance", required: false, checkbox: false },
  { name: "demo", required: false, checkbox: false },
  { name: "using_product", required: true, checkbox: false },
  { name: "users", required: true, checkbox: false },
  { name: "revenue_1", required: true, checkbox: false },
  { name: "revenue_2", required: true, checkbox: false },
  { name: "revenue_3", required: true, checkbox: false },
  { name: "revenue_4", required: true, checkbox: false },
  { name: "revenue_5", required: true, checkbox: false },
  { name: "revenue_6", required: true, checkbox: false },
  { name: "acquisition", required: true, checkbox: false },
  { name: "customer_value", required: true, checkbox: false },
  { name: "retention", required: true, checkbox: false },
  { name: "reference", required: true, checkbox: false },
  { name: "unit_cost", required: true, checkbox: false },
  { name: "scale_numbers", required: true, checkbox: false },
  { name: "bottleneck", required: true, checkbox: false },
  { name: "deck", required: true, checkbox: false },
  { name: "founder_video", required: true, checkbox: false },
  { name: "source", required: true, checkbox: false },
  { name: "anything_else", required: false, checkbox: false },
  { name: "declaration_1", required: true, checkbox: true },
  { name: "declaration_2", required: true, checkbox: true },
  { name: "declaration_3", required: true, checkbox: true },
  { name: "declaration_4", required: true, checkbox: true },
];

const MAX_VALUE_LENGTH = 5000;

// Keep only known fields, coerce types and cap lengths.
export function cleanFields(input: unknown): Record<string, string | boolean> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const src = input as Record<string, unknown>;
  const out: Record<string, string | boolean> = {};
  for (const f of FIELDS) {
    const v = src[f.name];
    if (v === undefined || v === null) continue;
    out[f.name] = f.checkbox ? v === true || v === "true" : String(v).slice(0, MAX_VALUE_LENGTH);
  }
  return out;
}

export function missingRequired(data: Record<string, string | boolean>): string[] {
  return FIELDS.filter((f) => f.required && (f.checkbox ? data[f.name] !== true : !String(data[f.name] ?? "").trim())).map((f) => f.name);
}
