import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { Expense, Category } from '@/types/expense';

const DB_PATH = path.join(process.cwd(), 'database.sqlite');

export async function openDB() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
}

export async function initDB() {
  const db = await openDB();
  
  // Create users table with all columns
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

  // Check if security columns exist and add them if they don't
  const tableInfo = await db.all('PRAGMA table_info(users)');
  const hasSecurityQuestion = tableInfo.some(col => col.name === 'security_question');
  const hasSecurityAnswer = tableInfo.some(col => col.name === 'security_answer');

  if (!hasSecurityQuestion) {
    await db.exec('ALTER TABLE users ADD COLUMN security_question TEXT DEFAULT NULL');
  }

  if (!hasSecurityAnswer) {
    await db.exec('ALTER TABLE users ADD COLUMN security_answer TEXT DEFAULT NULL');
  }
  
  // Create expenses table
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
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);
  
  // Create categories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);
  
  await db.close();
}

export async function getUserByEmail(email: string) {
  const db = await openDB();
  const user = await db.get(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  await db.close();
  return user;
}

export async function createUser(email: string, name: string, hashedPassword: string, securityQuestion?: string, securityAnswer?: string) {
  const db = await openDB();
  const result = await db.run(
    'INSERT INTO users (email, name, password, security_question, security_answer) VALUES (?, ?, ?, ?, ?)',
    [email, name, hashedPassword, securityQuestion || null, securityAnswer || null]
  );
  await db.close();
  return result.lastID;
}

export async function getUserExpenses(userId: number) {
  const db = await openDB();
  const expenses = await db.all(
    'SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  await db.close();
  
  // Map database field names to TypeScript interface
  return expenses.map(expense => ({
    id: expense.id,
    amount: expense.amount,
    category: expense.category,
    paymentMethod: expense.payment_method,
    transactionType: expense.transaction_type,
    description: expense.description,
    date: expense.date,
    createdAt: expense.created_at,
  }));
}

export async function createExpense(userId: number, expense: Omit<Expense, 'createdAt'>) {
  const db = await openDB();
  const result = await db.run(
    `INSERT INTO expenses (id, user_id, amount, category, payment_method, transaction_type, description, date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.id,
      userId,
      expense.amount,
      expense.category,
      expense.paymentMethod,
      expense.transactionType,
      expense.description,
      expense.date,
    ]
  );
  await db.close();
  return result;
}

export async function deleteExpense(userId: number, expenseId: string) {
  const db = await openDB();
  const result = await db.run(
    'DELETE FROM expenses WHERE id = ? AND user_id = ?',
    [expenseId, userId]
  );
  await db.close();
  return result;
}

export async function updateExpense(userId: number, expenseId: string, updates: Partial<Expense>) {
  const db = await openDB();
  
  // Map camelCase to snake_case for database
  const dbUpdates: Record<string, string | number> = {};
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.transactionType !== undefined) dbUpdates.transaction_type = updates.transactionType;
  if (updates.createdAt !== undefined) dbUpdates.created_at = updates.createdAt;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  
  const fields = Object.keys(dbUpdates);
  const values = Object.values(dbUpdates);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  
  const result = await db.run(
    `UPDATE expenses SET ${setClause} WHERE id = ? AND user_id = ?`,
    [...values, expenseId, userId]
  );
  await db.close();
  return result;
}

export async function getUserCategories(userId: number) {
  const db = await openDB();
  const categories = await db.all(
    'SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC',
    [userId]
  );
  await db.close();
  return categories;
}

export async function createCategory(userId: number, category: Omit<Category, 'id'> & { id: string }) {
  const db = await openDB();
  const result = await db.run(
    'INSERT INTO categories (id, user_id, name, color, is_default) VALUES (?, ?, ?, ?, ?)',
    [category.id, userId, category.name, category.color, category.isDefault]
  );
  await db.close();
  return result;
}

export async function deleteCategory(userId: number, categoryId: string) {
  const db = await openDB();
  const result = await db.run(
    'DELETE FROM categories WHERE id = ? AND user_id = ? AND is_default = FALSE',
    [categoryId, userId]
  );
  await db.close();
  return result;
}

export async function getUserSecurityQuestion(email: string) {
  const db = await openDB();
  const user = await db.get(
    'SELECT security_question FROM users WHERE email = ?',
    [email]
  );
  await db.close();
  return user?.security_question;
}

export async function verifySecurityAnswer(email: string, answer: string) {
  const db = await openDB();
  const user = await db.get(
    'SELECT id, security_answer FROM users WHERE email = ?',
    [email]
  );
  await db.close();
  
  if (user && user.security_answer.toLowerCase() === answer.toLowerCase()) {
    return user.id;
  }
  return null;
}

export async function updateUserPassword(userId: number, newPassword: string) {
  const db = await openDB();
  const result = await db.run(
    'UPDATE users SET password = ? WHERE id = ?',
    [newPassword, userId]
  );
  await db.close();
  return result;
}

export async function deleteUser(userId: number) {
  const db = await openDB();
  
  // Delete all user data first
  await db.run('DELETE FROM expenses WHERE user_id = ?', [userId]);
  await db.run('DELETE FROM categories WHERE user_id = ?', [userId]);
  
  // Delete the user
  const result = await db.run('DELETE FROM users WHERE id = ?', [userId]);
  
  await db.close();
  return result;
}

export async function deleteUserData(userId: number) {
  const db = await openDB();
  
  // Delete all user data but keep the account
  await db.run('DELETE FROM expenses WHERE user_id = ?', [userId]);
  await db.run('DELETE FROM categories WHERE user_id = ?', [userId]);
  
  await db.close();
}
