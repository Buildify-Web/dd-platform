import { Pill } from "@/components/ui/kit";

export type TeachingChange = { kind: "add" | "remove" | "keep"; grade: string; course: string; subject: string };

const sections = [
  { kind: "add", title: "Will be added", tone: "green" },
  { kind: "remove", title: "Will be removed", tone: "red" },
] as const;

/** One line per grade: "Grade 10 — English, Maths & Science (Maths)". Grouped so the admin can read it at a glance. */
function byGrade(rows: TeachingChange[]) {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const label = r.subject ? `${r.course} (${r.subject})` : r.course;
    map.set(r.grade, [...(map.get(r.grade) ?? []), label]);
  }
  return [...map.entries()];
}

/**
 * What a teacher's request changes. For a waiting request: what will be added and what will be
 * removed from what they teach now. For a decided one: what they asked to teach.
 */
export function TeachingChanges({ changes, decided }: { changes: TeachingChange[]; decided: boolean }) {
  if (changes.length === 0) return <p className="text-[13px] text-muted">No change to what they teach.</p>;

  if (decided) {
    const rows = byGrade(changes);
    return (
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-ink-soft">Asked to teach</p>
        <ul className="grid gap-1.5">
          {rows.map(([grade, items]) => (
            <li key={grade} className="grid grid-cols-[88px_1fr] gap-2 text-[13px]">
              <span className="text-ink">{grade}</span>
              <span className="text-ink-soft">{items.join(" · ")}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sections.map((s) => {
        const rows = changes.filter((c) => c.kind === s.kind);
        if (rows.length === 0) return null;
        return (
          <div key={s.kind}>
            <p className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-ink">
              <Pill tone={s.tone}>{rows.length}</Pill>
              {s.title}
            </p>
            <ul className="grid gap-1.5">
              {byGrade(rows).map(([grade, items]) => (
                <li key={grade} className="grid grid-cols-[88px_1fr] gap-2 text-[13px]">
                  <span className="text-ink">{grade}</span>
                  <span className="text-ink-soft">{items.join(" · ")}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
