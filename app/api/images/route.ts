import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const TYPES = ["image/webp", "image/jpeg", "image/png", "image/avif"];
const MAX_BYTES = 2 * 1024 * 1024;

/** Sube una foto (solo administrador). Devuelve su ruta pública /img/<id>. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Falta la foto" }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Formato no válido" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "La foto pesa demasiado" }, { status: 400 });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const rows = await db()`
    insert into images (content_type, data) values (${file.type}, decode(${base64}, 'base64')) returning id`;
  return NextResponse.json({ url: `/img/${rows[0].id}` });
}
