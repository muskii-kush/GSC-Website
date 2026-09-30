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
  when: "January 2027, New Delhi",
};

// Floating chips around the hero statement. Every fact here is repeated elsewhere on the page.
export const heroChips = [
  { value: "₹1 Cr", label: "prize pool" },
  { value: "4", label: "problem tracks" },
  { value: "1 Oct", label: "applications open" },
  { value: "Jan 2027", label: "New Delhi finale" },
];

export const challenge = {
  title: "about the event",
  // From the GSC 2027 concept note (objective, format and outcomes).
  statement:
    "The Grand Startup Challenge, run with DPIIT and Startup India, puts early-stage startups on real problems, with real deployment, capital, mentorship, investor visibility and national recognition.",
  lede:
    "Over a four-month journey, startups move from applications and shortlisting to a month of immersion and refinement, and a national finale.",
  metrics: [
    { value: "1,000+", label: "Applications" },
    { value: "₹1 Cr", label: "Prize pool" },
    { value: "4", label: "Problem tracks" },
  ],
};

// Scrolling proof strip under the hero. From the concept note and the partnership deck.
export const proof = [
  "With DPIIT and Startup India, Government of India",
  "₹1 Cr prize pool",
  "4 problem tracks",
  "1,000+ applications expected",
  "12 winning startups",
  ];

// Why this challenge. Leads with the Government of India collaboration; the host's 2015 roots are the credential.
export const why = {
  eyebrow: "Why this challenge",
  items: [
    { title: "Built with the Government of India", text: "The challenge runs with DPIIT and Startup India. It is a national platform for founders, not a company contest." },
    { title: "Hosted by a company born in the startup boom", text: "Cars24 was founded in 2015, the year Startup India began, and scaled on the belief of founders and investors. This is that support, passed on." },
    { title: "For the next generation of Indian founders", text: "Real problems, real data, ₹1 crore in prize money and a national stage, open to early-stage teams building for India’s next decade." },
  ],
};

// What shortlisted and winning startups get.
export const gets = {
  eyebrow: "What startups get",
  title: "and the prize is only the beginning",
  lede: "The ₹1 crore pool is shared among twelve winners, the top three in each track. But every startup that makes the shortlist also signs up for all of this.",
  items: [
    { stamp: "₹1 Cr", admit: "Prize", title: "₹1 crore prize pool", text: "One pool, shared among twelve winners: the top three startups in each of the four tracks." },
    { stamp: "Live", admit: "Data", title: "Real problems, real data", text: "Live problem statements drawn from real operations, with real data behind them." },
    { stamp: "1:1", admit: "Mentor", title: "A month with mentors", text: "Shortlisted startups spend December refining their solution with an assigned mentor." },
    { stamp: "Deploy", admit: "Launch", title: "A chance at real deployment", text: "Solutions are built for the context where the problem actually lives, not for a demo day." },
    { stamp: "Pitch", admit: "Lounge", title: "Investors in the room", text: "Pitch to a jury with DPIIT, industry leaders and invited investors, and meet them in the lounge." },
    { stamp: "Delhi", admit: "Finale", title: "A national stage", text: "Pitch to the jury, investors and policymakers at the national finale." },
  ],
};

// One quiet line at the end of each section, handing off to the next (see Bridge in page.tsx).
export const bridges = {
  about: { label: "The four problem tracks", target: "#tracks" },
  tracks: { label: "What startups get", target: "#benefits" },
  benefits: { label: "How it works", target: "#timeline" },
  timeline: { label: "Who will be joining", target: "#community" },
  room: { label: "Partner with us", target: "#partners" },
  partners: { label: "Questions", target: "#faq" },
};

export const gallery = [
  { src: asset("/media/band-founders.jpg"), alt: "Founders and operators in conversation", caption: "Access to people who can help the work move." },
  { src: asset("/media/band-inspection.jpg"), alt: "Vehicle inspection in a real operating environment", caption: "Build in the context where the problem actually lives." },
];

export const timeline = {
  eyebrow: "How it works",
  title: "from application to the finale",
  lede: "Four months, from applications and shortlisting to a month of mentorship and a final pitch in New Delhi. All dates are in IST.",
  items: [
    { date: "1 October 2026", title: "Applications open", text: "Problem statements for each track are published on the same day." },
    { date: "31 October 2026", title: "Applications close", text: "Hard deadline. We do not extend it." },
    { date: "November to December 2026", title: "Screening and interviews", text: "Applications are read and shortlisted startups are interviewed. You hear back either way." },
    { date: "December 2026", title: "Mentorship month", text: "Shortlisted startups work with an assigned mentor to refine their solution." },
    { date: "Early January 2027", title: "Final refinement", text: "Startups finish the solution they will demo." },
    { date: "January 2027", title: "Finale, New Delhi", text: "Shortlisted startups pitch to the jury in their track room, with a demo. Track winners re-pitch in the main auditorium, followed by felicitation." },
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
    num: "Track 1 · Fintech",
    name: "Lending & Fintech",
    summary: "Better credit, underwriting and fraud intelligence for the next 400 million Indians.",
    image: asset("/media/track-fintech-card.jpg"),
    briefImage: asset("/media/track-fintech-brief.jpg"),
    kicker: "Track 1 · Fintech & lending",
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
    num: "Track 2 · Mobility",
    name: "Mobility & Road Safety",
    summary: "Vehicle health, driver risk and safety systems made for Indian road conditions.",
    image: asset("/media/track-mobility.jpg"),
    briefImage: asset("/media/track-mobility-brief.jpg"),
    hoverImage: asset("/media/track-mobility-brief.jpg"),
    briefAspect: "1052 / 1495",
    kicker: "Track 2 · Mobility & road safety",
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
    num: "Track 3 · Logistics",
    name: "Logistics & Supply Chain",
    summary: "Route, load and hub optimisation across a live fleet and distributed network.",
    image: asset("/media/track-logistics-warehouse.jpg"),
    briefAspect: "2 / 1",
    kicker: "Track 3 · Logistics & supply chain",
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
    num: "Track 4 · Sovereign AI",
    name: "Sovereign AI",
    summary: "Practical, trusted intelligence for the systems that power a more self-reliant India.",
    image: asset("/media/track-sovereign-ai.jpg"),
    kicker: "Track 4 · Sovereign AI",
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
    { title: "Investors", text: "Venture capital funds, industry leaders and invited investors, with access to the Founders’ Lounge." },
    { title: "Policymakers", text: "DPIIT, Startup India and other government representatives shaping India's next decade." },
    { title: "Students and campus delegates", text: "Students and delegates from participating academic and knowledge partner institutions." },
    { title: "Media and industry press", text: "Media and industry voices covering the founders, solutions and national showcase." },
    { title: "Corporate innovation and CVC teams", text: "Corporate innovation and venture teams exploring solutions with deployment and partnership potential." },
  ],
};

export type InviteId = "academic" | "investor" | "sponsor";

export const invitesIntro = {
  eyebrow: "Invitations",
  title: "choose your way into the room",
  lede: "Academic partners help pick and grow the builders. Investors meet them early. Sponsors put their brand behind them.",
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
    // From the Academic & Incubation Partnership deck, generalised beyond IIMA Ventures.
    id: "academic",
    label: "Academic partnership",
    card: "Bring your founders, faculty and students into the challenge",
    cardText: "Join as a Founding Knowledge Partner. Help pick the winners, send your incubated startups and student founders, and put your institution beside Startup India.",
    link: "Open academic partnership",
    image: asset("/media/invite-partner.jpg"),
    kicker: "Academic & incubation partnership",
    title: "Become a Founding Knowledge Partner.",
    lede: "For universities, business schools and incubators that stand with founders at the earliest stage. Help shape the challenge, and meet the best of 1,000+ applicants while they are still early.",
    points: [
      "Your faculty or incubator leads sit on the jury and the selection committee",
      "Your incubated startups can apply, compete for the ₹1 crore prize pool and pitch to the full jury",
      "Your team leads a panel at the finale on the question you most want India to debate",
      "A seat in the Investor Lounge, alongside every investor invited to the challenge",
      "A stall to meet students and campus delegates from India’s leading institutions",
      "Case studies from the challenge, co-authored with your team",
    ],
    signals: "Founding Knowledge Partners are named on the microsite, the press kit, the stage backdrop and every certificate, alongside DPIIT, Startup India, Cars24 and Startup Policy Forum. We would also love to visit your campus for a session on the problem statements with your founders and students.",
    action: "Discuss an academic partnership",
  },
  {
    id: "investor",
    label: "Investor partnership",
    card: "Meet the next generation of India's builders",
    cardText: "Access a screened pipeline, the Founders’ Lounge, selected pitch decks and the final showcase.",
    link: "Open investor partnership",
    image: asset("/media/invite-investor.jpg"),
    kicker: "Investor access",
    title: "Meet the next generation of India’s builders.",
    lede: "Get close to a screened pipeline of founders working on problems that matter across fintech, mobility, logistics and sovereign AI.",
    points: [
      "Join startup mixers from October to December",
      "Receive the shortlisted decks in December",
      "Meet the teams you choose in the Investor Lounge and in the weeks that follow",
      "Join the final pitch day and the jury alongside DPIIT and industry leaders",
    ],
    signals: "Shortlisted startups across four tracks, with decks, demos, mentorship outcomes and a final pitch.",
    action: "Request investor invitation",
  },
  {
    id: "sponsor",
    label: "Sponsor partnership",
    card: "Put your brand behind meaningful progress",
    cardText: "Support the challenge through a sponsorship package designed around visibility, founder access and the themes shaping India’s next chapter.",
    link: "Open sponsor partnership",
    image: asset("/media/environment.jpg"),
    kicker: "Sponsor access",
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

// FAQ. Answers only restate what the site and application form already say.
export const faq = {
  eyebrow: "Questions",
  title: "curious? ask away",
  items: [
    {
      q: "Who can apply?",
      a: "Early-stage startups incorporated in India, as a private limited company or an LLP, with at least one founder working on it full time. If you have raised more than ₹50 crore in funding, the challenge is not for you.",
    },
    {
      q: "When do applications open and close?",
      a: "Applications open on 1 October 2026 and close on 31 October 2026, IST. The deadline is firm and will not be extended.",
    },
    {
      q: "How are applications scored?",
      a: "Every application first clears eight yes-or-no eligibility checks. It is then read by two independent reviewers and scored on four equally weighted criteria: track fit, product evidence, team and traction. Both are published in full, so you can write your application against them.",
      link: { label: "Read the eligibility checks and screening rubric", href: "#scoring" },
    },
    {
      q: "What do I need to apply?",
      a: "Details on your company, team, product, market and traction, a link to your deck and a 2 to 5 minute video of the founders. The application takes about thirty minutes. Answers save in your browser as you type, so you can close it and come back on the same device.",
    },
    {
      q: "Which track should I apply to?",
      a: "Pick the one closest to the problem you solve: lending and fintech, mobility and road safety, logistics and supply chain, or sovereign AI. Open a track brief to see what we are looking for.",
    },
    {
      q: "What happens after I apply?",
      a: "Applications are reviewed on a rolling basis, and shortlisted startups are invited to interview. Everyone who applies hears back by email. We may contact you for clarification along the way; that does not mean you have been selected. Shortlisted teams then work with a mentor and refine their solution before the finale.",
    },
    {
      q: "Where and when is the finale?",
      a: "In New Delhi in January 2027. Startups pitch and demo to the jury in their track room, and track winners re-pitch in the main auditorium.",
    },
    {
      q: "What do startups get?",
      a: "A shot at the ₹1 crore prize pool, plus real deployment, mentorship, investor visibility and national recognition.",
    },
  ],
};

// The published part of the scoring rubric: the eligibility checks and the screening round.
export const scoring = {
  label: "How applications are scored",
  title: "how we score applications",
  lede: "Every application goes through the same two stages, scored against criteria written down in advance. This is what the reviewers read from, and what you should write your application against.",
  gates: {
    tab: "Eligibility",
    heading: "Eight eligibility checks",
    intro: "Each check is a simple yes or no. Miss any one and the application closes, however strong the rest of it is. Nothing here is scored, so a strong pitch cannot make up for a missed check. They are published so you can confirm them before you spend an evening on the form.",
    items: [
      { title: "Incorporated in India", text: "A private limited company or an LLP registered in India, with a CIN, on the day you apply. Teams that have not yet incorporated cannot apply this year, because the prize is paid to an entity and pilots need one to sign." },
      { title: "The track fits", text: "The application answers one of the four published problem statements, and the track you select matches what the company actually does." },
      { title: "Under ₹50 crore raised", text: "Total funding raised to date is under ₹50 crore." },
      { title: "At least one full-time founder", text: "Named, reachable, and working on this and nothing else." },
      { title: "Something is being built", text: "A product, a prototype, working code, or a technical founder who can build one. Consulting, staffing, reselling and pure systems integration businesses are not eligible." },
      { title: "The deck opens", text: "A link that opens on the first click, without a permission request. A deck we cannot open is a deck we cannot score." },
      { title: "Complete and declared", text: "Every required field filled, consent given, and a declaration that the figures you have given are true." },
      { title: "Not a Cars24 employee", text: "A current Cars24 employee cannot apply as a founder. If a founder has immediate family working at Cars24, say so on the form. It is a disclosure, not a disqualification." },
    ],
    note: "Figures are checked for shortlisted startups. A figure overstated by more than 25% against what can be verified, without an explanation the committee accepts, closes the application.",
  },
  screening: {
    tab: "Screening",
    heading: "Screening: four criteria, equal weight",
    intro: "Two independent reviewers read every application that clears eligibility, working from the form and the deck. Each scores four equally weighted criteria from 1 to 5. The two scores are averaged, and the strongest applications move on to the jury round. Here is what the reviewers look for.",
    criteria: [
      {
        title: "Track fit and problem clarity",
        weight: "25%",
        question: "Can a reader tell what you do, who has the problem, and why it belongs in this track?",
        reads: "Your one-sentence description, the problem, the target customer, and whether the track you picked matches the business.",
        look: "We look at whether we can tell what you do and who it is for, whether the problem is specific and quantified in rupees, hours or incidents, whether the customer is identifiable, and whether it answers one of the four track problem statements. Evidence that customers already spend money or time on a worse fix counts strongly.",
      },
      {
        title: "Product evidence",
        weight: "25%",
        question: "Does anything exist outside the deck, and has anyone outside your team used it?",
        reads: "Your product stage, customers, tech stack, any measured quality number, and the demo if there is one.",
        look: "We assess how far the product has come: an idea, a working prototype, something live with users outside the team, or a product customers depend on every day. We look for named customers, real technical choices, a measured result on quality or speed, and anything you own that a competitor cannot easily buy, such as your own data, models, licences or hard-won integrations.",
      },
      {
        title: "Team credibility",
        weight: "25%",
        question: "Is there a person here who can build it and a person who can sell it?",
        reads: "The founders, their roles and what each built before, LinkedIn profiles, who writes the code, team size, and the founder video.",
        look: "We look for at least one full-time founder who can build the product and one who can sell it, relevant experience in the problem area, profiles that match the claims, and a clear split of who owns what. A founder who has worked on this exact problem before, or has built and exited a company, stands out.",
      },
      {
        title: "Traction signal",
        weight: "25%",
        question: "Has anyone paid, or used it enough to count?",
        reads: "Whether anyone uses the product, customer and paying counts, six months of revenue, and whether a reference customer is offered.",
        look: "We look at whether anyone uses or pays for the product: paid pilots, paying customers, active users or transaction volume, and whether revenue has grown over the last six months. Renewals, expanded contracts and a named reference customer all strengthen the case.",
      },
    ],
    note: "Traction is not an eligibility check. A strong idea-stage team can still move forward on the other three criteria.",
  },
};

export const closing = {
  eyebrow: "Still deciding?",
  title: "make the hard problems worth solving",
};

export const footer = "© Grand Startup Challenge · DPIIT, Startup India × Cars24 × Startup Policy Forum";
