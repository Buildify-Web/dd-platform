/**
 * Courses shown on the public website, grouped by grade band (scope §5.2).
 * Sample copy — later this will be served by the backend from admin-configured courses.
 */
export type Tone = "brand" | "ink" | "sun" | "sage";
export type CourseIcon = "book" | "trophy" | "flask" | "spell" | "abc" | "cap" | "calc" | "globe" | "code" | "chart";

export type CourseCard = {
  title: string;
  description: string;
  tone: Tone;
  icon: CourseIcon;
  tags: string[];
};

export type GradeBand = {
  id: "foundation" | "9-10" | "11-12";
  tab: string;
  eyebrow: string;
  heading: string;
  note: string;
  courses: CourseCard[];
};

export const gradeBands: GradeBand[] = [
  {
    id: "foundation",
    tab: "Pre-KG – 8",
    eyebrow: "Foundation",
    heading: "Pre-KG to Grade 8",
    note: "Phonics is offered from Pre-KG to Grade 2.",
    courses: [
      { title: "Regular tuition", description: "Daily support across school subjects.", tone: "brand", icon: "book", tags: ["All subjects", "Group or 1:1"] },
      { title: "Maths Olympiad", description: "Problem-solving practice and mock tests.", tone: "ink", icon: "trophy", tags: ["Competition"] },
      { title: "Science Olympiad", description: "Concept building and timed practice.", tone: "sun", icon: "flask", tags: ["Competition"] },
      { title: "Spell Bee", description: "Vocabulary, spelling and pronunciation.", tone: "sage", icon: "spell", tags: ["Competition"] },
      { title: "Phonics", description: "Letter sounds, blending and early reading.", tone: "brand", icon: "abc", tags: ["Pre-KG–Grade 2"] },
    ],
  },
  {
    id: "9-10",
    tab: "Grades 9 - 10",
    eyebrow: "Board years",
    heading: "Grades 9 to 10",
    note: "Maths and Science tuition is mandatory and enabled by default.",
    courses: [
      { title: "Maths & Science", description: "Core board syllabus with weekly tests.", tone: "brand", icon: "flask", tags: ["Mandatory", "Group or 1:1"] },
      { title: "Tamil", description: "Grammar, prose and poetry for boards.", tone: "ink", icon: "book", tags: ["Regular tuition"] },
      { title: "English", description: "Reading, writing and exam answers.", tone: "sun", icon: "spell", tags: ["Regular tuition"] },
      { title: "Social", description: "History, geography and civics made simple.", tone: "sage", icon: "globe", tags: ["Regular tuition"] },
    ],
  },
  {
    id: "11-12",
    tab: "Grades 11 - 12",
    eyebrow: "Higher secondary",
    heading: "Grades 11 to 12",
    note: "Pick the subjects for your child’s stream — Science or Commerce.",
    courses: [
      { title: "Maths", description: "Calculus, algebra and board problem sets.", tone: "brand", icon: "calc", tags: ["Science"] },
      { title: "Physics", description: "Concepts, derivations and numericals.", tone: "ink", icon: "flask", tags: ["Science"] },
      { title: "Chemistry", description: "Physical, organic and inorganic chemistry.", tone: "sun", icon: "flask", tags: ["Science"] },
      { title: "Computer Science", description: "Programming, logic and practical records.", tone: "sage", icon: "code", tags: ["Science"] },
      { title: "Commerce", description: "Business studies explained with examples.", tone: "brand", icon: "chart", tags: ["Commerce"] },
      { title: "Accounts", description: "Journal, ledger and final accounts practice.", tone: "ink", icon: "book", tags: ["Commerce"] },
      { title: "Applied Maths", description: "Statistics and maths for commerce.", tone: "sun", icon: "calc", tags: ["Commerce"] },
      { title: "Economics", description: "Micro and macro economics for boards.", tone: "sage", icon: "chart", tags: ["Commerce"] },
    ],
  },
];
