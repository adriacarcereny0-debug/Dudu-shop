import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;

/** Conexión a Postgres (Neon). Solo en el servidor: DATABASE_URL nunca llega al navegador. */
export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta la variable DATABASE_URL. Revisa el README.");
    client = neon(url);
  }
  return client;
}
