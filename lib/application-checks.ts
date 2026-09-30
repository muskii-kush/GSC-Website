// Field-level checks for the application. Each returns an error message, or
// null when the answer is acceptable. These run in the browser before a page
// can be left and again before submit. They catch typos and obvious junk on
// the spot; they are not a substitute for the checks run on the shortlist.

export type AnswerMap = Record<string, string | string[]>;

export const E = {
  email: "emailAddress",
  incorporated: "entry.479936674",
  track: "entry.1532659170",
  company: "entry.1737370904",
  cin: "entry.1619968075",
  dpiit: "entry.1031180238",
  location: "entry.1789543938",
  website: "entry.543338922",
  oneLiner: "entry.1620260486",
  model: "entry.1249600974",
  family: "entry.1411802012",
  teamSize: "entry.1845685828",
  founderCount: "entry.1208877657",
  founders: "entry.686651630",
  linkedin: "entry.1504140873",
  runway: "entry.546859427",
  demo: "entry.356505945",
  reference: "entry.488733686",
  deck: "entry.1798461330",
  video: "entry.1187041600",
} as const;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// ── Email ────────────────────────────────────────────────────────────────
const DISPOSABLE = new Set([
  "mailinator.com", "10minutemail.com", "10minutemail.net", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
  "yopmail.com", "yopmail.net", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "tempmailo.com",
  "throwawaymail.com", "trashmail.com", "trashmail.net", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc",
  "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com", "moakt.com", "tempr.email", "discard.email",
  "spamgourmet.com", "mailnesia.com", "mytemp.email", "burnermail.io", "inboxkitten.com", "tempinbox.com",
  "33mail.com", "emailfake.com", "fakemail.net", "mailcatch.com", "spambox.us", "getairmail.com", "mail.tm",
  "emltmp.com", "tmpmail.org", "tmpmail.net", "minuteinbox.com", "email-fake.com", "crazymailing.com",
]);
const FAKE_DOMAINS = /(^|\.)(example\.(com|org|net)|test\.com|domain\.com|email\.com|abc\.com|xyz\.com|asdf\.com)$/;
const TYPO_DOMAINS: Record<string, string> = {
  "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com",
  "gmail.in": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "outlok.com": "outlook.com", "outlook.co": "outlook.com",
};

export function checkEmail(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!/^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(s) || s.includes("..") || /^[.]|[.]@/.test(s)) {
    return "Enter a valid email address, like founder@yourcompany.in.";
  }
  const domain = s.split("@")[1];
  if (TYPO_DOMAINS[domain]) return `Did you mean ${s.split("@")[0]}@${TYPO_DOMAINS[domain]}?`;
  if (DISPOSABLE.has(domain) || /(^|\.)(temp|throwaway|disposable|trash)[a-z-]*mail/.test(domain)) {
    return "Temporary or disposable email addresses cannot be used. Use an address you will check until January.";
  }
  if (FAKE_DOMAINS.test(domain) || /\.(test|example|invalid|localhost|local)$/.test(domain)) {
    return "That looks like a placeholder address. Use a real email you check.";
  }
  if (/^(test|testing|asdf|abc|xyz|fake|dummy|none|na|null|sample)\d*@/.test(s)) {
    return "That looks like a placeholder address. Use a real email you check.";
  }
  return null;
}

// ── CIN / LLPIN ──────────────────────────────────────────────────────────
// CIN: L/U + 5-digit industry code + 2-letter state + year + 3-letter type + 6-digit number, 21 characters.
// LLPIN: three letters, a hyphen and four digits, e.g. AAB-1234.
const CIN_RE = /^([LU])(\d{5})([A-Z]{2})(\d{4})([A-Z]{3})(\d{6})$/;
const LLPIN_RE = /^[A-Z]{3}-\d{4}$/;
const STATE_CODES = new Set([
  "AN", "AP", "AR", "AS", "BR", "CH", "CT", "CG", "DD", "DL", "DN", "GA", "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA",
  "LD", "MH", "ML", "MN", "MP", "MZ", "NL", "OR", "OD", "PB", "PY", "RJ", "SK", "TG", "TS", "TN", "TR", "UP", "UR", "UK", "WB",
]);
const PRIVATE_TYPES = new Set(["PTC", "OPC", "FTC"]);
const ALL_TYPES = new Set(["PTC", "OPC", "FTC", "PLC", "FLC", "GOI", "SGC", "GAP", "GAT", "NPL", "ULL", "ULT"]);

export const normaliseRegNo = (raw: string) => raw.toUpperCase().replace(/\s+/g, "").replace(/[‐–—]/g, "-");

export function checkRegNo(raw: string, incorporated: string): string | null {
  const s = normaliseRegNo(raw);
  const isLLP = incorporated === "Yes, as an LLP";
  if (isLLP) {
    if (LLPIN_RE.test(s)) return null;
    if (CIN_RE.test(s)) return "You said you are an LLP, but this is a company CIN. Enter your LLPIN (for example AAB-1234), or go back and change your answer.";
    return "An LLPIN is three letters, a hyphen and four digits, for example AAB-1234. Copy it from the MCA portal.";
  }
  if (LLPIN_RE.test(s)) return "This is an LLPIN, but you said you are a private limited company. Enter your 21-character CIN, or go back and change your answer.";
  if (s.length !== 21) return `A CIN is exactly 21 characters. This one has ${s.length}. Copy it from your certificate of incorporation or the MCA portal.`;
  const m = CIN_RE.exec(s);
  if (!m) return "That is not a valid CIN. It should look like U72900KA2021PTC123456: a letter, 5 digits, 2 letters, 4 digits, 3 letters, 6 digits.";
  const [, , , state, year, type] = m;
  if (!STATE_CODES.has(state)) return `“${state}” is not an Indian state code. Check characters 7 and 8 of your CIN.`;
  const y = Number(year);
  if (y < 1900 || y > new Date().getFullYear()) return `The year in this CIN (${year}) is not possible. Check characters 9 to 12.`;
  if (!ALL_TYPES.has(type)) return `“${type}” is not a company type used in a CIN. Check characters 13 to 15.`;
  if (!PRIVATE_TYPES.has(type)) return `This CIN is for a ${type} company, not a private limited company. Only private limited companies and LLPs can apply.`;
  return null;
}

// ── DPIIT recognition number ────────────────────────────────────────────
export function checkDpiit(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!s) return null;
  if (/^(NA|N\/A|NONE|NIL|NO|-)$/.test(s)) return "Leave this blank if you are not recognised.";
  if (!/^DIPP\d{3,7}$/.test(s)) return "A DPIIT recognition number looks like DIPP12345. Leave it blank if you are not recognised.";
  return null;
}

// ── City and state ──────────────────────────────────────────────────────
const STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", "haryana", "himachal pradesh",
  "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha",
  "orissa", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand", "uttaranchal",
  "west bengal", "andaman and nicobar", "chandigarh", "dadra and nagar haveli", "daman and diu", "delhi", "new delhi", "ncr",
  "jammu and kashmir", "jammu & kashmir", "ladakh", "lakshadweep", "puducherry", "pondicherry",
  " ap", " up", " mp", " tn", " ka", " mh", " hr", " dl", " wb", " gj", " rj", " ts", " tg", " kl", " pb", " uk",
];
export function checkLocation(raw: string): string | null {
  const s = ` ${raw.trim().toLowerCase().replace(/[.,/|-]+/g, " ").replace(/\s+/g, " ")} `;
  if (s.trim().length < 4 || !/[a-z]{3}/.test(s)) return "Give the city and the state, for example Bengaluru, Karnataka.";
  if (!STATES.some((st) => s.includes(st.startsWith(" ") ? `${st} ` : st))) return "Add the state as well as the city, for example Pune, Maharashtra.";
  return null;
}

// ── Company name ────────────────────────────────────────────────────────
export function checkCompany(raw: string, incorporated: string): string | null {
  const s = raw.trim();
  if (s.length < 3 || !/[a-z]{2}/i.test(s)) return "Enter the company name exactly as registered.";
  if (incorporated === "Yes, as an LLP" && !/\bLLP\b/i.test(s)) return "A registered LLP name ends in “LLP”. Enter it exactly as it appears on the MCA portal.";
  if (incorporated === "Yes, as a private limited company" && !/(private|pvt\.?)\s*(limited|ltd\.?)\s*$/i.test(s)) {
    return "A registered company name ends in “Private Limited”. Enter it exactly as it appears on your certificate of incorporation.";
  }
  return null;
}

// ── Links ───────────────────────────────────────────────────────────────
function parseUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h)) return null; // no IPs, no localhost
    if (/(^|\.)(example\.(com|org|net)|localhost|test)$/.test(h)) return null;
    return u;
  } catch {
    return null;
  }
}
const host = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, "");

export function checkLink(raw: string): string | null {
  return parseUrl(raw) ? null : "Paste the full link, starting with https://";
}

export function checkDeck(raw: string): string | null {
  const u = parseUrl(raw);
  if (!u) return "Paste the full link to your deck, starting with https://";
  const h = host(u);
  // Drive and Docs files can be swapped after the deadline without the link changing.
  if (/(^|\.)(drive|docs)\.google\.com$/.test(h)) {
    return "Google Drive links are not accepted, because the file behind them can be changed after you apply. Use DocSend, Dropbox or another link to a PDF.";
  }
  return null;
}

const VIDEO_HOSTS = ["youtube.com", "youtu.be", "m.youtube.com", "vimeo.com", "player.vimeo.com", "loom.com"];
export function checkVideo(raw: string): string | null {
  const u = parseUrl(raw);
  if (!u) return "Paste the full link to the video, starting with https://";
  const h = host(u);
  if (!VIDEO_HOSTS.some((v) => h === v || h.endsWith(`.${v}`))) return /(^|\.)(drive|docs)\.google\.com$/.test(h)
      ? "Google Drive links are not accepted, because the file can be changed after you apply. Upload it to YouTube (unlisted is fine), Vimeo or Loom."
      : "Use a YouTube, Vimeo or Loom link. Unlisted is fine.";
  if ((h === "youtube.com" || h === "m.youtube.com") && !/[?&]v=|\/shorts\/|\/live\/|\/embed\//.test(u.href)) {
    return "That is not a link to a single YouTube video. Open the video and copy its link.";
  }
  if (h === "youtu.be" && u.pathname.length < 5) return "That YouTube link is incomplete. Open the video and copy its link.";
  if (h.endsWith("loom.com") && !/\/share\/|\/embed\//.test(u.pathname)) return "Use the Loom share link for the video.";
  return null;
}

export function checkLinkedin(raw: string): string | null {
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const urls = raw.match(/https?:\/\/[^\s,;]+/g) || [];
  if (urls.length === 0) return "Add a full link for every founder, one per line, starting with https://";
  const bad = urls.find((x) => /linkedin\./i.test(x) && !/^https?:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/in\/[^/\s]{3,}/i.test(x));
  if (bad) return "LinkedIn links should be profile links, like https://www.linkedin.com/in/your-name";
  const broken = urls.find((x) => !parseUrl(x));
  if (broken) return `This link does not look right: ${broken}`;
  if (lines.length > urls.length + 2) return "Give one link per founder, each on its own line.";
  return null;
}

// ── Phone and founder profiles ──────────────────────────────────────────
export const normalisePhone = (raw: string) => raw.replace(/[\s()-]/g, "").replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, "");

export function checkPhone(raw: string): string | null {
  const d = normalisePhone(raw);
  if (!/^\d+$/.test(d)) return "Digits only, for example 98765 43210.";
  if (d.length !== 10) return `An Indian mobile number has 10 digits. This one has ${d.length}.`;
  if (!/^[6-9]/.test(d)) return "Indian mobile numbers start with 6, 7, 8 or 9.";
  if (/^(\d)\1{9}$/.test(d) || ["9876543210", "9123456789", "9012345678", "8888888888"].includes(d) || /^[6-9]0{9}$/.test(d)) {
    return "That looks like a placeholder number. Enter a real mobile number.";
  }
  return null;
}

export function checkLinkedinProfile(raw: string): string | null {
  const s = raw.trim();
  if (!/^https?:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/in\/[^/\s?#]{3,}/i.test(s)) {
    return "A LinkedIn profile link, like https://www.linkedin.com/in/your-name";
  }
  return null;
}

export function checkXProfile(raw: string): string | null {
  const s = raw.trim();
  if (!/^https?:\/\/(www\.)?(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/?(\?.*)?$/i.test(s)) return "An X profile link, like https://x.com/yourhandle";
  if (/\/(home|explore|search|i|intent|share)\/?$/i.test(s)) return "Use the profile link, like https://x.com/yourhandle";
  return null;
}

/** Founder slots 2 to 4 are optional, but a started slot must be complete. */
export const FOUNDER_CORE = ["name", "role", "email", "phone", "linkedin"];

// ── Numbers ─────────────────────────────────────────────────────────────
export function checkRevenue(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return "Whole rupees only, digits with no commas, decimals or symbols. 0 is a valid answer.";
  if (s.length > 1 && s.startsWith("0")) return "Remove the leading zero.";
  if (Number(s) > 5_000_000_000) return "That is more than ₹500 crore in one month. Check the number of zeros.";
  return null;
}

export function checkTeamSize(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, "");
  if (!/^\d{1,4}(\.5)?$/.test(s)) return "A number, for example 6 or 4.5. Count a half-time person as a half.";
  const n = Number(s);
  if (n < 1) return "Count the founders too, so the team is at least 1.";
  if (n > 2000) return "That is larger than an early-stage team. Check the number.";
  return null;
}

export function checkFounderCount(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!/\d|\b(one|two|three|four|five|six|solo|single|sole)\b/.test(s)) return "Say how many founders there are and how many are full time, for example “Two founders, both full time”.";
  return null;
}

export function checkRunway(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!/\d|bootstrap|no burn|profitable|break ?even/.test(s)) return "Give a number of months, or write “bootstrapped, no burn”.";
  return null;
}

export function checkReference(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(s) && !/(\+?91[\s-]?)?[6-9]\d{9}\b/.test(s.replace(/[\s-]/g, ""))) {
    return "Include the reference’s email address or mobile number so we can reach them.";
  }
  const mail = s.match(/[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}/i)?.[0];
  if (mail && checkEmail(mail)) return `The reference email looks wrong: ${checkEmail(mail)}`;
  return null;
}

// ── Written answers ─────────────────────────────────────────────────────
const JUNK = /^(na|n\/a|none|nil|no|nothing|test|testing|asdf+|qwerty|abc|xyz|lorem ipsum.*|\.+|-+|x+|tbd|later|will update)$/i;

/** Rejects placeholder or keyboard-mash answers in required written questions. */
export function checkWritten(raw: string, minChars: number): string | null {
  const s = raw.trim();
  if (JUNK.test(s)) return "Please give a real answer. A short, honest answer is better than a placeholder.";
  if (/(.)\1{6,}/.test(s)) return "This looks like repeated characters. Please give a real answer.";
  if (s.replace(/[^a-z]/gi, "").length < Math.min(minChars, 10)) return "Please give a real answer in words.";
  if (s.length < minChars) return `Please write a little more, at least ${minChars} characters.`;
  const words = s.toLowerCase().split(/\s+/);
  if (words.length >= 6 && new Set(words).size / words.length < 0.3) return "This repeats the same words. Please give a real answer.";
  return null;
}

/** Entries that have their own rule; everything else uses the generic checks. */
export function checkField(entry: string, value: string, answers: AnswerMap): string | null {
  const inc = str(answers[E.incorporated]);
  switch (entry) {
    case E.email: return checkEmail(value);
    case E.cin: return checkRegNo(value, inc);
    case E.dpiit: return checkDpiit(value);
    case E.location: return checkLocation(value);
    case E.company: return checkCompany(value, inc);
    case E.website: return value.trim() ? checkLink(value) : null;
    case E.demo: return value.trim() ? checkLink(value) : null;
    case E.deck: return checkDeck(value);
    case E.video: return checkVideo(value);
    case E.linkedin: return checkLinkedin(value);
    case E.teamSize: return checkTeamSize(value);
    case E.founderCount: return checkFounderCount(value);
    case E.runway: return checkRunway(value);
    case E.reference: return checkReference(value);
    case E.family: return /^no\.?$/i.test(value.trim()) ? null : checkWritten(value, 10);
    case E.oneLiner: return checkWritten(value, 20);
    default: return null;
  }
}

/**
 * Whole-application checks, run before submit: the same text pasted into
 * several questions, or a team size smaller than the number of founders.
 */
export function checkFounders(
  answers: AnswerMap,
  byKey: Record<string, string>,
): { entry: string; message: string } | null {
  const emails = new Map<string, number>();
  const phones = new Map<string, number>();
  const profiles = new Map<string, number>();
  for (let n = 1; n <= 4; n++) {
    const get = (f: string) => str(answers[byKey[`f${n}.${f}`]]);
    if (!get("name")) continue;
    const em = get("email").toLowerCase();
    const ph = normalisePhone(get("phone"));
    const li2 = get("linkedin").toLowerCase().replace(/^https?:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/in\//, "").replace(/[/?#].*$/, "");
    if (em && emails.has(em)) return { entry: byKey[`f${n}.email`], message: `Founder ${emails.get(em)} already uses this email. Each founder needs their own.` };
    if (ph && phones.has(ph)) return { entry: byKey[`f${n}.phone`], message: `Founder ${phones.get(ph)} already uses this number. Each founder needs their own.` };
    if (li2 && profiles.has(li2)) return { entry: byKey[`f${n}.linkedin`], message: `Founder ${profiles.get(li2)} already uses this LinkedIn profile.` };
    if (em) emails.set(em, n);
    if (ph) phones.set(ph, n);
    if (li2) profiles.set(li2, n);
  }
  return null;
}

export function checkApplication(answers: AnswerMap, paragraphEntries: string[]): { entry: string; message: string } | null {
  const seen = new Map<string, string>();
  for (const e of paragraphEntries) {
    const v = str(answers[e]).toLowerCase().replace(/\s+/g, " ");
    if (v.length < 25) continue;
    const prior = seen.get(v);
    if (prior) return { entry: e, message: "This is the same answer as an earlier question. Each question needs its own answer." };
    seen.set(v, e);
  }
  return null;
}

/** Tidy values before they are sent: registration numbers in capitals, emails in lower case. */
export function normalise(entry: string, value: string, key?: string): string {
  if (key === "phone" || key?.endsWith(".phone")) return `+91${normalisePhone(value)}`;
  if (key?.endsWith(".email")) return value.trim().toLowerCase();
  // The Google Form's link rules are case-sensitive: send scheme and host in lower case.
  if (key?.endsWith(".linkedin") || key?.endsWith(".x") || key?.endsWith(".other")) {
    return value.trim().replace(/^(https?:\/\/[^/?#]+)/i, (m) => m.toLowerCase());
  }
  if (entry === E.cin) return normaliseRegNo(value);
  if (entry === E.dpiit) return value.trim().toUpperCase().replace(/\s+/g, "");
  if (entry === E.email) return value.trim().toLowerCase();
  return value.trim();
}
