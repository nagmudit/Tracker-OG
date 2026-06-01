import { Category, Expense, ScheduledTransaction } from "@/types/expense";
import { normalizeCategoryColor } from "@/utils/theme-colors";

type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  payment_method: Expense["paymentMethod"];
  transaction_type: Expense["transactionType"];
  description?: string | null;
  date: string;
  created_at: string;
  generated_schedule_id?: string | null;
  generated_schedule_date?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  is_default: boolean | number;
};

export function mapExpenseRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category,
    paymentMethod: row.payment_method,
    transactionType: row.transaction_type,
    description: row.description || "",
    date: row.date,
    createdAt: row.created_at,
    generatedFromScheduleId: row.generated_schedule_id || undefined,
    generatedForDate: row.generated_schedule_date || undefined,
  };
}

type ScheduledTransactionRow = {
  id: string;
  title: string;
  amount: number;
  category: string;
  payment_method: Expense["paymentMethod"];
  transaction_type: Expense["transactionType"];
  description?: string | null;
  frequency: ScheduledTransaction["frequency"];
  next_run_date: string;
  active: boolean | number;
  created_at: string;
};

export function mapScheduledTransactionRow(
  row: ScheduledTransactionRow
): ScheduledTransaction {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount,
    category: row.category,
    paymentMethod: row.payment_method,
    transactionType: row.transaction_type,
    description: row.description || "",
    frequency: row.frequency,
    nextRunDate: row.next_run_date,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: normalizeCategoryColor(row.color, row.name),
    isDefault: Boolean(row.is_default),
  };
}
