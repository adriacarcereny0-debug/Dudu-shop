import { requireAdminPage } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  await requireAdminPage();
  return <ProductForm categories={await getCategories()} />;
}
