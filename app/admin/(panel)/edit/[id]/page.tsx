import { notFound } from "next/navigation";
import { getCategories } from "@/lib/admin-data";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { ProductForm } from "../../product-form";

export default async function EditProductPage({ params }: PageProps<"/admin/edit/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data }, categories] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    getCategories(),
  ]);
  if (!data) notFound();

  return <ProductForm key={data.id} product={data as Product} categories={categories} />;
}
