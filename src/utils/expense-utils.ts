import { Expense, Category } from '@/types/expense';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const defaultCategories: Category[] = [
  { id: '1', name: 'Travel', color: '#3B82F6', isDefault: true },
  { id: '2', name: 'Grocery', color: '#10B981', isDefault: true },
  { id: '3', name: 'Food & Dining', color: '#F59E0B', isDefault: true },
  { id: '4', name: 'Entertainment', color: '#EF4444', isDefault: true },
  { id: '5', name: 'Shopping', color: '#8B5CF6', isDefault: true },
  { id: '6', name: 'Bills & Utilities', color: '#06B6D4', isDefault: true },
  { id: '7', name: 'Healthcare', color: '#EC4899', isDefault: true },
  { id: '8', name: 'Miscellaneous', color: '#6B7280', isDefault: true },
];

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const filterExpensesByDateRange = (
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): Expense[] => {
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= startDate && expenseDate <= endDate;
  });
};

export const getCategoryBreakdown = (expenses: Expense[]): { [key: string]: number } => {
  return expenses.reduce((acc, expense) => {
    if (expense.transactionType === 'debit') {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    }
    return acc;
  }, {} as { [key: string]: number });
};

export const getPaymentMethodBreakdown = (expenses: Expense[]): { [key: string]: number } => {
  return expenses.reduce((acc, expense) => {
    if (expense.transactionType === 'debit') {
      acc[expense.paymentMethod] = (acc[expense.paymentMethod] || 0) + expense.amount;
    }
    return acc;
  }, {} as { [key: string]: number });
};

export const getMonthlyTrends = (expenses: Expense[], months: number = 6) => {
  const trends = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthExpenses = filterExpensesByDateRange(expenses, monthStart, monthEnd);
    
    const totalExpenses = monthExpenses
      .filter(e => e.transactionType === 'debit')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalIncome = monthExpenses
      .filter(e => e.transactionType === 'credit')
      .reduce((sum, e) => sum + e.amount, 0);
    
    trends.push({
      month: format(date, 'MMM yyyy'),
      expenses: totalExpenses,
      income: totalIncome,
    });
  }
  
  return trends;
};

export const calculateTotals = (expenses: Expense[]) => {
  const totalExpenses = expenses
    .filter(e => e.transactionType === 'debit')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalIncome = expenses
    .filter(e => e.transactionType === 'credit')
    .reduce((sum, e) => sum + e.amount, 0);
  
  return {
    totalExpenses,
    totalIncome,
    netBalance: totalIncome - totalExpenses,
  };
};
