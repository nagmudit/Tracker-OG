"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  Expense,
  Category,
  ExpenseContextType,
  MutationResult,
  ScheduledTransaction,
} from "@/types/expense";
import { defaultCategories } from "@/utils/expense-utils";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

async function getResponseError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

function getNetworkError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

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
  const [scheduledTransactions, setScheduledTransactions] = useState<
    ScheduledTransaction[]
  >([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { user } = useAuth();
  const processedUserIdRef = useRef<number | null>(null);

  const deleteExpense = useCallback(
    async (id: string): Promise<MutationResult> => {
      if (!user) return { ok: false, error: "Sign in to delete transactions." };

      try {
        const response = await fetch(`/api/expenses?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          return {
            ok: false,
            error: await getResponseError(response, "Could not delete transaction."),
          };
        }

        setExpenses((prev) => prev.filter((expense) => expense.id !== id));
        return { ok: true, data: undefined };
      } catch (error) {
        console.error("Failed to delete expense:", error);
        return {
          ok: false,
          error: getNetworkError(error, "Could not delete transaction."),
        };
      }
    },
    [user]
  );

  const processDueScheduledTransactions = useCallback(async (): Promise<
    MutationResult<{ expenses: Expense[]; schedules: ScheduledTransaction[] }>
  > => {
    if (!user) {
      return { ok: false, error: "Sign in to process scheduled transactions." };
    }

    try {
      const response = await fetch("/api/scheduled-transactions/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ today: new Date().toISOString().split("T")[0] }),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: await getResponseError(
            response,
            "Could not check scheduled transactions."
          ),
        };
      }

      const data: {
        expenses?: Expense[];
        schedules?: ScheduledTransaction[];
      } = await response.json();
      const generatedExpenses = data.expenses || [];
      const updatedSchedules = data.schedules || [];

      if (generatedExpenses.length > 0) {
        setExpenses((prev) => {
          const existingIds = new Set(prev.map((expense) => expense.id));
          const nextExpenses = generatedExpenses.filter(
            (expense) => !existingIds.has(expense.id)
          );
          return [...nextExpenses, ...prev];
        });

        generatedExpenses.forEach((expense) => {
          toast.success("Scheduled transaction added", {
            description: `${expense.category} was added to your ${
              expense.transactionType === "credit" ? "income" : "expenses"
            }.`,
            action: {
              label: "Undo",
              onClick: () => deleteExpense(expense.id),
            },
            cancel: {
              label: "Edit",
              onClick: () => {
                window.dispatchEvent(
                  new CustomEvent("money-log:edit-transaction", {
                    detail: expense,
                  })
                );
              },
            },
          });
        });
      }

      if (updatedSchedules.length > 0) {
        setScheduledTransactions((prev) =>
          prev.map((schedule) => {
            const updated = updatedSchedules.find((item) => item.id === schedule.id);
            return updated || schedule;
          })
        );
      }

      return {
        ok: true,
        data: { expenses: generatedExpenses, schedules: updatedSchedules },
      };
    } catch (error) {
      console.error("Failed to process scheduled transactions:", error);
      return {
        ok: false,
        error: getNetworkError(error, "Could not check scheduled transactions."),
      };
    }
  }, [deleteExpense, user]);

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

      // Load schedules
      const schedulesResponse = await fetch("/api/scheduled-transactions", {
        credentials: "include",
      });
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        setScheduledTransactions(schedulesData.scheduledTransactions || []);
      }

      // Load categories
      const categoriesResponse = await fetch("/api/categories", {
        credentials: "include",
      });
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || defaultCategories);
      }

      if (processedUserIdRef.current !== user.id) {
        processedUserIdRef.current = user.id;
        await processDueScheduledTransactions();
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }, [processDueScheduledTransactions, user]);

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
      setScheduledTransactions([]);
      setCategories(defaultCategories);
      processedUserIdRef.current = null;
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

  const addExpense = async (
    expense: Omit<Expense, "id" | "createdAt">
  ): Promise<MutationResult<Expense>> => {
    if (!user) return { ok: false, error: "Sign in to add transactions." };

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(expense),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: await getResponseError(response, "Could not add transaction."),
        };
      }

      const data = await response.json();
      setExpenses((prev) => [data.expense, ...prev]);
      return { ok: true, data: data.expense };
    } catch (error) {
      console.error("Failed to add expense:", error);
      return {
        ok: false,
        error: getNetworkError(error, "Could not add transaction."),
      };
    }
  };

  const updateExpense = async (
    id: string,
    updatedExpense: Partial<Expense>
  ): Promise<MutationResult<Expense>> => {
    if (!user) return { ok: false, error: "Sign in to update transactions." };

    try {
      const response = await fetch("/api/expenses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id, ...updatedExpense }),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: await getResponseError(response, "Could not update transaction."),
        };
      }

      const data = await response.json();
      setExpenses((prev) =>
        prev.map((expense) => (expense.id === id ? data.expense : expense))
      );
      return { ok: true, data: data.expense };
    } catch (error) {
      console.error("Failed to update expense:", error);
      return {
        ok: false,
        error: getNetworkError(error, "Could not update transaction."),
      };
    }
  };

  const addCategory = async (
    category: Omit<Category, "id">
  ): Promise<MutationResult<Category>> => {
    if (!user) return { ok: false, error: "Sign in to add categories." };

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(category),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: await getResponseError(response, "Could not add category."),
        };
      }

      const data = await response.json();
      setCategories((prev) => [...prev, data.category]);
      return { ok: true, data: data.category };
    } catch (error) {
      console.error("Failed to add category:", error);
      return {
        ok: false,
        error: getNetworkError(error, "Could not add category."),
      };
    }
  };

  const deleteCategory = async (id: string): Promise<MutationResult> => {
    if (!user) return { ok: false, error: "Sign in to delete categories." };

    const category = categories.find((cat) => cat.id === id);
    if (!category || category.isDefault) {
      return { ok: false, error: "Default categories cannot be deleted." };
    }

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        return {
          ok: false,
          error: await getResponseError(response, "Could not delete category."),
        };
      }

      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      return { ok: true, data: undefined };
    } catch (error) {
      console.error("Failed to delete category:", error);
      return {
        ok: false,
        error: getNetworkError(error, "Could not delete category."),
      };
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const addScheduledTransaction = async (
    schedule: Omit<ScheduledTransaction, "id" | "createdAt">
  ): Promise<MutationResult<ScheduledTransaction>> => {
    if (!user) {
      return { ok: false, error: "Sign in to add scheduled transactions." };
    }

    try {
      const response = await fetch("/api/scheduled-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(schedule),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: await getResponseError(response, "Could not add schedule."),
        };
      }

      const data = await response.json();
      setScheduledTransactions((prev) => [
        data.scheduledTransaction,
        ...prev,
      ]);
      return { ok: true, data: data.scheduledTransaction };
    } catch (error) {
      console.error("Failed to add scheduled transaction:", error);
      return {
        ok: false,
        error: getNetworkError(error, "Could not add schedule."),
      };
    }
  };

  const updateScheduledTransaction = async (
    id: string,
    schedule: Partial<ScheduledTransaction>
  ): Promise<MutationResult<ScheduledTransaction>> => {
    if (!user) {
      return { ok: false, error: "Sign in to update scheduled transactions." };
    }

    try {
      const response = await fetch("/api/scheduled-transactions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id, ...schedule }),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: await getResponseError(response, "Could not update schedule."),
        };
      }

      const data = await response.json();
      setScheduledTransactions((prev) =>
        prev.map((item) =>
          item.id === id ? data.scheduledTransaction : item
        )
      );
      return { ok: true, data: data.scheduledTransaction };
    } catch (error) {
      console.error("Failed to update scheduled transaction:", error);
      return {
        ok: false,
        error: getNetworkError(error, "Could not update schedule."),
      };
    }
  };

  const deleteScheduledTransaction = async (
    id: string
  ): Promise<MutationResult> => {
    if (!user) {
      return { ok: false, error: "Sign in to delete scheduled transactions." };
    }

    try {
      const response = await fetch(`/api/scheduled-transactions?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        return {
          ok: false,
          error: await getResponseError(response, "Could not delete schedule."),
        };
      }

      setScheduledTransactions((prev) => prev.filter((item) => item.id !== id));
      return { ok: true, data: undefined };
    } catch (error) {
      console.error("Failed to delete scheduled transaction:", error);
      return {
        ok: false,
        error: getNetworkError(error, "Could not delete schedule."),
      };
    }
  };

  const clearData = () => {
    setExpenses([]);
    setScheduledTransactions([]);
    setCategories(defaultCategories);
  };

  const value: ExpenseContextType = {
    expenses,
    categories,
    addExpense,
    deleteExpense,
    updateExpense,
    scheduledTransactions,
    addScheduledTransaction,
    updateScheduledTransaction,
    deleteScheduledTransaction,
    processDueScheduledTransactions,
    addCategory,
    deleteCategory,
    reloadData: loadData,
    clearData,
    theme,
    toggleTheme,
  };

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
};
