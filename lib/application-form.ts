// The Grand Startup Challenge application, mirrored from the live Google Form.
//
// The site shows these questions in its own design and, on submit, posts the
// answers to the Google Form's public formResponse endpoint, so every
// application lands in the same Form and response Sheet.
//
// IMPORTANT: once applications open, do not delete, re-create or add required
// questions in the Google Form. Entry IDs below must match the live form, or
// submissions will be rejected silently. Rewording a title or help text in the
// Form is safe (update it here too so the two stay the same).

export const GOOGLE_FORM_ID = "1FAIpQLSe7uI5-KB-8DN-TtK8S6fjeqLjCn8rH62kORvhx2F8sC84rUg";
export const GOOGLE_FORM_ACTION = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;
// The real Form, for the file-upload questions this site can't submit headlessly (see deck/video below).
export const GOOGLE_FORM_VIEW_URL = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/viewform`;
/** The receiver: the Cloudflare Pages Function in functions/api/apply.js, on the same domain as the site. */
export const SUBMIT_URL = process.env.NEXT_PUBLIC_SUBMIT_URL || "/api/apply";
export const MAX_DECK_BYTES = 50 * 1024 * 1024;

export type Question = {
  entry: string; // "emailAddress" for the Form's own email collection, otherwise "entry.<id>"
  /** Stable name for questions with extra rules (founder slots, phone), independent of the entry ID. */
  key?: string;
  kind: "email" | "phone" | "text" | "paragraph" | "radio" | "checkbox" | "number" | "url" | "file";
  title: string;
  help?: string;
  required: boolean;
  choices?: string[];
  max?: number; // character limit
  /** Radio answers that end the application (eligibility knock-outs). */
  stop?: string[];
  /** Radio answers that skip the next page (traction numbers). */
  skipNext?: string[];
};

/** Placeholder for a question not yet linked to the live Google Form. Submissions are blocked while any remain. */
export const PENDING = "entry.PENDING";

// Founder fields, added to the Google Form by gsc_form_update_founders.gs on 30 September 2026.
const FIELDS = ["name", "role", "email", "phone", "linkedin", "x", "other"];
const FOUNDER_ENTRIES: Record<number, string[]> = {
  1: ["804618715", "445020538", "222700076", "1429347995", "2129909620", "1312216597", "1314179020"],
  2: ["1815689355", "1522860354", "1573821631", "1809312339", "544335187", "628550206", "1139343165"],
  3: ["1177582331", "1475358766", "1914304864", "1561258792", "1864494021", "1400465742", "997584179"],
  4: ["1974943108", "51170582", "97116706", "1096269927", "617726274", "1193038485", "1233642783"],
};

export type Page = {
  /** Section index in the Google Form, used for pageHistory on submit. */
  section: number;
  title: string;
  help?: string;
  questions: Question[];
  /** Only shown when the previous page's skipNext answer was not chosen. */
  conditional?: boolean;
  /** A short section header shown before a group of questions. */
  groups?: { before: string; title: string; help?: string }[]; // before: a question key, or its entry
  /** The founders page: slots after the first are optional, but all-or-nothing. */
  founders?: boolean;
};

const para = (entry: string, title: string, help: string, max?: number, required = true): Question => ({
  entry: `entry.${entry}`,
  kind: "paragraph",
  title,
  help,
  required,
  max,
});

export const INELIGIBLE = {
  title: "This edition is not for you",
  text:
    "Based on that answer you fall outside the eligibility rules for the 2027 edition. Nothing here reflects on your company. The rules exist so the cohort stays comparable and so the prize money has an entity to be paid to. If your situation changes before applications close, come back and start a fresh application.",
};

export const pages: Page[] = [
  {
    section: 0,
    title: "Eligibility, 1 of 4",
    questions: [
      { entry: "emailAddress", kind: "email", title: "Email", help: "We send every update about your application to this address.", required: true },
      { entry: "entry.893177443", key: "phone", kind: "phone", title: "Mobile number", help: "Your Indian mobile number. We use it only for this application.", required: true },
      {
        entry: "entry.479936674",
        kind: "radio",
        title: "Is your company incorporated in India?",
        help: "You need a registered entity with a CIN or LLPIN on the day you apply.",
        required: true,
        choices: ["Yes, as a private limited company", "Yes, as an LLP", "Not yet", "We are incorporated outside India"],
        stop: ["Not yet", "We are incorporated outside India"],
      },
    ],
  },
  {
    section: 1,
    title: "Eligibility, 2 of 4",
    questions: [
      {
        entry: "entry.724049969",
        kind: "radio",
        title: "How much equity funding have you raised in total?",
        required: true,
        choices: [
          "Nothing, we are bootstrapped",
          "Under 5 crore rupees",
          "5 crore to 50 crore rupees",
          "Over 50 crore rupees, or we have raised past Series A",
        ],
        stop: ["Over 50 crore rupees, or we have raised past Series A"],
      },
    ],
  },
  {
    section: 2,
    title: "Eligibility, 3 of 4",
    questions: [
      {
        entry: "entry.772380763",
        kind: "radio",
        title: "Is at least one founder working on this full time?",
        help: "Full time means this and nothing else.",
        required: true,
        choices: ["Yes", "No, everyone is part time for now"],
        stop: ["No, everyone is part time for now"],
      },
    ],
  },
  {
    section: 3,
    title: "Eligibility, 4 of 4",
    questions: [
      {
        entry: "entry.1744486454",
        kind: "radio",
        title: "Is any founder a current Cars24 employee?",
        help: "Family working at Cars24 is fine and does not disqualify anyone. We ask about that separately.",
        required: true,
        choices: ["No", "Yes"],
        stop: ["Yes"],
      },
    ],
  },
  {
    section: 4,
    title: "The company",
    help: "Nine quick fields, then the writing starts.",
    questions: [
      {
        entry: "entry.1532659170",
        kind: "radio",
        title: "Which track are you applying to?",
        help: "One track only. You cannot apply to 2, and a second application under another name is withdrawn from both.",
        required: true,
        choices: ["Fintech and Lending", "Mobility and Road Safety", "Logistics, Fleet and Supply Chain", "Sovereign AI"],
      },
      { entry: "entry.1737370904", kind: "text", title: "Company name", help: "Exactly as registered.", required: true },
      {
        entry: "entry.1619968075",
        kind: "text",
        title: "Registration number (CIN for a company, LLPIN for an LLP)",
        help: "Exactly as it appears on the MCA portal. We check it automatically, so a typo will come back to you.",
        required: true,
      },
      {
        entry: "entry.1031180238",
        kind: "text",
        title: "DPIIT recognition number",
        help: "Leave blank if you are not recognised. It is not a requirement to apply.",
        required: false,
      },
      { entry: "entry.1789543938", kind: "text", title: "Which city and state do you operate from?", required: true },
      {
        entry: "entry.543338922",
        kind: "text",
        title: "Website or product link",
        help: "Include login details if it is not public. Leave blank if you do not have one.",
        required: false,
      },
      {
        entry: "entry.1620260486",
        kind: "text",
        title: "Describe your company in a single sentence",
        help: "Plain and specific: what you offer and to whom. No adjectives or mission statements. 140 characters.",
        required: true,
        max: 140,
      },
      {
        entry: "entry.1249600974",
        kind: "radio",
        title: "Which of these best describes your revenue model?",
        help: "This decides which numbers the jury reads on your traction score. A lending book and a software subscription are not comparable on the same metrics.",
        required: true,
        choices: [
          "Software subscription, sold to businesses",
          "Marketplace or commission on a transaction",
          "Lending, or anything on your own balance sheet",
          "API or usage priced infrastructure",
          "Consumer subscription or consumer app",
          "Hardware or a physical device",
          "Services or implementation led",
          "Not selling anything yet",
        ],
      },
      para(
        "1411802012",
        "Does any founder have immediate family working at Cars24?",
        "Write \"No\" if not. If yes, name the founder and the Cars24 employee. It does not count against you, and we ask only so that it is on record before scoring starts.",
      ),
    ],
  },
  {
    section: 5,
    title: "The founders",
    help: "Founder 1 is you, the person applying. Add every co-founder. Leave the extra slots blank if there are fewer of you.",
    founders: true,
    groups: [2, 3, 4].map((n) => ({
      before: `f${n}.name`,
      title: `Founder ${n}`,
      help: `Leave blank if there is no founder ${n}. If you add a name, add their email, mobile and LinkedIn too.`,
    })),
    questions: [1, 2, 3, 4].flatMap((n): Question[] => {
      const req = n === 1;
      const e = (f: string) => `entry.${FOUNDER_ENTRIES[n][FIELDS.indexOf(f)]}`;
      return ([
        { entry: e("name"), kind: "text", title: `Founder ${n}: full name`, required: req },
        { entry: e("role"), kind: "text", title: `Founder ${n}: role`, help: "For example CEO, CTO or COO.", required: req },
        { entry: e("email"), kind: "email", title: `Founder ${n}: email`, required: req },
        { entry: e("phone"), kind: "phone", title: `Founder ${n}: mobile number`, required: req },
        { entry: e("linkedin"), kind: "url", title: `Founder ${n}: LinkedIn profile`, required: req },
        { entry: e("x"), kind: "url", title: `Founder ${n}: X (Twitter) profile`, help: "Optional.", required: false },
        { entry: e("other"), kind: "url", title: `Founder ${n}: other profile or website`, help: "Optional. GitHub, a personal site, or anything that shows their work.", required: false },
      ] as Question[]).map((q, i) => ({ ...q, key: `f${n}.${FIELDS[i]}` }));
    }),
  },
  {
    section: 6,
    title: "The team",
    help: "This whole section feeds one criterion, so a reviewer reads it in a single pass.",
    questions: [
      {
        entry: "entry.1845685828",
        kind: "text",
        title: "How many people are in the company in total, including founders?",
        help: "Full time equivalents. Count a half time person as a half.",
        required: true,
      },
      {
        entry: "entry.1208877657",
        kind: "text",
        title: "How many founders are there, and how many are full time on this?",
        help: "Eg: \"Two founders, both full time\" is a complete answer.",
        required: true,
      },
      para(
        "686651630",
        "What does each founder own, and what relevant experience do they bring?",
        "One founder per line, in the same order as the founder details. Make it clear who owns what; if two of you share a responsibility, say so. 900 characters.",
        900,
      ),
      para(
        "1761956782",
        "How did the founding team come together, and has anyone left the founding team since?",
        "How long you have worked together and in what context. A founder leaving is common and does not disqualify you; finding out later is the problem. 500 characters.",
        500,
      ),
      para(
        "2121230957",
        "Who builds the product, and does the company own all of the code and IP?",
        "Founders, employees, contractors or an agency. Outside help is fine as long as the company owns what was built. Say how the IP is held. 500 characters.",
        500,
      ),
      para(
        "1214801979",
        "What does your cap table look like today?",
        "Every shareholder with their role and percentage, including any ESOP pool, one per line. Then each investor with the amount and date, and whether founder shares vest. We are checking that ownership is clear, not judging the split. 700 characters.",
        700,
      ),
      {
        entry: "entry.546859427",
        kind: "text",
        title: "How many months can you operate at your current spend?",
        help: "Cash in the bank divided by monthly spend. If you are bootstrapped with no burn, write \"bootstrapped, no burn\".",
        required: true,
      },
    ],
  },
  {
    section: 7,
    title: "The problem and the market",
    help: "Numbers with assumptions attached beat adjectives, every time.",
    questions: [
      para(
        "762666439",
        "What problem are you solving?",
        "Write it in 1-2 sentences.",
        300,
      ),
      para(
        "1765861708",
        "Which customers face this problem, what does it cost them, and how do they handle it today?",
        "Name the kind of customer and attach a number, in rupees, hours or incidents. Then say what they use instead today, even if the answer is a spreadsheet and three people. A customer already paying for a worse fix is the strongest thing you can show here. 900 characters.",
        900,
      ),
      para(
        "298084210",
        "Who else is solving this problem, and what do you understand that they have missed?",
        "Cover the large incumbents, the manual way it is done today, and other startups in the space. Saying there is no competition is read as not having looked. 700 characters.",
        700,
      ),
      para(
        "42365432",
        "What is your revenue model, and how large could your revenue become?",
        "One line on how revenue comes in. Then size the opportunity: the customers you could reach multiplied by what each pays in a year, with the working shown. A smaller figure you can defend scores higher than a large one taken from an industry report. 700 characters.",
        700,
      ),
    ],
  },
  {
    section: 8,
    title: "The product",
    help: "What exists today, not what is planned. Be exact about the difference.",
    questions: [
      {
        entry: "entry.961952633",
        kind: "radio",
        title: "What stage is the product at?",
        help: "Pick the one that is true today, not the one you will reach next month.",
        required: true,
        choices: [
          "An idea. We have a document, a design or a plan, and nothing running.",
          "A prototype. It runs, but only on examples we choose, and nobody outside the team has used it.",
          "Live. People outside our team use it in their own work, paid or unpaid, and it breaks sometimes.",
          "In production. Customers depend on it daily, it runs without us watching it, and there is a way for them to report a problem and get it fixed.",
        ],
      },
      para(
        "809701139",
        "Who are your customers?",
        "Name them. If you cannot name them publicly, describe them precisely enough that we could recognise one. If nobody is using it yet, say who you are building it for. 600 characters.",
        600,
      ),
      para(
        "1358175644",
        "What tech stack are you using, or planning to use, to build this product? Include the AI models and AI coding tools you use.",
        "Languages, infrastructure, databases, the models you call or host, and what you build with day to day. Naming a model provider is not a weakness, and pretending you trained your own is the kind of thing that gets checked. 700 characters.",
        700,
      ),
      para(
        "1575861891",
        "Is there a number you can put on how well it works?",
        "Accuracy, error rate, time saved, latency, measured against whatever it replaces, and on data you did not train on. If you have not measured it yet, say that rather than guessing. 500 characters.",
        500,
        false,
      ),
      {
        entry: "entry.356505945",
        kind: "url",
        title: "Product demo link (highly encouraged)",
        help: "A 60 to 90 second screen recording is enough. This is separate from the founder video, and the two are read differently.",
        required: false,
      },
    ],
  },
  {
    section: 9,
    title: "Traction",
    questions: [
      {
        entry: "entry.870262506",
        kind: "radio",
        title: "Does anyone outside your team use the product today?",
        help: "Paying or not.",
        required: true,
        choices: ["Yes", "No, not yet"],
        skipNext: ["No, not yet"],
      },
    ],
  },
  {
    section: 10,
    title: "Traction, the numbers",
    help: "Facts only. A number you cannot defend is worse here than no number at all.",
    conditional: true,
    groups: [
      {
        before: "entry.57854905",
        title: "Revenue, month by month",
        help: "The money that arrived in that month, not the running total, and not the value of what you sold if you have not been paid yet. Enter 0 for a month with none. Rupees.",
      },
    ],
    questions: [
      para(
        "874287481",
        "How many customers or active users do you have, how many pay, and who is your largest customer?",
        "Three numbers and a name. Mention any renewals, or customers who have increased what they spend. 600 characters.",
        600,
      ),
      ...[
        ["57854905", "Most recent completed month"],
        ["303321089", "One month before that"],
        ["358012458", "Two months before that"],
        ["1627869305", "Three months before that"],
        ["79930385", "Four months before that"],
        ["1383712935", "Five months before that"],
      ].map(([id, m]): Question => ({ entry: `entry.${id}`, kind: "number", title: `Revenue: ${m}`, required: true })),
      para(
        "1244579734",
        "How do customers find you, and what does it cost to acquire one?",
        "The channels that work, then your acquisition cost if you can calculate it: total sales and marketing spend divided by customers won. Say so if you have never run a paid channel. 500 characters.",
        500,
      ),
      para(
        "342493612",
        "What is the average annual revenue per customer, and how long does a typical customer stay?",
        "Two numbers. We work out lifetime value from these ourselves. 400 characters.",
        400,
      ),
      para(
        "872975311",
        "Which engagement and retention figures do you track, and what are they today?",
        "Up to three engagement figures with their values, such as daily or monthly active users, or transactions per customer per month. Then retention: of the customers you had three months ago, how many remain. \"We do not track this yet\" is an acceptable answer. 500 characters.",
        500,
      ),
      para(
        "488733686",
        "Name a customer who would take a reference call",
        "Name, role, company and email. We only call if you reach the shortlist, and we tell you before we do. This is the single thing that separates a 4 from a 5 on traction. 300 characters.",
        300,
        false,
      ),
    ],
  },
  {
    section: 11,
    title: "Scalability and unit cost",
    help: "If you have never worked these out, this is the section to work them out for.",
    questions: [
      para(
        "2014499561",
        "What does it cost you to serve one customer or one transaction today, and which way is that number moving?",
        "An honest estimate with your assumptions written out beats a confident number you cannot defend. 600 characters.",
        600,
      ),
      para(
        "71524987",
        "Three numbers about how this scales",
        "One, what share of your transactions needs a person to touch it today, and your plan to cut that. Two, the largest volume you have handled in a single month. Three, your gross margin. If a number is zero or unknown, write that. 600 characters.",
        600,
      ),
      para(
        "1271885041",
        "If your volume grew tenfold next quarter, what would break first?",
        "Name the bottleneck and what you would do about it. Naming one is a good sign; \"nothing\" is not. 400 characters.",
        400,
      ),
    ],
  },
  {
    section: 12,
    title: "Materials and declaration",
    questions: [
      {
        // The deck is uploaded on the site and stored in R2 by functions/api/apply.js, which
        // writes the deck's link into the Form's "Pitch deck link" question (entry.1771685276).
        entry: "deck",
        key: "deck",
        kind: "file",
        title: "Pitch deck",
        help: "Upload your deck as a PDF, up to 50MB. We keep the copy you submit, so it cannot change after you apply.",
        required: true,
      },
      {
        entry: "entry.2085184104",
        kind: "url",
        title: "2-5 minute video of the founders",
        help: "All of you if there is more than one founder, or just you if you are on your own. Introduce yourselves, say what you are building and why, and stop. Not a demo, not a pitch, and not read off a script. A phone camera is perfectly good. Paste a YouTube, Google Drive or Loom link, and make sure anyone with the link can view it.",
        required: true,
      },
      {
        entry: "entry.1620737390",
        kind: "radio",
        title: "How did you hear about the Grand Startup Challenge?",
        required: true,
        choices: [
          "Startup India or DPIIT",
          "My incubator or my college",
          "An investor",
          "LinkedIn or social media",
          "Press coverage",
          "A friend or another founder",
          "Somewhere else",
        ],
      },
      para("297583745", "Is there anything else the selection committee should know?", "Optional. 500 characters.", 500, false),
      {
        entry: "entry.1335098423",
        kind: "checkbox",
        title: "Declaration",
        help: "All six are required.",
        required: true,
        choices: [
          "Every figure in this application is true and I can evidence it if asked",
          "I have read how applications are scored",
          "I understand that misstating or withholding information disqualifies the application, including after selection",
          "I agree to the privacy policy and the terms",
          "I understand the team may contact me for clarification, and that being contacted does not mean the application has been selected",
          "I understand that for shortlisted startups the team may review the founders\u2019 public profiles as part of due diligence",
        ],
      },
    ],
  },
];
