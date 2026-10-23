const MAX_SIDE = 1440;
const QUALITY = 0.82;
const PASSTHROUGH = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Redimensiona en el móvil antes de subir: fotos de 5-10 MB pasan a ~200-400 KB. */
async function compress(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (PASSTHROUGH.includes(file.type) && file.size <= 5 * 1024 * 1024) return file;
    throw new Error("Formato de imagen no compatible. Prueba con JPG o PNG.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

  // Algunos Safari antiguos no generan WebP: en ese caso usamos JPEG.
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("No se pudo procesar la imagen.");
  return jpeg;
}

/** Sube la foto y devuelve su ruta pública (/img/<id>). */
export async function uploadImage(file: File): Promise<string> {
  const blob = await compress(file);
  const body = new FormData();
  body.append("file", blob);
  const response = await fetch("/api/images", { method: "POST", body }).catch(() => null);
  if (!response?.ok) {
    if (response?.status === 401) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    throw new Error("No se pudo subir la foto. Revisa tu conexión.");
  }
  return ((await response.json()) as { url: string }).url;
}
