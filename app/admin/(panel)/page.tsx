import { requireAdminPage } from "@/lib/auth";
import { getAllProducts } from "@/lib/data";
import { ProductList } from "./product-list";

export default async function AdminPage() {
  await requireAdminPage();
  return <ProductList products={await getAllProducts()} />;
}
