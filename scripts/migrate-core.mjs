/**
 * Applies schema/001_core_cases.sql to DATABASE_URL.
 * Usage: npm run db:migrate
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "schema", "001_core_cases.sql");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env or your environment.");
  process.exit(1);
}

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString });
const sql = readFileSync(schemaPath, "utf8");

try {
  await pool.query(sql);
  console.log("Migration applied: schema/001_core_cases.sql");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  await pool.end();
}
