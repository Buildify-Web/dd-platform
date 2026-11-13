/**
 * About Us / Vision & Mission page content (app/about/page.tsx).
 * Copy is the client's own "About Us" and "Vision and Mission" text.
 * The value one-liners under each value are ours — confirm them with the client.
 */

/**
 * Founders card (Thenu Annamalai & Meena Annamalai). The photo is the client's real one, cropped to 4:5
 * in app/about/page.tsx; `photo: null` would bring back the placeholder tile.
 */
export const founders: { names: string[]; role: string; photo: string | null; togetherPhoto: string } = {
  names: ["Thenu Annamalai", "Meena Annamalai"],
  role: "Founders, Dynamic Donalds",
  /** portrait, used on the sticky card in "Our story" */
  photo: "/images/founder.webp",
  /** landscape (both founders, outdoors), used on the "Our founders" section card */
  togetherPhoto: "/images/founders-together.webp",
};

/** Meena Annamalai: co-founder; the founder's message, key works and the 2026 award are hers. */
export const meena = { name: "Meena Annamalai", role: "Founder & Managing Director" };

export const stats = [
  { value: "2013", label: "The year our story began" },
  { value: "2,000+", label: "Students taught, LKG to Grade 12" },
  { value: "100%", label: "Pass results" },
  { value: "90%", label: "Securing centum in multiple subjects" },
];

export const milestones = [
  {
    when: "2013",
    title: "A simple dream",
    body: "A place where every child feels supported, understood and inspired to learn.",
  },
  {
    when: "2017",
    title: "Best School of Training",
    body: "Awarded at the Aarivukalanjiyam event, and every year since, till date.",
  },
  {
    when: "COVID‑19",
    title: "Learning never stopped",
    body: "We moved online swiftly. Today, students from all over the world learn with us.",
  },
  {
    when: "2026",
    title: "Leaders of the Change",
    body: "Our founder Meena Annamalai was honoured at the Star Education Awards 2026, with The Times of India.",
  },
  {
    when: "Today",
    title: "A trusted learning family",
    body: "Over 2,000 students guided, and a new collaboration with VILA for weekend courses.",
  },
];

export const syllabi = ["State Board", "Matriculation", "CBSE", "IGCSE"];

export const teachingPillars = ["Personal attention", "Strong concept clarity", "Regular tests", "Continuous mentoring"];

export const competitionsCoached = [
  { title: "Olympiads", icon: "flask" },
  { title: "Mastermind Competitions", icon: "trophy" },
  { title: "SpellBee", icon: "spell" },
  { title: "Kiddie Buddie & Kalanjiyam", icon: "star" },
  { title: "Drawing, Speech & more", icon: "brush" },
] as const;

export const competitionsEntered = [
  { level: "State level", title: "Mega Aarivukalanjiyam Competitions" },
  { level: "National level", title: "Vaigai Kids Online Competition" },
  { level: "Independence Day", title: "Brain Tech Competitions" },
];

/**
 * "This year alone…" tally. The client's text has blanks, so it stays hidden
 * until every number is filled in (set each `count` to a number).
 */
export const medalTally: { year: string; items: { label: string; count: number | null }[] } = {
  year: "This year",
  items: [
    { label: "Trophies", count: null },
    { label: "Gold medals", count: null },
    { label: "Silver medals", count: null },
    { label: "Bronze medals", count: null },
  ],
};

export const vila = {
  name: "VILA",
  full: "Versatile Indu Learning Academy",
  courses: ["JEE / NEET Foundation", "Mastery English Combo", "Weekend Online / Offline"],
};

export const missionNurture = [
  { title: "Concept clarity", body: "Strong concept clarity in academics." },
  { title: "Personal guidance", body: "Personal attention and continuous guidance." },
  { title: "Character", body: "Values, discipline and self-confidence." },
  { title: "Opportunities", body: "Extracurriculars, competitions and creative arts." },
];

export const values = [
  { name: "Gratitude", line: "For every family that trusts us with their child.", tone: "sun" },
  { name: "Integrity", line: "Honest feedback and fair practice, always.", tone: "brand" },
  { name: "Sincerity", line: "Real effort in every class, for every child.", tone: "ink" },
  { name: "Commitment", line: "Towards every pupil, every single day.", tone: "sage" },
] as const;

/** Award shown on the About page (founder section) and at the top of the Achievements page. */
export const leadersAward = {
  title: "Leaders of the Change",
  year: "2026",
  by: "Star Education Awards 2026",
  partner: "The Times of India",
  photo: "/images/awards/leaders-of-change-2026.webp",
  photoAlt: "Meena Annamalai receiving the Leaders of the Change award at the Star Education Awards 2026",
};

/** Founder's note from Meena Annamalai's own account (client text, Nov 2026), lightly edited for the web. */
export const founderMessage = {
  intro:
    "Dynamic Donalds is a complete learning family. Since 2013 we have guided over 2,000 students from LKG to Grade 12, across State Board, Matriculation, CBSE and IGCSE.",
  quote: "We are not just a tuition centre. We are a family where Education meets Sanskar.",
  closing:
    "At DD, every decision is for our students’ welfare, built on a culture of respect, service and affordable quality education over the last 13 years.",
};

export const founderWorks = [
  {
    title: "Author & academic product partner",
    body: "With our design and print partner Quicky, we author Math Olympiad and SpellBee workbooks for KG to Grade 5. They are supplied to schools and delivered every month to registered students’ homes across India, at an affordable cost.",
    stat: { value: "KG–5", label: "Olympiad & SpellBee workbooks" },
    icon: "book",
  },
  {
    title: "Free competition training",
    body: "100% free training for co-curricular and extra-curricular competitions: Olympiads, Mastermind, SpellBee, Aarivukalanjiyam, Vaigai Kids and Brain Tech, with hundreds of medals and trophies.",
    stat: { value: "11 years", label: "Of free training" },
    icon: "trophy",
  },
  {
    title: "Academic excellence, global reach",
    body: "100% pass results, with 90% of students securing centum in multiple subjects. During COVID-19 we moved online with zero learning loss, and now teach students from all over the world.",
    stat: { value: "12+ years", label: "Of 100% pass results" },
    icon: "globe",
  },
  {
    title: "Student-first values",
    body: "Free education and concessions for underprivileged children, and a collaboration with VILA for JEE / NEET Foundation and Mastery English Combo courses.",
    stat: { value: "Free", label: "Education for those in need" },
    icon: "heart",
  },
] as const;
