import { requireAdminPage } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdminPage();
  return <SettingsForm initial={await getSettings()} />;
}
