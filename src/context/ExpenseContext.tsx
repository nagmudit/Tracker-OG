"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Expense, Category, ExpenseContextType } from "@/types/expense";
import { defaultCategories } from "@/utils/expense-utils";

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error("useExpense must be used within an ExpenseProvider");
  }
  return context;
};

interface ExpenseProviderProps {
  children: ReactNode;
}

export const ExpenseProvider: React.FC<ExpenseProviderProps> = ({
  children,
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load data from localStorage on mount
  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses");
    const savedCategories = localStorage.getItem("categories");
    const savedTheme = localStorage.getItem("theme");

    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
    if (savedTheme) {
      setTheme(savedTheme as "light" | "dark");
    } else {
      // Check for system preference if no saved theme
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setTheme(systemPrefersDark ? "dark" : "light");
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const addExpense = (expense: Omit<Expense, "id" | "createdAt">) => {
    const newExpense: Expense = {
      ...expense,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  const updateExpense = (id: string, updatedExpense: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, ...updatedExpense } : expense
      )
    );
  };

  const addCategory = (category: Omit<Category, "id">) => {
    const newCategory: Category = {
      ...category,
      id: uuidv4(),
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const deleteCategory = (id: string) => {
    const category = categories.find((cat) => cat.id === id);
    if (category && !category.isDefault) {
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const value: ExpenseContextType = {
    expenses,
    categories,
    addExpense,
    deleteExpense,
    updateExpense,
    addCategory,
    deleteCategory,
    theme,
    toggleTheme,
  };

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
};
