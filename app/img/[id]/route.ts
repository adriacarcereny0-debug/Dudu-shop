import { UUID } from "@/lib/data";
import { db } from "@/lib/db";

/** Sirve una foto. Su contenido nunca cambia (cada subida tiene un id nuevo), así que se cachea un año. */
export async function GET(_request: Request, { params }: RouteContext<"/img/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const rows = await db()`select content_type, encode(data, 'base64') as data from images where id = ${id}`;
  if (!rows[0]) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(rows[0].data as string, "base64"), {
    headers: {
      "Content-Type": rows[0].content_type as string,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
