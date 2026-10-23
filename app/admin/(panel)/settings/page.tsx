import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/utils";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("store_name, tagline, whatsapp_number, instagram, show_prices")
    .eq("id", 1)
    .maybeSingle();

  return <SettingsForm initial={(data as Settings | null) ?? DEFAULT_SETTINGS} />;
}
