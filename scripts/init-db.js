const { Pool } = require("@neondatabase/serverless");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to your Neon connection string");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        security_question TEXT DEFAULT NULL,
        security_answer TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT DEFAULT NULL");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer TEXT DEFAULT NULL");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        category TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    console.log("Neon database initialized successfully");
  } finally {
    await pool.end();
  }
}

initDb().catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exitCode = 1;
});
