"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { btn } from "@/components/ui/kit";
import { markNotificationRead } from "@/lib/actions";

/** "Review" / "Verify" / "Open": marks the notification read, then opens its page. */
export function NotificationAction({ id, href, label, read }: { id: string; href: string | null; label: string; read: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Only follow links inside the portal.
  const safe = href && href.startsWith("/") && !href.startsWith("//") ? href : null;
  return (
    <button
      type="button"
      disabled={pending}
      className={read ? btn.whiteSm : btn.darkSm}
      onClick={() =>
        start(async () => {
          if (!read) await markNotificationRead(id);
          if (safe) router.push(safe);
        })
      }
    >
      {pending && <span className="spinner size-3.5" />}
      {safe ? label : read ? "Read" : "Mark read"}
    </button>
  );
}
