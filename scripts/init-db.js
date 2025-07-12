// const { initializeDatabase } = require("../lib/database");
import { initializeDatabase } from "../lib/database";
async function initDb() {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

initDb();
