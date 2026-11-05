/** Grade levels offered (Pre-KG to Grade 12). Moves to packages/shared/constants later. */
export const GRADES = [
  "Pre-KG",
  "LKG",
  "UKG",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export type Grade = (typeof GRADES)[number];

export const ENQUIRY_INTERESTS = [
  "Regular tuition",
  "Olympiad",
  "Spell Bee",
  "Phonics",
  "Grade 11–12 subjects",
  "Not sure yet",
] as const;

export type EnquiryInterest = (typeof ENQUIRY_INTERESTS)[number];
