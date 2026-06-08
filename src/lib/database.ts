import { Pool, type QueryResultRow } from '@neondatabase/serverless';
import { addMonths, addWeeks, addYears, format } from 'date-fns';
import { Expense, Category, ScheduledTransaction } from '@/types/expense';
import {
  SplitEvent,
  SplitExpense,
  SplitExpenseShare,
  SplitParticipant,
  SplitSettlement,
} from '@/types/split';
import { mapCategoryRow, mapExpenseRow, mapScheduledTransactionRow } from '@/lib/mappers';
import { normalizeSecurityAnswer, verifyPassword } from '@/lib/auth';
import { hydrateSplitEvent } from '@/lib/split-utils';

type QueryParam = string | number | boolean | null;
type ExpenseRow = Parameters<typeof mapExpenseRow>[0];
type CategoryRow = Parameters<typeof mapCategoryRow>[0];
type ScheduledTransactionRow = Parameters<typeof mapScheduledTransactionRow>[0];
type SplitEventRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};
type SplitParticipantRow = {
  id: string;
  event_id: string;
  name: string;
  is_self: boolean | number;
  created_at: string;
};
type SplitExpenseRow = {
  id: string;
  event_id: string;
  title: string;
  amount: number;
  payer_participant_id: string;
  category: string | null;
  note: string | null;
  date: string;
  created_at: string;
};
type SplitExpenseShareRow = {
  id: string;
  expense_id: string;
  participant_id: string;
  amount: number;
};
type SplitSettlementRow = {
  id: string;
  event_id: string;
  from_participant_id: string;
  to_participant_id: string;
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
};

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

  await query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS generated_schedule_id TEXT DEFAULT NULL');
  await query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS generated_schedule_date TEXT DEFAULT NULL');
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS expenses_generated_schedule_once
    ON expenses (user_id, generated_schedule_id, generated_schedule_date)
    WHERE generated_schedule_id IS NOT NULL AND generated_schedule_date IS NOT NULL
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

  await query(`
    CREATE TABLE IF NOT EXISTS scheduled_transactions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      category TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL,
      next_run_date TEXT NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS split_events (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS split_participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_self BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES split_events (id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS split_participants_unique_name
    ON split_participants (event_id, lower(name));
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS split_expenses (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      payer_participant_id TEXT NOT NULL,
      category TEXT,
      note TEXT,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES split_events (id) ON DELETE CASCADE,
      FOREIGN KEY (payer_participant_id) REFERENCES split_participants (id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS split_expense_shares (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      FOREIGN KEY (expense_id) REFERENCES split_expenses (id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES split_participants (id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS split_settlements (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      from_participant_id TEXT NOT NULL,
      to_participant_id TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES split_events (id) ON DELETE CASCADE,
      FOREIGN KEY (from_participant_id) REFERENCES split_participants (id) ON DELETE CASCADE,
      FOREIGN KEY (to_participant_id) REFERENCES split_participants (id) ON DELETE CASCADE
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
    `SELECT id, amount, category, payment_method, transaction_type, description, date,
       generated_schedule_id, generated_schedule_date, created_at::text AS created_at
     FROM expenses
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(mapExpenseRow);
}

export async function getUserExpenseById(userId: number, expenseId: string) {
  const result = await query<ExpenseRow>(
    `SELECT id, amount, category, payment_method, transaction_type, description, date,
       generated_schedule_id, generated_schedule_date, created_at::text AS created_at
     FROM expenses
     WHERE user_id = $1 AND id = $2`,
    [userId, expenseId]
  );
  const expense = result.rows[0];
  return expense ? mapExpenseRow(expense) : null;
}

export async function createExpense(userId: number, expense: Omit<Expense, 'createdAt'>) {
  const result = await query(
    `INSERT INTO expenses (
       id, user_id, amount, category, payment_method, transaction_type, description, date,
       generated_schedule_id, generated_schedule_date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      expense.id,
      userId,
      expense.amount,
      expense.category,
      expense.paymentMethod,
      expense.transactionType,
      expense.description || null,
      expense.date,
      expense.generatedFromScheduleId || null,
      expense.generatedForDate || null,
    ]
  );
  return { changes: result.rowCount ?? 0 };
}

export async function createExpenses(userId: number, expenses: Omit<Expense, 'createdAt'>[]) {
  if (expenses.length === 0) return { changes: 0 };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];
  const valueStrings: string[] = [];
  
  expenses.forEach((expense, index) => {
    const offset = index * 10;
    valueStrings.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);
    
    values.push(
      expense.id,
      userId,
      expense.amount,
      expense.category,
      expense.paymentMethod,
      expense.transactionType,
      expense.description || null,
      expense.date,
      expense.generatedFromScheduleId || null,
      expense.generatedForDate || null
    );
  });

  const result = await query(
    `INSERT INTO expenses (
       id, user_id, amount, category, payment_method, transaction_type, description, date,
       generated_schedule_id, generated_schedule_date
     )
     VALUES ${valueStrings.join(', ')}`,
    values
  );
  
  return { changes: result.rowCount ?? 0 };
}

export async function getUserScheduledTransactions(userId: number) {
  const result = await query<ScheduledTransactionRow>(
    `SELECT id, title, amount, category, payment_method, transaction_type, description,
       frequency, next_run_date, active, created_at::text AS created_at
     FROM scheduled_transactions
     WHERE user_id = $1
     ORDER BY active DESC, next_run_date ASC, created_at DESC`,
    [userId]
  );
  return result.rows.map(mapScheduledTransactionRow);
}

export async function getUserScheduledTransactionById(userId: number, scheduleId: string) {
  const result = await query<ScheduledTransactionRow>(
    `SELECT id, title, amount, category, payment_method, transaction_type, description,
       frequency, next_run_date, active, created_at::text AS created_at
     FROM scheduled_transactions
     WHERE user_id = $1 AND id = $2`,
    [userId, scheduleId]
  );
  const schedule = result.rows[0];
  return schedule ? mapScheduledTransactionRow(schedule) : null;
}

export async function createScheduledTransaction(
  userId: number,
  schedule: Omit<ScheduledTransaction, 'createdAt'>
) {
  await query(
    `INSERT INTO scheduled_transactions (
       id, user_id, title, amount, category, payment_method, transaction_type,
       description, frequency, next_run_date, active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      schedule.id,
      userId,
      schedule.title,
      schedule.amount,
      schedule.category,
      schedule.paymentMethod,
      schedule.transactionType,
      schedule.description || null,
      schedule.frequency,
      schedule.nextRunDate,
      schedule.active,
    ]
  );

  return getUserScheduledTransactionById(userId, schedule.id);
}

export async function updateScheduledTransaction(
  userId: number,
  scheduleId: string,
  updates: Partial<ScheduledTransaction>
) {
  const dbUpdates: Record<string, string | number | boolean | null> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.transactionType !== undefined) dbUpdates.transaction_type = updates.transactionType;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
  if (updates.nextRunDate !== undefined) dbUpdates.next_run_date = updates.nextRunDate;
  if (updates.active !== undefined) dbUpdates.active = updates.active;

  const fields = Object.keys(dbUpdates);
  if (fields.length === 0) {
    return getUserScheduledTransactionById(userId, scheduleId);
  }

  const values = Object.values(dbUpdates);
  const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

  await query(
    `UPDATE scheduled_transactions SET ${setClause}
     WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}`,
    [...values, scheduleId, userId]
  );
  return getUserScheduledTransactionById(userId, scheduleId);
}

export async function deleteScheduledTransaction(userId: number, scheduleId: string) {
  const result = await query(
    'DELETE FROM scheduled_transactions WHERE id = $1 AND user_id = $2',
    [scheduleId, userId]
  );
  return { changes: result.rowCount ?? 0 };
}

function getNextScheduleState(
  runDate: string,
  frequency: ScheduledTransaction['frequency']
) {
  if (frequency === 'once') {
    return { nextRunDate: runDate, active: false };
  }

  const date = new Date(`${runDate}T00:00:00`);
  const nextDate =
    frequency === 'weekly'
      ? addWeeks(date, 1)
      : frequency === 'monthly'
        ? addMonths(date, 1)
        : addYears(date, 1);

  return { nextRunDate: format(nextDate, 'yyyy-MM-dd'), active: true };
}

async function createGeneratedExpense(
  userId: number,
  schedule: ScheduledTransaction,
  runDate: string
) {
  const result = await query<ExpenseRow>(
    `INSERT INTO expenses (
       id, user_id, amount, category, payment_method, transaction_type, description,
       date, generated_schedule_id, generated_schedule_date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id, generated_schedule_id, generated_schedule_date)
     WHERE generated_schedule_id IS NOT NULL AND generated_schedule_date IS NOT NULL
     DO NOTHING
     RETURNING id, amount, category, payment_method, transaction_type, description, date,
       generated_schedule_id, generated_schedule_date, created_at::text AS created_at`,
    [
      crypto.randomUUID(),
      userId,
      schedule.amount,
      schedule.category,
      schedule.paymentMethod,
      schedule.transactionType,
      schedule.description || schedule.title,
      runDate,
      schedule.id,
      runDate,
    ]
  );

  if (result.rows[0]) {
    return mapExpenseRow(result.rows[0]);
  }

  const existing = await query<ExpenseRow>(
    `SELECT id, amount, category, payment_method, transaction_type, description, date,
       generated_schedule_id, generated_schedule_date, created_at::text AS created_at
     FROM expenses
     WHERE user_id = $1 AND generated_schedule_id = $2 AND generated_schedule_date = $3`,
    [userId, schedule.id, runDate]
  );

  return existing.rows[0] ? mapExpenseRow(existing.rows[0]) : null;
}

export async function processDueScheduledTransactions(userId: number, today: string) {
  const result = await query<ScheduledTransactionRow>(
    `SELECT id, title, amount, category, payment_method, transaction_type, description,
       frequency, next_run_date, active, created_at::text AS created_at
     FROM scheduled_transactions
     WHERE user_id = $1 AND active = TRUE AND next_run_date <= $2
     ORDER BY next_run_date ASC`,
    [userId, today]
  );

  const createdExpenses: Expense[] = [];
  const updatedSchedules: ScheduledTransaction[] = [];

  for (const row of result.rows) {
    let schedule = mapScheduledTransactionRow(row);
    let nextState = {
      nextRunDate: schedule.nextRunDate,
      active: schedule.active,
    };
    let guard = 0;

    while (schedule.active && schedule.nextRunDate <= today && guard < 60) {
      const runDate = schedule.nextRunDate;
      const expense = await createGeneratedExpense(userId, schedule, runDate);

      if (expense) {
        createdExpenses.push(expense);
      }

      nextState = getNextScheduleState(runDate, schedule.frequency);
      schedule = { ...schedule, ...nextState };
      guard += 1;
    }

    const updatedSchedule = await updateScheduledTransaction(
      userId,
      schedule.id,
      nextState
    );
    if (updatedSchedule) {
      updatedSchedules.push(updatedSchedule);
    }
  }

  return { expenses: createdExpenses, schedules: updatedSchedules };
}

function mapSplitEvent(row: SplitEventRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    createdAt: row.created_at,
  };
}

function mapSplitParticipant(row: SplitParticipantRow): SplitParticipant {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    isSelf: Boolean(row.is_self),
    createdAt: row.created_at,
  };
}

function mapSplitExpense(
  row: SplitExpenseRow,
  shares: SplitExpenseShare[]
): SplitExpense {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    amount: row.amount,
    payerParticipantId: row.payer_participant_id,
    category: row.category || "",
    note: row.note || "",
    date: row.date,
    createdAt: row.created_at,
    shares,
  };
}

function mapSplitShare(row: SplitExpenseShareRow): SplitExpenseShare {
  return {
    id: row.id,
    expenseId: row.expense_id,
    participantId: row.participant_id,
    amount: row.amount,
  };
}

function mapSplitSettlement(row: SplitSettlementRow): SplitSettlement {
  return {
    id: row.id,
    eventId: row.event_id,
    fromParticipantId: row.from_participant_id,
    toParticipantId: row.to_participant_id,
    amount: row.amount,
    note: row.note || "",
    date: row.date,
    createdAt: row.created_at,
  };
}

async function getSplitEventOwner(userId: number, eventId: string) {
  const result = await query<{ id: string }>(
    'SELECT id FROM split_events WHERE id = $1 AND user_id = $2',
    [eventId, userId]
  );
  return result.rows[0] || null;
}

async function getSplitParticipants(eventId: string) {
  const result = await query<SplitParticipantRow>(
    `SELECT id, event_id, name, is_self, created_at::text AS created_at
     FROM split_participants
     WHERE event_id = $1
     ORDER BY is_self DESC, created_at ASC`,
    [eventId]
  );
  return result.rows.map(mapSplitParticipant);
}

async function getSplitExpenses(eventId: string) {
  const expenses = await query<SplitExpenseRow>(
    `SELECT id, event_id, title, amount, payer_participant_id, category, note,
       date, created_at::text AS created_at
     FROM split_expenses
     WHERE event_id = $1
     ORDER BY date DESC, created_at DESC`,
    [eventId]
  );
  const shares = await query<SplitExpenseShareRow>(
    `SELECT split_expense_shares.id, split_expense_shares.expense_id,
       split_expense_shares.participant_id, split_expense_shares.amount
     FROM split_expense_shares
     INNER JOIN split_expenses ON split_expenses.id = split_expense_shares.expense_id
     WHERE split_expenses.event_id = $1`,
    [eventId]
  );
  const sharesByExpense = new Map<string, SplitExpenseShare[]>();

  shares.rows.map(mapSplitShare).forEach((share) => {
    const existing = sharesByExpense.get(share.expenseId) || [];
    existing.push(share);
    sharesByExpense.set(share.expenseId, existing);
  });

  return expenses.rows.map((expense) =>
    mapSplitExpense(expense, sharesByExpense.get(expense.id) || [])
  );
}

async function getSplitSettlements(eventId: string) {
  const result = await query<SplitSettlementRow>(
    `SELECT id, event_id, from_participant_id, to_participant_id, amount,
       note, date, created_at::text AS created_at
     FROM split_settlements
     WHERE event_id = $1
     ORDER BY date DESC, created_at DESC`,
    [eventId]
  );
  return result.rows.map(mapSplitSettlement);
}

async function getHydratedSplitEvent(row: SplitEventRow): Promise<SplitEvent> {
  const [participants, expenses, settlements] = await Promise.all([
    getSplitParticipants(row.id),
    getSplitExpenses(row.id),
    getSplitSettlements(row.id),
  ]);

  return hydrateSplitEvent({
    ...mapSplitEvent(row),
    participants,
    expenses,
    settlements,
  });
}

export async function getUserSplitEvents(userId: number) {
  const result = await query<SplitEventRow>(
    `SELECT id, name, description, start_date, end_date, created_at::text AS created_at
     FROM split_events
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return Promise.all(result.rows.map(getHydratedSplitEvent));
}

export async function getUserSplitEventById(userId: number, eventId: string) {
  const result = await query<SplitEventRow>(
    `SELECT id, name, description, start_date, end_date, created_at::text AS created_at
     FROM split_events
     WHERE user_id = $1 AND id = $2`,
    [userId, eventId]
  );
  const event = result.rows[0];
  return event ? getHydratedSplitEvent(event) : null;
}

export async function createSplitEvent(
  userId: number,
  event: {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    participants: string[];
  }
) {
  await query(
    `INSERT INTO split_events (id, user_id, name, description, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      event.id,
      userId,
      event.name,
      event.description || null,
      event.startDate || null,
      event.endDate || null,
    ]
  );

  for (const name of event.participants) {
    await query(
      `INSERT INTO split_participants (id, event_id, name, is_self)
       VALUES ($1, $2, $3, $4)`,
      [crypto.randomUUID(), event.id, name, name.toLowerCase() === 'you']
    );
  }

  return getUserSplitEventById(userId, event.id);
}

export async function updateSplitEvent(
  userId: number,
  eventId: string,
  updates: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const dbUpdates: Record<string, string | null> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;

  const fields = Object.keys(dbUpdates);
  if (fields.length === 0) {
    return getUserSplitEventById(userId, eventId);
  }

  const values = Object.values(dbUpdates);
  const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

  await query(
    `UPDATE split_events SET ${setClause}
     WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}`,
    [...values, eventId, userId]
  );

  return getUserSplitEventById(userId, eventId);
}

export async function deleteSplitEvent(userId: number, eventId: string) {
  const result = await query(
    'DELETE FROM split_events WHERE id = $1 AND user_id = $2',
    [eventId, userId]
  );
  return { changes: result.rowCount ?? 0 };
}

async function assertSplitParticipants(
  userId: number,
  eventId: string,
  participantIds: string[]
) {
  if (!(await getSplitEventOwner(userId, eventId))) return false;

  const uniqueIds = Array.from(new Set(participantIds));
  for (const participantId of uniqueIds) {
    const result = await query<{ id: string }>(
      'SELECT id FROM split_participants WHERE id = $1 AND event_id = $2',
      [participantId, eventId]
    );
    if (!result.rows[0]) return false;
  }

  return true;
}

function distributeEqualShares(amount: number, participantIds: string[]) {
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / participantIds.length);
  const remainder = totalCents % participantIds.length;

  return participantIds.map((participantId, index) => ({
    participantId,
    amount: (base + (index < remainder ? 1 : 0)) / 100,
  }));
}

async function replaceSplitExpenseShares(
  expenseId: string,
  shares: Array<{ participantId: string; amount: number }>
) {
  await query('DELETE FROM split_expense_shares WHERE expense_id = $1', [expenseId]);

  for (const share of shares) {
    await query(
      `INSERT INTO split_expense_shares (id, expense_id, participant_id, amount)
       VALUES ($1, $2, $3, $4)`,
      [crypto.randomUUID(), expenseId, share.participantId, share.amount]
    );
  }
}

export async function createSplitExpense(
  userId: number,
  eventId: string,
  expense: {
    id: string;
    title: string;
    amount: number;
    payerParticipantId: string;
    category?: string;
    note?: string;
    date: string;
    splitMode: 'equal' | 'custom';
    shares: Array<{ participantId: string; amount: number }>;
  }
) {
  const participantIds = [
    expense.payerParticipantId,
    ...expense.shares.map((share) => share.participantId),
  ];
  if (!(await assertSplitParticipants(userId, eventId, participantIds))) {
    return null;
  }

  await query(
    `INSERT INTO split_expenses (
       id, event_id, title, amount, payer_participant_id, category, note, date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      expense.id,
      eventId,
      expense.title,
      expense.amount,
      expense.payerParticipantId,
      expense.category || null,
      expense.note || null,
      expense.date,
    ]
  );

  await replaceSplitExpenseShares(
    expense.id,
    expense.splitMode === 'equal'
      ? distributeEqualShares(
          expense.amount,
          expense.shares.map((share) => share.participantId)
        )
      : expense.shares
  );

  return getUserSplitEventById(userId, eventId);
}

export async function updateSplitExpense(
  userId: number,
  eventId: string,
  expenseId: string,
  expense: {
    title: string;
    amount: number;
    payerParticipantId: string;
    category?: string;
    note?: string;
    date: string;
    splitMode: 'equal' | 'custom';
    shares: Array<{ participantId: string; amount: number }>;
  }
) {
  const participantIds = [
    expense.payerParticipantId,
    ...expense.shares.map((share) => share.participantId),
  ];
  if (!(await assertSplitParticipants(userId, eventId, participantIds))) {
    return null;
  }

  const existing = await query<{ id: string }>(
    'SELECT id FROM split_expenses WHERE id = $1 AND event_id = $2',
    [expenseId, eventId]
  );
  if (!existing.rows[0]) return null;

  await query(
    `UPDATE split_expenses
     SET title = $1, amount = $2, payer_participant_id = $3, category = $4,
       note = $5, date = $6
     WHERE id = $7 AND event_id = $8`,
    [
      expense.title,
      expense.amount,
      expense.payerParticipantId,
      expense.category || null,
      expense.note || null,
      expense.date,
      expenseId,
      eventId,
    ]
  );

  await replaceSplitExpenseShares(
    expenseId,
    expense.splitMode === 'equal'
      ? distributeEqualShares(
          expense.amount,
          expense.shares.map((share) => share.participantId)
        )
      : expense.shares
  );

  return getUserSplitEventById(userId, eventId);
}

export async function deleteSplitExpense(
  userId: number,
  eventId: string,
  expenseId: string
) {
  if (!(await getSplitEventOwner(userId, eventId))) return null;

  await query('DELETE FROM split_expenses WHERE id = $1 AND event_id = $2', [
    expenseId,
    eventId,
  ]);
  return getUserSplitEventById(userId, eventId);
}

export async function createSplitSettlement(
  userId: number,
  eventId: string,
  settlement: {
    id: string;
    fromParticipantId: string;
    toParticipantId: string;
    amount: number;
    note?: string;
    date: string;
  }
) {
  if (
    !(await assertSplitParticipants(userId, eventId, [
      settlement.fromParticipantId,
      settlement.toParticipantId,
    ]))
  ) {
    return null;
  }

  await query(
    `INSERT INTO split_settlements (
       id, event_id, from_participant_id, to_participant_id, amount, note, date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      settlement.id,
      eventId,
      settlement.fromParticipantId,
      settlement.toParticipantId,
      settlement.amount,
      settlement.note || null,
      settlement.date,
    ]
  );

  return getUserSplitEventById(userId, eventId);
}

export async function updateSplitSettlement(
  userId: number,
  eventId: string,
  settlementId: string,
  settlement: {
    fromParticipantId: string;
    toParticipantId: string;
    amount: number;
    note?: string;
    date: string;
  }
) {
  if (
    !(await assertSplitParticipants(userId, eventId, [
      settlement.fromParticipantId,
      settlement.toParticipantId,
    ]))
  ) {
    return null;
  }

  const existing = await query<{ id: string }>(
    'SELECT id FROM split_settlements WHERE id = $1 AND event_id = $2',
    [settlementId, eventId]
  );
  if (!existing.rows[0]) return null;

  await query(
    `UPDATE split_settlements
     SET from_participant_id = $1, to_participant_id = $2, amount = $3,
       note = $4, date = $5
     WHERE id = $6 AND event_id = $7`,
    [
      settlement.fromParticipantId,
      settlement.toParticipantId,
      settlement.amount,
      settlement.note || null,
      settlement.date,
      settlementId,
      eventId,
    ]
  );

  return getUserSplitEventById(userId, eventId);
}

export async function deleteSplitSettlement(
  userId: number,
  eventId: string,
  settlementId: string
) {
  if (!(await getSplitEventOwner(userId, eventId))) return null;

  await query('DELETE FROM split_settlements WHERE id = $1 AND event_id = $2', [
    settlementId,
    eventId,
  ]);
  return getUserSplitEventById(userId, eventId);
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
  await query('DELETE FROM scheduled_transactions WHERE user_id = $1', [userId]);
  await query('DELETE FROM split_events WHERE user_id = $1', [userId]);

  const result = await query('DELETE FROM users WHERE id = $1', [userId]);
  return { changes: result.rowCount ?? 0 };
}

export async function deleteUserData(userId: number) {
  await query('DELETE FROM expenses WHERE user_id = $1', [userId]);
  await query('DELETE FROM categories WHERE user_id = $1', [userId]);
  await query('DELETE FROM scheduled_transactions WHERE user_id = $1', [userId]);
  await query('DELETE FROM split_events WHERE user_id = $1', [userId]);
}
