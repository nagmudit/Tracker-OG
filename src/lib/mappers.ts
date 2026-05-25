import { Category, Expense } from "@/types/expense";

type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  payment_method: Expense["paymentMethod"];
  transaction_type: Expense["transactionType"];
  description?: string | null;
  date: string;
  created_at: string;
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
  };
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    isDefault: Boolean(row.is_default),
  };
}
