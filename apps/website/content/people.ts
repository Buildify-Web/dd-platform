/**
 * Tutors, alumni and testimonials.
 * Tutors, alumni and testimonials (Google reviews) are all REAL (client-supplied, Nov 2026).
 * Tutors and alumni share the `Profile` shape and the same UI (components/ProfileGrid.tsx).
 * Photos live in /public/images. `photo: null` renders the coloured silhouette tile from the design.
 */
import type { Tone } from "./courses";

export type ProfileStep = {
  /** degree or job title */
  title: string;
  /** institution / employer (omit when the client didn't give one) */
  place?: string;
  /** year or range; omit when unknown */
  when?: string;
  kind: "education" | "work" | "research";
  /** e.g. "Gold medalist" */
  note?: string;
};

export type Profile = {
  /** URL-safe, used in the shareable hash (#tutor-<id>, #alumni-<id>) */
  id: string;
  name: string;
  /** one line under the name on the card and in the profile */
  headline: string;
  /** pills on the photo; only the first shows on phones, so put the most useful one first */
  tags: string[];
  photo: string | null;
  /** subjects the tutor teaches, when the client listed them */
  teaches?: { group: string; subjects: string[] }[];
  /** newest first */
  path: ProfileStep[];
};

export type Tutor = Profile & { tone: Tone };

/*
 * Notes for the client to confirm:
 * - Srimathi M: "phD … now currently pursuing at SRM" is read as a Ph.D. in progress at SRM IST, Kattankulathur.
 * - "UG" / "PG" for Dr. Bashir are kept as given (the exact degree names weren't supplied).
 */
export const tutors: Tutor[] = [
  {
    id: "bashir",
    name: "Dr. Bashir",
    headline: "Assistant Professor & Research Head, Medical College",
    tags: ["Biochemistry", "Ph.D."],
    photo: "/images/tutors/bashir.webp",
    tone: "brand",
    path: [
      { kind: "work", title: "Assistant Professor & Research Head", place: "Medical College", when: "2024 – present" },
      { kind: "research", title: "Postdoctoral research", place: "VIT, Vellore", when: "2023 – 2024" },
      { kind: "education", title: "Ph.D.", place: "Anna University", when: "2017 – 2023" },
      { kind: "work", title: "Research Scientist", place: "R&D company", when: "2013 – 2016" },
      { kind: "education", title: "PG, Biochemistry", place: "Kanpur University", when: "2013" },
      { kind: "education", title: "UG, Biochemistry", place: "University of Bangalore", when: "2011" },
    ],
  },
  {
    id: "srimathi",
    name: "Srimathi M",
    headline: "M.Sc. Chemistry (Gold Medalist), B.Ed. · Ph.D. scholar",
    tags: ["Chemistry", "Gold medalist"],
    photo: "/images/tutors/srimathi.webp",
    tone: "sun",
    path: [
      { kind: "research", title: "Ph.D. (pursuing)", place: "SRM Institute of Science and Technology, Kattankulathur", when: "Ongoing" },
      { kind: "education", title: "M.Sc. Chemistry", note: "Gold medalist" },
      { kind: "education", title: "B.Ed." },
    ],
  },
  {
    id: "bharathi",
    name: "Bharathi R",
    headline: "M.Phil. Physics, University of Madras",
    tags: ["Physics", "M.Phil."],
    photo: "/images/tutors/bharathi.webp",
    tone: "ink",
    path: [
      {
        kind: "education",
        title: "M.Phil. Physics",
        place: "Meenakshi College for Women (affiliated with the University of Madras)",
        when: "2023",
      },
    ],
  },
  {
    id: "kuzhali",
    name: "Kuzhali",
    headline: "M.Sc. Physics, Bharathidasan University",
    tags: ["Physics", "M.Sc."],
    photo: "/images/tutors/kuzhali.webp",
    tone: "sage",
    path: [{ kind: "education", title: "M.Sc. Physics", place: "Bharathidasan University, Tiruchirappalli", when: "2023" }],
  },
  {
    id: "kalaiselvan",
    name: "Kalaiselvan G",
    headline: "Humanities teacher · B.A., LL.B., M.A., B.Ed.",
    tags: ["Humanities", "B.A., LL.B."],
    photo: "/images/tutors/kalaiselvan.webp",
    tone: "brand",
    teaches: [
      { group: "TGT", subjects: ["Social Science"] },
      {
        group: "PGT",
        subjects: ["History", "Political Science", "Commerce / Business Studies", "Legal Studies", "Accountancy", "Economics"],
      },
    ],
    path: [
      { kind: "education", title: "M.A. Political Science", place: "Madras University", when: "2025" },
      { kind: "education", title: "B.Ed.", place: "Tamil Nadu Teacher Education University", when: "2025" },
      { kind: "education", title: "B.A., LL.B.", place: "Tamil Nadu Dr. Ambedkar Law University", when: "2023" },
    ],
  },
  {
    id: "sridevi",
    name: "Sridevi",
    headline: "B.E. Electronics & Communication, Anna University",
    tags: ["Engineering", "B.E. (ECE)"],
    photo: "/images/tutors/sridevi.webp",
    tone: "sun",
    path: [{ kind: "education", title: "B.E. (ECE)", place: "Anna University", when: "2017" }],
  },
  {
    id: "aishvarya",
    name: "B. Aishvarya",
    headline: "B.Tech Information Technology",
    tags: ["IT", "B.Tech"],
    photo: "/images/tutors/aishvarya.webp",
    tone: "ink",
    path: [{ kind: "education", title: "B.Tech (IT)", place: "IG College of Engineering", when: "2018" }],
  },
];

/** Alumni (real, Nov 2026). Batch = the year they passed Class 12. */
export const alumni: Profile[] = [
  {
    id: "prakruthi",
    name: "Prakruthi B",
    headline: "Software Developer, Zenitude Technology Solutions",
    tags: ["Batch of 2022", "Software"],
    photo: "/images/alumni/prakruthi.webp",
    path: [
      { kind: "work", title: "Software Developer", place: "Zenitude Technology Solutions, Hyderabad", when: "Now" },
      { kind: "education", title: "Class 12", when: "2022" },
    ],
  },
  {
    id: "janani",
    name: "Janani Selvan",
    headline: "MBBS, final year · ACS Medical College and Hospital",
    tags: ["Batch of 2023", "Medicine"],
    photo: "/images/alumni/janani.webp",
    path: [
      { kind: "education", title: "MBBS", place: "ACS Medical College and Hospital", when: "Final year" },
      { kind: "education", title: "Class 12", when: "2023" },
    ],
  },
];

/**
 * REAL Google reviews of Dynamic Donalds (copied from the Google Maps listing by the client, Nov 2026).
 * - Only positive, substantive reviews are used. Long reviews that Google truncates ("… More") end at the
 *   last complete visible sentence; nothing is added. Only spelling / spacing / emoji clean-up was applied.
 * - No reviewer photos: their Google profile pictures belong to private individuals (and the CSP blocks
 *   remote images), so the UI shows initials instead.
 * - `role` is "Parent" / "Student" only when the review itself makes that clear.
 */
export type Testimonial = {
  name: string;
  role: "Parent" | "Student" | "Google review";
  /** short label shown as a chip */
  topic: string;
  quote: string;
  /** set for non-English reviews; `translation` is shown under the original */
  lang?: "ta";
  translation?: string;
  /** filled in at request time by app/alumni/page.tsx when public/images/reviews/<slug>.<ext> exists */
  photo?: string;
};

/**
 * File name (without extension) for a reviewer's profile photo in public/images/reviews/,
 * e.g. "Christy Sandra Fernando B" → "christy-sandra-fernando-b". Drop a .webp/.jpg/.png with that name.
 */
export function reviewPhotoSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const testimonials: Testimonial[] = [
  {
    name: "Christy Sandra Fernando B",
    role: "Google review",
    topic: "Beyond academics",
    quote:
      "Dedicated and skillful teachers. Best environment and platform for children to learn. Apart from academics, students are taught Vedic Mathematics, Spoken English, etc., and gifts are distributed to the students to encourage them to learn better. Best institute for students.",
  },
  {
    name: "Suganya Radhakrishnan",
    role: "Google review",
    topic: "Nurturing talent",
    quote:
      "DD... a unique, one-of-its-kind tuition centre. The focus is not only on academics; they go the extra mile to identify and nurture any special talent and bring out the best in every child.",
  },
  {
    name: "Dheep Chandh",
    role: "Parent",
    topic: "Olympiad & SpellBee",
    quote:
      "My daughter attends Olympiad and SpellBee classes at Dynamic Donalds (DD). Her accent and math skills improved a lot, and she got gold medals in international events. DD’s connections with such international events are definitely a pride. Good professional touch and value-based education.",
  },
  {
    name: "Gayathri Kannan",
    role: "Google review",
    topic: "Stress-free learning",
    quote:
      "Best study centre I have ever seen. Teachers are very dedicated. Students never feel stress during their class hours. This centre is purely service-minded. Kids like to go to class enthusiastically. Thank you, Meena mam and other teachers, for making the class lively.",
  },
  {
    name: "Florence Juliet B",
    role: "Parent",
    topic: "Dedicated teachers",
    quote:
      "A very good centre. Meena mam and the other teachers are very dedicated. Nithya mam and Vidya mam are supporting pillars. DD provides good exposure for the students to the outside world. Good training and very flexible timings. As a mother, I am very happy that my kids are studying here.",
  },
  {
    name: "Sudharsun Chennai",
    role: "Google review",
    topic: "One-to-one care",
    quote:
      "Excellent staff members, educating in a very friendly way with one-to-one care. Micro-level monitoring helps the students excel in studies, and they also help students identify and develop their personal strengths.",
  },
  {
    name: "Ravi Kumar",
    role: "Parent",
    topic: "Best tuition centre",
    quote:
      "In 12 years of my son’s career, this is the best tuition centre. I will surely refer it to my friends and colleagues. Kids will reach their target and goal for sure.",
  },
  {
    name: "Balaji Kumaraswaminathan",
    role: "Parent",
    topic: "Speed maths",
    quote:
      "My daughter attended the speed math class, and we are able to observe significant improvements in her. Now she is able to understand arithmetic better and is showing interest in maths. Thank you very much, Meena mam.",
  },
  {
    name: "Senthil D",
    role: "Parent",
    topic: "Olympiad",
    quote:
      "My kids have been doing the Olympiad course and other extracurricular activities here for more than 5 years. They are really very happy and enjoy all the activities at Dynamic Donalds.",
  },
  {
    name: "Joyce Candace",
    role: "Google review",
    topic: "Co-curricular",
    quote:
      "Excellent coaching. I really appreciate the teachers. Special training is given in academics, and students excel in academics as well as co-curricular activities. I really appreciate Meena mam for her dedication in grooming the students.",
  },
  {
    name: "Vikram Santhanam",
    role: "Google review",
    topic: "Academics",
    quote:
      "An excellent place to make your ward shine brighter in their academics. The way the experienced teachers handle the students is energetic and awesome. I would definitely recommend this educational institute.",
  },
  {
    name: "Vishnu Prasanna",
    role: "Parent",
    topic: "Visible progress",
    quote:
      "I have seen a lot of improvement in my daughter. The dedication towards teaching is very visible. I have suggested it to many of my friends, and they are satisfied with this institution.",
  },
  {
    name: "Dhivya Rajesh",
    role: "Parent",
    topic: "Child’s growth",
    quote:
      "It’s the best place where your child can learn a lot. The teachers handle the kids very well. My daughter loves this class, and I could see her growth evidently.",
  },
  {
    name: "Sujatha Sudhakar",
    role: "Parent",
    topic: "The right choice",
    quote:
      "As every parent does, I too had a wavering mind about choosing a good tuition centre. I feel glad I made the right choice by selecting DD.",
  },
  {
    name: "Jayalakshmi H",
    role: "Parent",
    topic: "Higher studies",
    quote: "My son studied in this institution for 4 years. I thank all the tutors. Meena mam and Thenu sir give ideas for higher studies to students.",
  },
  {
    name: "Vidhya Agoram",
    role: "Google review",
    topic: "Life skills",
    lang: "ta",
    quote:
      "கல்வி பாடத்தை மட்டும் கற்றுக்கொடுக்காமல் வாழ்க்கையை எதிர்க்கொள்ள தேவையான அனைத்தையும் கற்றுக் கொடுக்கும் இடம்தான் DD. Congrats Meena mam.",
    translation: "DD is a place that teaches not just lessons, but everything needed to face life. Congrats, Meena mam.",
  },
  {
    name: "Mythili Priya",
    role: "Google review",
    topic: "Skill development",
    quote: "A perfect institution with a clear goal that helps students identify and develop their skills.",
  },
  {
    name: "Nithesh Aravindh",
    role: "Student",
    topic: "Helpful teachers",
    quote: "Best tuition ever. Every single teacher helps in everything.",
  },
  {
    name: "Poomagal Palani",
    role: "Student",
    topic: "Caring tutors",
    quote: "The best tuition centre ever. Loving, caring and the most friendly tutors. Best days ever with Meena mam and Thenu sir.",
  },
  {
    name: "Harshad Umashankar",
    role: "Student",
    topic: "Feels like home",
    quote:
      "The best tuition I have ever had. It is not only a tuition, it is more than that: it is like home. All the teachers there are the best I have ever seen.",
  },
  {
    name: "Janani Selvan",
    role: "Student",
    topic: "Individual care",
    quote: "Pays attention to each and every student with the utmost care. Happy to be a part of DD.",
  },
];
