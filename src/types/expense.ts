export interface Expense {
  id: string;
  amount: number;
  category: string;
  paymentMethod: 'cash' | 'upi' | 'credit-card' | 'debit-card';
  transactionType: 'credit' | 'debit';
  description?: string;
  date: string;
  createdAt: string;
  generatedFromScheduleId?: string;
  generatedForDate?: string;
}

export type ScheduleFrequency = 'once' | 'weekly' | 'monthly' | 'yearly';

export interface ScheduledTransaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  paymentMethod: Expense['paymentMethod'];
  transactionType: Expense['transactionType'];
  description?: string;
  frequency: ScheduleFrequency;
  nextRunDate: string;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

export type MutationResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ExpenseContextType {
  expenses: Expense[];
  categories: Category[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<MutationResult<Expense>>;
  deleteExpense: (id: string) => Promise<MutationResult>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<MutationResult<Expense>>;
  scheduledTransactions: ScheduledTransaction[];
  addScheduledTransaction: (schedule: Omit<ScheduledTransaction, 'id' | 'createdAt'>) => Promise<MutationResult<ScheduledTransaction>>;
  updateScheduledTransaction: (id: string, schedule: Partial<ScheduledTransaction>) => Promise<MutationResult<ScheduledTransaction>>;
  deleteScheduledTransaction: (id: string) => Promise<MutationResult>;
  processDueScheduledTransactions: () => Promise<MutationResult<{ expenses: Expense[]; schedules: ScheduledTransaction[] }>>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<MutationResult<Category>>;
  deleteCategory: (id: string) => Promise<MutationResult>;
  reloadData: () => Promise<void>;
  clearData: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface Analytics {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  categoryBreakdown: { [key: string]: number };
  monthlyTrends: { month: string; expenses: number; income: number }[];
  paymentMethodBreakdown: { [key: string]: number };
}
