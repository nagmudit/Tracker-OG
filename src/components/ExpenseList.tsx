"use client";

import React, { useMemo, useState } from "react";
import { useExpense } from "@/context/ExpenseContext";
import { formatCurrency } from "@/utils/expense-utils";
import { Expense } from "@/types/expense";
import { format } from "date-fns";
import {
  Banknote,
  Calendar,
  CreditCard,
  Edit3,
  Search,
  Smartphone,
  Trash2,
  WalletCards,
} from "lucide-react";
import ExpenseForm from "@/components/ExpenseForm";

const paymentMeta: Record<
  Expense["paymentMethod"],
  { label: string; icon: React.ElementType }
> = {
  cash: { label: "Cash", icon: Banknote },
  upi: { label: "UPI", icon: Smartphone },
  "credit-card": { label: "Credit Card", icon: CreditCard },
  "debit-card": { label: "Debit Card", icon: WalletCards },
};

const ExpenseList: React.FC = () => {
  const { expenses, categories, deleteExpense } = useExpense();
  const [filter, setFilter] = useState<"all" | "debit" | "credit">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState<"all" | Expense["paymentMethod"]>(
    "all"
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const sortedExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = expenses.filter((expense) => {
      if (filter !== "all" && expense.transactionType !== filter) return false;
      if (category !== "all" && expense.category !== category) return false;
      if (paymentMethod !== "all" && expense.paymentMethod !== paymentMethod) {
        return false;
      }
      if (startDate && expense.date < startDate) return false;
      if (endDate && expense.date > endDate) return false;
      if (!query) return true;

      return [expense.category, expense.description, expense.paymentMethod]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
    });

    return filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return b.amount - a.amount;
    });
  }, [category, endDate, expenses, filter, paymentMethod, search, sortBy, startDate]);

  const getTransactionColor = (type: "credit" | "debit") => {
    return type === "credit"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    setCategory("all");
    setPaymentMethod("all");
    setStartDate("");
    setEndDate("");
    setSortBy("date");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
          Transactions
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Search, filter, edit, or remove entries.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search category, note, or payment"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-green-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as "all" | "debit" | "credit")
            }
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-green-500"
          >
            <option value="all">All types</option>
            <option value="debit">Expenses</option>
            <option value="credit">Income</option>
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-green-500"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as "all" | Expense["paymentMethod"])
            }
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-green-500"
          >
            <option value="all">All payments</option>
            {Object.entries(paymentMeta).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "date" | "amount")}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-green-500"
          >
            <option value="date">Newest first</option>
            <option value="amount">Highest amount</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-green-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-green-500"
          />
          <button
            onClick={clearFilters}
            className="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {sortedExpenses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <Calendar className="mx-auto mb-4 h-14 w-14 text-gray-400" />
          <p className="font-medium text-gray-700 dark:text-gray-300">
            No transactions found
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Adjust filters or add your first entry.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedExpenses.map((expense) => {
            const PaymentIcon = paymentMeta[expense.paymentMethod]?.icon || WalletCards;
            const paymentLabel = paymentMeta[expense.paymentMethod]?.label || "Payment";

            return (
              <div
                key={expense.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    <PaymentIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
                          {expense.category}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                          {format(new Date(expense.date), "MMM dd, yyyy")} · {paymentLabel}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p
                            className={`text-base font-bold sm:text-lg ${getTransactionColor(
                              expense.transactionType
                            )}`}
                          >
                            {expense.transactionType === "credit" ? "+" : "-"}
                            {formatCurrency(expense.amount)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {expense.transactionType === "credit" ? "Income" : "Expense"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-pink-600 dark:hover:bg-gray-700 dark:hover:text-green-400"
                            aria-label="Edit transaction"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {expense.description && (
                      <p className="mt-2 break-words text-sm text-gray-600 dark:text-gray-400">
                        {expense.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ExpenseForm
        open={Boolean(editingExpense)}
        onOpenChange={(open) => {
          if (!open) setEditingExpense(null);
        }}
        expense={editingExpense}
        hideTrigger
      />
    </div>
  );
};

export default ExpenseList;
