import { PortalShell } from "@/components/portal/Shell";
import { api } from "@/lib/api";
import { requireStaff } from "@/lib/portal";

/** Staff portal frame. Each page still runs its own requireStaff() guard. */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff("/staff");
  const counts = await api<Record<string, number>>("/v1/meta/counts", "staff");
  return (
    <PortalShell me={me} counts={counts}>
      {children}
    </PortalShell>
  );
}
