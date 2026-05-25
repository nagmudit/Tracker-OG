const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function initDb() {
  const db = await open({
    filename: path.join(process.cwd(), "database.sqlite"),
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      security_question TEXT DEFAULT NULL,
      security_answer TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const tableInfo = await db.all("PRAGMA table_info(users)");
  const columns = new Set(tableInfo.map((column) => column.name));

  if (!columns.has("security_question")) {
    await db.exec("ALTER TABLE users ADD COLUMN security_question TEXT DEFAULT NULL");
  }

  if (!columns.has("security_answer")) {
    await db.exec("ALTER TABLE users ADD COLUMN security_answer TEXT DEFAULT NULL");
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  await db.close();
  console.log("Database initialized successfully");
}

initDb().catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exitCode = 1;
});
