import { PortalShell } from "@/components/portal/Shell";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";

/** Admin portal frame. Each page still runs its own requireAdmin() guard. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin("/admin");
  const counts = await api<Record<string, number>>("/v1/meta/counts", "admin");
  return (
    <PortalShell me={me} counts={counts}>
      {children}
    </PortalShell>
  );
}
