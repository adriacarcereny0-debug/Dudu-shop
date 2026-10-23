import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { ProductList } from "./product-list";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="m-4 rounded-xl bg-danger/10 p-4 text-danger">Error al cargar productos: {error.message}</p>;
  }

  return <ProductList products={data as Product[]} />;
}
