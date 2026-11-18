import { GRADES, gradeLabel, type Grade } from "@dd/shared/domain";

/** ["PRE_KG", …, "GRADE_8"] → "Pre-KG – Grade 8"; gaps become "Grade 9, 11". */
export function gradeRange(grades: Grade[]) {
  const idx = [...new Set(grades)].map((g) => GRADES.indexOf(g)).sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < idx.length; i++) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1] === idx[j]! + 1) j++;
    const a = gradeLabel(GRADES[idx[i]!]!);
    const b = gradeLabel(GRADES[idx[j]!]!);
    parts.push(i === j ? a : j === i + 1 ? `${a}, ${b}` : `${a} – ${b}`);
    i = j;
  }
  return parts.join(", ") || "—";
}
