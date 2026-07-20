import { Pool } from "@neondatabase/serverless";

let pool: Pool | null = null;

/**
 * Client from `pool.connect()`.
 * Typed manually because Neon Pool.connect overloads confuse ReturnType.
 */
export type DbClient = {
  query: Pool["query"];
  release: () => void;
};

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
