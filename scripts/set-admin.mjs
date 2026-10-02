// Define a conta única de administração (username + password) de /admincp.
// Uso: npm run admin:set -- <username>
// Se a conta já existir, substitui o username e a password e termina todas as sessões.
// Lê DATABASE_URL do .env.local; a password é pedida no terminal.
import { createInterface } from "node:readline/promises";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const username = process.argv[2]?.trim();
if (!username) {
  console.error("Uso: npm run admin:set -- <username>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida (confirma o .env.local).");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question(`Password para "${username}": `);
rl.close();

if (password.length < 12) {
  console.error("A password tem de ter pelo menos 12 caracteres.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const hash = await bcrypt.hash(password, 12);
await sql`
  INSERT INTO admin (id, username, password_hash)
  VALUES (1, ${username}, ${hash})
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    password_alterada_em = now(),
    sessao_versao = admin.sessao_versao + 1
`;
console.log(`Conta de administração definida: "${username}".`);
