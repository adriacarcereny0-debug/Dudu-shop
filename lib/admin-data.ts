import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("category");
  return Array.from(new Set((data ?? []).map((r) => r.category as string).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}
