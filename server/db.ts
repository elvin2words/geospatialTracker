// server/db.ts
// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-serverless';
// import ws from "ws";
// import * as schema from "@shared/schema";

// neonConfig.webSocketConstructor = ws;

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

// export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// export const db = drizzle({ client: pool, schema });

import "dotenv/config";
import type { PostgresJsDatabase } from "drizzle-orm/node-postgres";
import type { NeonHttpDatabase } from "drizzle-orm/neon-serverless";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set (e.g. in .env). Did you forget to provision a database?",
  );
}

const url = process.env.DATABASE_URL;

// ---------- helper to make the right DB client ----------
async function initDB():
  Promise<
    | BetterSQLite3Database<typeof schema>
    | NeonHttpDatabase<typeof schema>
    | PostgresJsDatabase<typeof schema>
  > {
  // 1) SQLite  -------------------------------------------------------------
  if (url.startsWith("file:")) {
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const Database = (await import("better-sqlite3")).default;
    const sqlite = new Database(url.replace(/^file:/, ""));
    return drizzle(sqlite, { schema });
  }

  // 2) Neon serverless PostgreSQL  ----------------------------------------
  if (url.includes(".neon.tech")) {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const ws = (await import("ws")).default;
    neonConfig.webSocketConstructor = ws;

    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const pool = new Pool({ connectionString: url });
    return drizzle({ client: pool, schema });
  }

  // 3) Local / other PostgreSQL  ------------------------------------------
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}

// ---------- export a ready-to-use singleton DB ----------
export const db = await initDB();
