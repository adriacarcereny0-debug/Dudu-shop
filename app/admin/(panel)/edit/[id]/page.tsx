import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getCategories, getProduct } from "@/lib/data";
import { ProductForm } from "../../product-form";

export default async function EditProductPage({ params }: PageProps<"/admin/edit/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), getCategories()]);
  if (!product) notFound();
  return <ProductForm key={product.id} product={product} categories={categories} />;
}
