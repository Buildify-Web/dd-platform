import { Avatar, Card, cx, Pill } from "@/components/ui/kit";
import { api, param, type SearchParams } from "@/lib/api";
import { ProfileForms } from "./ProfileForms";

type Profile = {
  profile: {
    id: string;
    name: string;
    email: string;
    mobile: string | null;
    designation: string;
    subject: string | null;
    staffCode: string | null;
    role: "ADMIN" | "STAFF";
    isMainAdmin: boolean;
    preferences: Record<string, boolean>;
    appearsAs: string | null;
    parentLabel: string | null;
    classesLabel: string | null;
    grades: string[];
  };
  stats: { label: string; value: string }[];
};

/** My profile (both portals): summary card, Profile / Security / Notifications tabs. */
export async function ProfileView({ portal, searchParams }: { portal: "admin" | "staff"; searchParams: SearchParams }) {
  const sp = await searchParams;
  const tab = ["profile", "security", "notifications"].includes(param(sp.tab)) ? param(sp.tab) : "profile";
  const d = await api<Profile>("/v1/profile", portal);
  const p = d.profile;
  const tabs = [
    ["profile", "Profile"],
    ["security", "Security"],
    ["notifications", "Notifications"],
  ] as const;
  return (
    <>
      <h1 className="mb-4 flex items-baseline gap-3 text-[clamp(1.4rem,2.2vw,1.65rem)] font-normal">
        My Profile <span className="text-[12.5px] text-muted">Account</span>
      </h1>
      <Card className="mb-3 overflow-hidden !p-0">
        <div className="h-24 bg-[linear-gradient(120deg,#2b7010,#17260f)] sm:h-28" />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5 sm:px-6">
          <div className="-mt-10 rounded-[22px] border-4 border-white">
            <Avatar name={p.name} size={76} tone="bg-sun" square />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-semibold">{p.name}</h2>
              <Pill tone={p.role === "ADMIN" ? "sun" : "sage"}>{p.role === "ADMIN" ? (p.isMainAdmin ? "Owner · Full access" : "Admin · Full access") : "Staff"}</Pill>
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted [overflow-wrap:break-word]">
              {[p.designation, p.email, p.staffCode].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            {d.stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-frame px-3.5 py-2.5 text-center sm:min-w-[120px]">
                <p className="text-[16px] font-semibold tabular-nums">{s.value}</p>
                <p className="text-[11.5px] text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <div className="mb-3 flex gap-1 rounded-full bg-soft p-1 sm:inline-flex" role="tablist">
        {tabs.map(([k, label]) => (
          <a
            key={k}
            role="tab"
            aria-selected={tab === k}
            href={`/${portal}/profile?tab=${k}`}
            className={cx("flex h-9 flex-1 items-center justify-center rounded-full px-4 text-[13.5px] transition-colors sm:flex-none", tab === k ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}
          >
            {label}
          </a>
        ))}
      </div>
      <ProfileForms tab={tab} portal={portal} profile={p} />
    </>
  );
}
