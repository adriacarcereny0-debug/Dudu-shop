// Crea o actualiza las tablas: DATABASE_URL=... npm run db:migrate
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

// Separa las sentencias respetando los bloques $$ … $$.
const statements = [];
let current = "";
let inDollar = false;
for (const line of schema.split("\n")) {
  if (line.trim().startsWith("--") && !inDollar) continue;
  current += line + "\n";
  if ((line.match(/\$\$/g) ?? []).length % 2 === 1) inDollar = !inDollar;
  if (!inDollar && line.trim().endsWith(";")) {
    statements.push(current.trim());
    current = "";
  }
}
for (const statement of statements) await sql.query(statement);
console.log(`Esquema aplicado (${statements.length} sentencias).`);
