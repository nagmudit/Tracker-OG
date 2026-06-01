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

export interface ExpenseContextType {
  expenses: Expense[];
  categories: Category[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  scheduledTransactions: ScheduledTransaction[];
  addScheduledTransaction: (schedule: Omit<ScheduledTransaction, 'id' | 'createdAt'>) => Promise<void>;
  updateScheduledTransaction: (id: string, schedule: Partial<ScheduledTransaction>) => Promise<void>;
  deleteScheduledTransaction: (id: string) => Promise<void>;
  processDueScheduledTransactions: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
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
