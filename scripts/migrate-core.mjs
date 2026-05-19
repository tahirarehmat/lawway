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
import { readdirSync } from "node:fs";

const schemaDir = join(__dirname, "..", "schema");
const schemaFiles = readdirSync(schemaDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env or your environment.");
  process.exit(1);
}

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString });

try {
  for (const file of schemaFiles) {
    const sql = readFileSync(join(schemaDir, file), "utf8");
    await pool.query(sql);
    console.log(`Migration applied: schema/${file}`);
  }
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  await pool.end();
}
