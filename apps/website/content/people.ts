/**
 * Sample tutors, alumni and testimonials. Replace names, photos and text with real data.
 * Photos live in /public/images. `photo: null` renders the coloured silhouette tile from the design.
 */
import type { Tone } from "./courses";

export type Tutor = { name: string; qualification: string; years: number; tags: string[]; photo: string | null; tone: Tone };

export const tutors: Tutor[] = [
  { name: "Arjun Raghavan", qualification: "M.Sc. Mathematics, B.Ed.", years: 12, tags: ["Maths", "Grades 9–12"], photo: "/images/tutor-arjun.webp", tone: "brand" },
  { name: "Kavitha Srinivasan", qualification: "M.Sc. Physics", years: 9, tags: ["Science", "Olympiad"], photo: null, tone: "sun" },
  { name: "Meena Annamalai", qualification: "M.A. English, B.Ed.", years: 15, tags: ["English", "Spell Bee"], photo: "/images/tutor-english.webp", tone: "ink" },
  { name: "Priya Lakshmanan", qualification: "Jolly Phonics certified", years: 7, tags: ["Phonics", "Pre-KG – Gr. 2"], photo: null, tone: "sage" },
  { name: "Senthil Kumar", qualification: "M.Sc. Chemistry", years: 11, tags: ["Physics", "Chemistry"], photo: null, tone: "ink" },
  { name: "Divya Narayanan", qualification: "M.Com., CA Inter", years: 8, tags: ["Commerce", "Accounts"], photo: null, tone: "sun" },
];

export type Alumnus = { name: string; batch: string; now: string; photo: string | null; tone: Tone };

export const alumni: Alumnus[] = [
  { name: "Harini Venkatesh", batch: "2021", now: "Anna University, B.E. CSE", photo: null, tone: "brand" },
  { name: "Sneha Rajkumar", batch: "2020", now: "Madras Medical College", photo: "/images/alumni-graduate.webp", tone: "brand" },
  { name: "Karthik Subramanian", batch: "2019", now: "Software Engineer, Zoho", photo: null, tone: "ink" },
  { name: "Aditya Ramesh", batch: "2022", now: "Loyola College, B.Com.", photo: "/images/alumni-batch.webp", tone: "ink" },
];

export type Testimonial = {
  name: string;
  role: string;
  topic: string;
  quote: string;
  avatar: string | null;
  /** large photo shown on the testimonial card */
  photo: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Lakshmi Prakash",
    role: "Parent of a Grade 6 student",
    topic: "Daily updates",
    photo: "/images/feedback-parent.webp",
    quote: "I finally know what was taught every day. The class notes in the parent app keep me in the loop.",
    avatar: "/images/avatar-1.webp",
  },
  {
    name: "Ramesh Iyer",
    role: "Parent of a Grade 5 student",
    topic: "Olympiad",
    photo: "/images/achv-olympiad-winner.webp",
    quote: "The mock tests made all the difference. My son went into the Maths Olympiad calm and confident.",
    avatar: null,
  },
  {
    name: "Anitha Mohan",
    role: "Parent of a Grade 8 student",
    topic: "One-on-one",
    photo: "/images/achv-spellbee-2.webp",
    quote: "One-on-one online classes fit our schedule perfectly, and the tutor adjusts to my daughter’s pace.",
    avatar: "/images/avatar-3.webp",
  },
  {
    name: "Suresh Babu",
    role: "Parent of a Grade 10 student",
    topic: "Board Exams",
    photo: "/images/gallery-quiz-prep.webp",
    quote: "Weekly tests and honest feedback before the boards. Marks are shared in the app, so we saw progress.",
    avatar: null,
  },
  {
    name: "Deepa Karthik",
    role: "Parent of a UKG student",
    topic: "Phonics",
    photo: "/images/gallery-abc-blocks.webp",
    quote: "Within a few months of phonics, my little one started reading story books on her own.",
    avatar: "/images/avatar-5.webp",
  },
];
