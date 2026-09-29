import { asset } from "./asset";
// All copy is carried over from Grand-Startup-Challenge-v5.html.
export const CONTACT = "grandstartupchallenge@cars24.com";
// Opens a Gmail compose window addressed to the team.
export const gmailLink = (subject = "Grand Startup Challenge") =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT)}&su=${encodeURIComponent(subject)}`;
export const APPLICATIONS_OPEN = "2026-10-01T00:00:00+05:30";
// The source gives the deadline as a date; end of day IST is assumed here.
export const APPLICATIONS_CLOSE = "2026-10-31T23:59:59+05:30";

export const hero = {
  statement: "build what moves india forward",
  lede:
    "A four-month startup challenge for early-stage teams building across lending and fintech, mobility and road safety, logistics and supply chain, and sovereign AI.",
  when: "January 2027. New Delhi",
};

export const challenge = {
  title: "about the event",
  // From the GSC 2027 concept note (objective, format and outcomes).
  statement:
    "Cars24’s Grand Startup Challenge puts early-stage startups on real problems, with real deployment, capital, mentorship, investor visibility and national recognition.",
  lede:
    "Over a four-month journey, startups move from applications and shortlisting to a month of immersion and refinement, and a final showcase in New Delhi.",
  metrics: [
    { value: "1,000+", label: "Applications" },
    { value: "₹1 Cr", label: "Prize pool" },
    { value: "4", label: "Problem tracks" },
  ],
};

export const gallery = [
  { src: asset("/media/band-founders.jpg"), alt: "Founders and operators in conversation", caption: "Access to people who can help the work move." },
  { src: asset("/media/band-inspection.jpg"), alt: "Vehicle inspection in a Cars24 environment", caption: "Build in the context where the problem actually lives." },
];

export const journey = {
  title: "the journey",
  lede: "A structured journey from applications and selection to mentorship, refinement and the national showcase.",
  steps: [
    { n: "01", title: "Apply", text: "Submit your deck and a five-minute video before applications close." },
    { n: "02", title: "Shortlist", text: "Startups are selected across four tracks based on the strength of the problem, traction and team." },
    { n: "03", title: "Build", text: "Structured mentorship, solution development and feedback from operators and subject-matter experts." },
    { n: "04", title: "Pitch", text: "Shortlisted startups pitch and demo their solutions at the finale." },
  ],
};

export const timeline = {
  eyebrow: "Key dates",
  title: "what happens when",
  lede: "All dates are in IST.",
  items: [
    { date: "1 October 2026", title: "Applications open", text: "Problem statements for each track are published on the same day." },
    { date: "31 October 2026", title: "Applications close", text: "Hard deadline. We do not extend it." },
    { date: "November to December 2026", title: "Screening and interviews", text: "Applications are read and shortlisted startups are interviewed. You hear back either way." },
    { date: "December 2026", title: "Mentorship month", text: "Shortlisted startups work with an assigned Cars24 mentor to refine their solution." },
    { date: "1 to 15 January 2027", title: "Final refinement", text: "Startups finish the solution they will demo." },
    { date: "January 2027", title: "Finale, New Delhi", text: "National Startup Day. Shortlisted startups pitch to the jury in their track room, with a demo. Track winners re-pitch in the main auditorium, followed by felicitation." },
  ],
};

export type TrackId = "fintech" | "mobility" | "logistics" | "sovereign-ai";

export const tracksIntro = {
  title: "the 4 problem tracks",
  lede: "Open a brief to see the problem space, the opportunity and the kind of startup we want to meet.",
};

export const tracks: {
  id: TrackId;
  num: string;
  name: string;
  summary: string;
  image: string;
  /** Optional image for the "explore the brief" drawer; falls back to image. */
  briefImage?: string;
  /** Optional colour photo shown on hover when the card image is already black and white. */
  hoverImage?: string;
  /** Optional aspect ratio for the brief image frame, e.g. "2 / 1", so a wide photo shows in full. */
  briefAspect?: string;
  kicker: string;
  title: string;
  lede: string;
  body: string;
  signals: string;
  why: string;
  stats: [string, string][];
  build: string[];
}[] = [
  {
    id: "fintech",
    num: "01 · Fintech",
    name: "Lending & Fintech",
    summary: "Better credit, underwriting and fraud intelligence for the next 400 million Indians.",
    image: asset("/media/track-fintech-card.jpg"),
    briefImage: asset("/media/track-fintech-brief.jpg"),
    kicker: "01 · Fintech & lending",
    title: "Credit that meets people where they are.",
    lede: "Build the next generation of underwriting, access and trust for India’s new-to-credit population.",
    body: "We are interested in products that make financial decisions more useful and more equitable: alternative data, contextual credit, fraud intelligence, collections and tools that help people build a financial life.",
    signals: "A clear wedge, responsible use of data, measurable outcomes and a path to real distribution.",
    why: "Only 8 in every 100 Indian households own a car.",
    stats: [
      ["8%", "Of Indian households own a car. 14% urban, 4% rural"],
      ["759 Mn", "Credit eligible Indians outside the formal credit system"],
      ["₹2,562 Cr", "Cars24 Financial Services AUM, 98% of it retail"],
    ],
    build: ["Credit intelligence", "Background verification", "Fraud detection", "Early repayment alerts", "Alternative data scoring", "Dealer financing tools"],
  },
  {
    id: "mobility",
    num: "02 · Mobility",
    name: "Mobility & Road Safety",
    summary: "Vehicle health, driver risk and safety systems made for Indian road conditions.",
    image: asset("/media/track-mobility.jpg"),
    briefImage: asset("/media/track-mobility-brief.jpg"),
    hoverImage: asset("/media/track-mobility-brief.jpg"),
    briefAspect: "1052 / 1495",
    kicker: "02 · Mobility & road safety",
    title: "Make every journey safer.",
    lede: "Build for the realities of Indian roads, drivers and vehicles — including the transition to EV.",
    body: "Think beyond the dashboard: vehicle health, driver risk scoring, safety systems, maintenance intelligence and tools that help people move with greater confidence.",
    signals: "A grounded understanding of road behaviour, a measurable safety outcome and a product that can operate at scale.",
    why: "India does not just need more cars. India needs safer cars, better cars and safer roads.",
    stats: [
      ["1,77,175", "Lives lost on Indian roads in 2024, up 2.5% on the year before"],
      ["1 lakh+", "Vehicle inspections every month at Cars24"],
      ["₹52 Cr+", "In pending challans flagged by SATARK across 5.5 lakh vehicles"],
    ],
    build: ["Vehicle inspection", "Pricing and valuation", "AI enabled dashcams", "Vehicle telemetry", "Vehicle safety devices", "Driver risk scoring"],
  },
  {
    id: "logistics",
    num: "03 · Logistics",
    name: "Logistics & Supply Chain",
    summary: "Route, load and hub optimisation across a live fleet and distributed network.",
    image: asset("/media/track-logistics-warehouse.jpg"),
    briefAspect: "2 / 1",
    kicker: "03 · Logistics & supply chain",
    title: "Make the network work harder.",
    lede: "Help a distributed fleet, its hubs and its people make better decisions every day.",
    body: "We are looking for route and load optimisation, hub operations, robotics, damage detection, valuation from images and the intelligence layer connecting it all.",
    signals: "Operational depth, a clear feedback loop and evidence that the product saves time, cost or unnecessary movement.",
    why: "Every rupee and every hour taken out of the hub comes back on the price.",
    stats: [
      ["~200,000", "Cars bought, moved, refurbished and sold in FY26"],
      ["7.97%", "Of India’s GDP spent on logistics, the cost the National Logistics Policy targets"],
      ["3", "Markets, across India, the UAE and Australia"],
    ],
    build: ["Operational optimisation", "Hub operations", "Fuel optimisation", "Cleaner operations", "Yard management", "Attendance management"],
  },
  {
    id: "sovereign-ai",
    num: "04 · Sovereign AI",
    name: "Sovereign AI",
    summary: "Practical, trusted intelligence for the systems that power a more self-reliant India.",
    image: asset("/media/track-sovereign-ai.jpg"),
    kicker: "04 · Sovereign AI",
    title: "Build intelligence we can trust.",
    lede: "Create practical AI systems for the infrastructure and services that India depends on.",
    body: "The opportunity spans applied models, privacy-aware infrastructure, evaluation, multilingual systems and dependable tools for high-consequence operating environments.",
    signals: "Strong technical judgement, responsible deployment and a sharp view of where local context creates a real advantage.",
    why: "AI built for India has to be trained on Indian data.",
    stats: [
      ["~89%", "Of new startups launched in India last year used AI in their products or services"],
      ["~60%", "Of AI value in India comes from automotive, retail, financial services and healthcare"],
      ["$20 Mn", "Committed to Cars24 AI Labs"],
    ],
    build: ["Indian language interfaces", "Voice and speech models", "Small efficient models", "On device inference", "Accent robust speech", "Document understanding"],
  },
];

export const room = {
  eyebrow: "The room",
  title: "who will be joining",
  lede: "A high-signal room of people who can make a good idea more useful, more tested and more ready for the real world.",
  people: [
    { title: "Startups and founders", text: "Shortlisted early-stage founders across the four tracks, many DPIIT recognised." },
    { title: "Investors", text: "Venture capital funds, Cars24 leadership and invited investors, with access to the Founders’ Lounge." },
    { title: "Policymakers", text: "DPIIT, Startup India and other government representatives shaping India's next decade." },
    { title: "Students and campus delegates", text: "Students and delegates from participating academic and knowledge partner institutions." },
    { title: "Media and industry press", text: "Media and industry voices covering the founders, solutions and national showcase." },
    { title: "Corporate innovation and CVC teams", text: "Corporate innovation and venture teams exploring solutions with deployment and partnership potential." },
  ],
};

export type InviteId = "investor" | "partner" | "sponsor";

export const invitesIntro = {
  eyebrow: "Invitations",
  title: "choose your way into the room",
  lede: "Investors can meet and evaluate the next generation of builders. Partners can help create the platform and shape the agenda.",
};

export const invites: {
  id: InviteId;
  label: string;
  card: string;
  cardText: string;
  link: string;
  image: string;
  kicker: string;
  title: string;
  lede: string;
  points: string[];
  signals: string;
  action: string;
}[] = [
  {
    id: "investor",
    label: "Investor invitation",
    card: "Meet the next generation of India's builders",
    cardText: "Access a screened pipeline, the Founders’ Lounge, selected pitch decks and the final showcase at Bharat Mandapam.",
    link: "Open investor invitation",
    image: asset("/media/invite-investor.jpg"),
    kicker: "Investor access",
    title: "Meet the next generation of India’s builders.",
    lede: "Get close to a screened pipeline of founders working on problems that matter across fintech, mobility, logistics and sovereign AI.",
    points: [
      "Join startup mixers from October to December",
      "Receive the shortlisted decks in December",
      "Meet the teams you choose in the Investor Lounge and in the weeks that follow",
      "Join the final pitch day and the jury alongside Cars24 leadership and DPIIT",
    ],
    signals: "Shortlisted startups across four tracks, with decks, demos, mentorship outcomes and a final pitch.",
    action: "Request investor invitation",
  },
  {
    id: "partner",
    label: "Partner invitation",
    card: "Put your organisation behind the challenge",
    cardText: "Support the prize pool, contribute as an industry or knowledge partner, or sponsor one of the four tracks.",
    link: "Open partner invitation",
    image: asset("/media/invite-partner.jpg"),
    kicker: "Partner access",
    title: "Help create the platform for what comes next.",
    lede: "Back the challenge as a sponsor, track partner or founding knowledge partner, with your organisation present across the season.",
    points: [
      "Be present across the season, from applications to the final showcase in New Delhi",
      "Support the ₹1 crore prize pool",
      "Sponsor one of the four tracks",
      "Participate as an industry or knowledge partner alongside Cars24, DPIIT and Startup Policy Forum",
    ],
    signals: "Partner visibility can include the microsite, communications, stage presence, showcase programming and founder access, with the final package shaped around the partnership.",
    action: "Discuss a partnership",
  },
  {
    id: "sponsor",
    label: "Sponsorship invitation",
    card: "Put your brand behind meaningful progress",
    cardText: "Support the challenge through a sponsorship package designed around visibility, founder access and the themes shaping India’s next chapter.",
    link: "Open sponsorship invitation",
    image: asset("/media/environment.jpg"),
    kicker: "Sponsorship access",
    title: "Put your brand behind the builders.",
    lede: "Support the challenge with a sponsorship package that connects your organisation to the founders, ideas and problem spaces shaping India’s next chapter.",
    points: [
      "Support the prize pool",
      "Associate with a problem track",
      "Help make the national showcase possible",
      "Packages shaped around brand visibility, founder access, curated conversations and participation across the programme, from applications to the final showcase",
    ],
    signals: "A clear association with the Grand Startup Challenge, meaningful access to the startup ecosystem and a sponsorship package tailored to your objectives.",
    action: "Discuss sponsorship",
  },
];

export const closing = {
  eyebrow: "The next build starts here",
  title: "make the hard problems worth solving",
};

export const footer = "© Grand Startup Challenge · Cars24 × Startup Policy Forum";
