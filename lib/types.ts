export type ProductStatus = "available" | "reserved" | "sold_out";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number | null;
  show_price: boolean;
  sizes: string[];
  colors: string[];
  stock: number;
  status: ProductStatus;
  is_new: boolean;
  published: boolean;
  position: number;
  images: string[];
  created_at: string;
  updated_at: string;
};

/** Campos que el administrador edita desde el formulario. */
export type ProductInput = Pick<
  Product,
  | "name"
  | "description"
  | "category"
  | "price"
  | "show_price"
  | "sizes"
  | "colors"
  | "stock"
  | "status"
  | "is_new"
  | "published"
  | "images"
>;

export type Settings = {
  store_name: string;
  tagline: string;
  whatsapp_number: string;
  instagram: string;
  show_prices: boolean;
};

/** Producto tal y como llega al catálogo público (sin precio si está oculto). */
export type PublicProduct = Omit<Product, "price" | "show_price" | "published" | "position" | "created_at" | "updated_at"> & {
  price: number | null;
};
