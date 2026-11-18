import { redirect } from "next/navigation";
import { dashboardPath, getSession } from "@/lib/session";

/** "Back to my dashboard": sends each user to their own role's home. */
export default async function DashboardRedirect() {
  const state = await getSession();
  if (state.status === "expired") redirect("/session-expired");
  if (state.status === "signed-out") redirect("/");
  redirect(dashboardPath(state.me.user.role));
}
