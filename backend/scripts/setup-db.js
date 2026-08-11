import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databaseDir = path.resolve(__dirname, "../database");

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL en variables de entorno.");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function runFile(fileName) {
  const sql = await fs.readFile(path.join(databaseDir, fileName), "utf8");
  await pool.query(sql);
  console.log(`SQL ejecutado: ${fileName}`);
}

try {
  await runFile("schema.sql");
  await runFile("seed.sql");
  console.log("Base de datos lista.");
} finally {
  await pool.end();
}

