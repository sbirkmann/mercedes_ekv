import { requireUser } from "@/lib/auth";
import { getSetting, EASYBILL_API_KEY } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function EinstellungenPage() {
  await requireUser();
  const key = (await getSetting(EASYBILL_API_KEY)) ?? "";
  return (
    <div>
      <PageHeader title="Einstellungen" description="Anwendungs- und Integrationseinstellungen" />
      <SettingsForm easybillKey={key} />
    </div>
  );
}
