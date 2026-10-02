// Aplica db/schema.sql à base de dados do DATABASE_URL (role dona).
// Uso: npm run db:setup
// Usa uma ligação por WebSocket (Pool) e o protocolo simples do Postgres, que aceita vários
// comandos de uma vez; alguns editores enviam o script como "prepared statement" e falham com
// "cannot insert multiple commands into a prepared statement".
import { readFile } from "node:fs/promises";
import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida (confirma o .env.local).");
  process.exit(1);
}

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(schema);
  console.log("Esquema aplicado.");
} catch (err) {
  console.error("Erro ao aplicar o esquema:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
