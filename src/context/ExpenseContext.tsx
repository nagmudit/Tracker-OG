"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Expense, Category, ExpenseContextType } from "@/types/expense";
import { defaultCategories } from "@/utils/expense-utils";
import { useAuth } from "./AuthContext";

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
  const { user } = useAuth();

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Load expenses
      const expensesResponse = await fetch("/api/expenses", {
        credentials: "include",
      });
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData.expenses || []);
      }

      // Load categories
      const categoriesResponse = await fetch("/api/categories", {
        credentials: "include",
      });
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || defaultCategories);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }, [user]);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
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

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      // Clear data when user logs out
      setExpenses([]);
      setCategories(defaultCategories);
    }
  }, [user, loadData]);

  // Apply theme changes
  useEffect(() => {
    localStorage.setItem("theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const addExpense = async (expense: Omit<Expense, "id" | "createdAt">) => {
    if (!user) return;

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(expense),
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses((prev) => [data.expense, ...prev]);
      }
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setExpenses((prev) => prev.filter((expense) => expense.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const updateExpense = async (
    id: string,
    updatedExpense: Partial<Expense>
  ) => {
    if (!user) return;

    try {
      const response = await fetch("/api/expenses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id, ...updatedExpense }),
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses((prev) =>
          prev.map((expense) => (expense.id === id ? data.expense : expense))
        );
      }
    } catch (error) {
      console.error("Failed to update expense:", error);
    }
  };

  const addCategory = async (category: Omit<Category, "id">) => {
    if (!user) return;

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(category),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories((prev) => [...prev, data.category]);
      }
    } catch (error) {
      console.error("Failed to add category:", error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;

    const category = categories.find((cat) => cat.id === id);
    if (category && !category.isDefault) {
      try {
        const response = await fetch(`/api/categories?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          setCategories((prev) => prev.filter((cat) => cat.id !== id));
        }
      } catch (error) {
        console.error("Failed to delete category:", error);
      }
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
