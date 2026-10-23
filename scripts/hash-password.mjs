// Uso: npm run hash-password -- "tu-contraseña"
// Devuelve el valor para la variable ADMIN_PASSWORD_HASH.
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Usa una contraseña de al menos 10 caracteres: npm run hash-password -- "tu-contraseña"');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
