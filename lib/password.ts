import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** Comprueba la contraseña contra ADMIN_PASSWORD_HASH ("scrypt:<sal>:<hash>", generado con `npm run hash-password`). */
export async function verifyAdminPassword(password: string) {
  const stored = process.env.ADMIN_PASSWORD_HASH ?? "";
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) throw new Error("ADMIN_PASSWORD_HASH no está configurada.");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}
