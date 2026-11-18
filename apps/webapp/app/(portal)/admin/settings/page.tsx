import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/kit";
import { api, type SearchParams } from "@/lib/api";
import { requireAdmin } from "@/lib/portal";
import { SettingsForm, type Settings } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

/** Institute settings: attendance times, RFID rules, reports thresholds, payment details, reminders. */
export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/settings");
  void (await searchParams);
  const { settings } = await api<{ settings: Settings }>("/v1/settings");
  return (
    <>
      <PageHeader title="Settings" crumb="System / Settings" />
      <div className="grid gap-3 lg:grid-cols-2">
        <SettingsForm s={settings} />
        <Card title="About these settings" className="self-start">
          <ul className="grid gap-2.5 text-[13.5px] text-ink-soft">
            <li>Times are India time (IST).</li>
            <li>Late marks compare the RFID tap time with the cut-off for the session.</li>
            <li>Changes are written to the audit log with the old and new values.</li>
            <li>Payment details are shown to parents on the payment page in the app.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
