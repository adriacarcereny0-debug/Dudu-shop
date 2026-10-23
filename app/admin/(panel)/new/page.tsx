import { getCategories } from "@/lib/admin-data";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  return <ProductForm categories={await getCategories()} />;
}
