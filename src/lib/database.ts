import { Pool, type QueryResultRow } from '@neondatabase/serverless';
import { Expense, Category } from '@/types/expense';
import { mapCategoryRow, mapExpenseRow } from '@/lib/mappers';
import { normalizeSecurityAnswer, verifyPassword } from '@/lib/auth';

type QueryParam = string | number | boolean | null;
type ExpenseRow = Parameters<typeof mapExpenseRow>[0];
type CategoryRow = Parameters<typeof mapCategoryRow>[0];

declare global {
  var neonPool: Pool | undefined;
}

let initPromise: Promise<void> | null = null;

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to your Neon connection string');
  }

  if (!globalThis.neonPool) {
    globalThis.neonPool = new Pool({ connectionString });
  }

  return globalThis.neonPool;
}

async function query<T extends QueryResultRow>(sql: string, params: QueryParam[] = []) {
  return getPool().query<T>(sql, params);
}

export async function openDB() {
  const pool = getPool();

  return {
    all: async <T extends QueryResultRow>(sql: string, params: QueryParam[] = []) => {
      const result = await pool.query<T>(sql, params);
      return result.rows;
    },
    get: async <T extends QueryResultRow>(sql: string, params: QueryParam[] = []) => {
      const result = await pool.query<T>(sql, params);
      return result.rows[0];
    },
    run: async (sql: string, params: QueryParam[] = []) => {
      const result = await pool.query(sql, params);
      return { changes: result.rowCount ?? 0, lastID: result.rows[0]?.id };
    },
    exec: async (sql: string) => {
      await pool.query(sql);
    },
    close: async () => {},
  };
}

async function ensureSchema() {
  await query(`
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

  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT DEFAULT NULL');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer TEXT DEFAULT NULL');

  await query(`
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

  await query(`
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
}

export async function initDB() {
  if (!initPromise) {
    initPromise = ensureSchema().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

export async function getUserByEmail(email: string) {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

export async function createUser(email: string, name: string, hashedPassword: string, securityQuestion?: string, securityAnswer?: string) {
  const result = await query<{ id: number }>(
    `INSERT INTO users (email, name, password, security_question, security_answer)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [email, name, hashedPassword, securityQuestion || null, securityAnswer || null]
  );
  return result.rows[0].id;
}

export async function getUserExpenses(userId: number) {
  const result = await query<ExpenseRow>(
    `SELECT id, amount, category, payment_method, transaction_type, description, date, created_at::text AS created_at
     FROM expenses
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(mapExpenseRow);
}

export async function getUserExpenseById(userId: number, expenseId: string) {
  const result = await query<ExpenseRow>(
    `SELECT id, amount, category, payment_method, transaction_type, description, date, created_at::text AS created_at
     FROM expenses
     WHERE user_id = $1 AND id = $2`,
    [userId, expenseId]
  );
  const expense = result.rows[0];
  return expense ? mapExpenseRow(expense) : null;
}

export async function createExpense(userId: number, expense: Omit<Expense, 'createdAt'>) {
  const result = await query(
    `INSERT INTO expenses (id, user_id, amount, category, payment_method, transaction_type, description, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      expense.id,
      userId,
      expense.amount,
      expense.category,
      expense.paymentMethod,
      expense.transactionType,
      expense.description || null,
      expense.date,
    ]
  );
  return { changes: result.rowCount ?? 0 };
}

export async function deleteExpense(userId: number, expenseId: string) {
  const result = await query(
    'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
    [expenseId, userId]
  );
  return { changes: result.rowCount ?? 0 };
}

export async function updateExpense(userId: number, expenseId: string, updates: Partial<Expense>) {
  const dbUpdates: Record<string, string | number | null> = {};
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.transactionType !== undefined) dbUpdates.transaction_type = updates.transactionType;
  if (updates.createdAt !== undefined) dbUpdates.created_at = updates.createdAt;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.date !== undefined) dbUpdates.date = updates.date;

  const fields = Object.keys(dbUpdates);
  if (fields.length === 0) {
    return getUserExpenseById(userId, expenseId);
  }

  const values = Object.values(dbUpdates);
  const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

  await query(
    `UPDATE expenses SET ${setClause} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}`,
    [...values, expenseId, userId]
  );
  return getUserExpenseById(userId, expenseId);
}

export async function getUserCategories(userId: number) {
  const result = await query<CategoryRow>(
    'SELECT id, name, color, is_default FROM categories WHERE user_id = $1 ORDER BY name ASC',
    [userId]
  );
  return result.rows.map(mapCategoryRow);
}

export async function createCategory(userId: number, category: Omit<Category, 'id'> & { id: string }) {
  const result = await query(
    'INSERT INTO categories (id, user_id, name, color, is_default) VALUES ($1, $2, $3, $4, $5)',
    [category.id, userId, category.name, category.color, category.isDefault]
  );
  return { changes: result.rowCount ?? 0 };
}

export async function deleteCategory(userId: number, categoryId: string) {
  const result = await query(
    'DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = FALSE',
    [categoryId, userId]
  );
  return { changes: result.rowCount ?? 0 };
}

export async function getUserSecurityQuestion(email: string) {
  const result = await query<{ security_question: string | null }>(
    'SELECT security_question FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0]?.security_question;
}

export async function verifySecurityAnswer(email: string, answer: string) {
  const result = await query<{ id: number; security_answer: string | null }>(
    'SELECT id, security_answer FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];

  if (!user?.security_answer) {
    return null;
  }

  const normalizedAnswer = normalizeSecurityAnswer(answer);
  const storedAnswer = String(user.security_answer);
  const answerMatches = storedAnswer.startsWith('$2')
    ? await verifyPassword(normalizedAnswer, storedAnswer)
    : storedAnswer.toLowerCase() === normalizedAnswer;

  if (answerMatches) {
    return user.id;
  }
  return null;
}

export async function updateUserPassword(userId: number, newPassword: string) {
  const result = await query(
    'UPDATE users SET password = $1 WHERE id = $2',
    [newPassword, userId]
  );
  return { changes: result.rowCount ?? 0 };
}

export async function deleteUser(userId: number) {
  await query('DELETE FROM expenses WHERE user_id = $1', [userId]);
  await query('DELETE FROM categories WHERE user_id = $1', [userId]);

  const result = await query('DELETE FROM users WHERE id = $1', [userId]);
  return { changes: result.rowCount ?? 0 };
}

export async function deleteUserData(userId: number) {
  await query('DELETE FROM expenses WHERE user_id = $1', [userId]);
  await query('DELETE FROM categories WHERE user_id = $1', [userId]);
}
