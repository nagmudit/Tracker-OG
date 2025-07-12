"use client";

import React, { useState } from "react";
import { useExpense } from "@/context/ExpenseContext";
import { formatCurrency } from "@/utils/expense-utils";
import { format } from "date-fns";
import { Trash2, Calendar } from "lucide-react";

const ExpenseList: React.FC = () => {
  const { expenses, deleteExpense } = useExpense();
  const [filter, setFilter] = useState<"all" | "debit" | "credit">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");

  const filteredExpenses = expenses.filter((expense) => {
    if (filter === "all") return true;
    return expense.transactionType === filter;
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return b.amount - a.amount;
  });

  const paymentMethodIcons = {
    cash: "💵",
    upi: "📱",
    "credit-card": "💳",
    "debit-card": "💳",
  };

  const getTransactionColor = (type: "credit" | "debit") => {
    return type === "credit"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Transaction History
        </h2>

        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "all" | "debit" | "credit")
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="all">All Transactions</option>
            <option value="debit">Expenses</option>
            <option value="credit">Income</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "amount")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>
      </div>

      {sortedExpenses.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No transactions found
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">
                      {paymentMethodIcons[expense.paymentMethod]}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {expense.category}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(expense.date), "MMM dd, yyyy")} •{" "}
                        {expense.paymentMethod
                          ?.replace("-", " ")
                          .toUpperCase() || "N/A"}
                      </p>
                    </div>
                  </div>

                  {expense.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
                      {expense.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`font-bold text-lg ${getTransactionColor(
                        expense.transactionType
                      )}`}
                    >
                      {expense.transactionType === "credit" ? "+" : "-"}
                      {formatCurrency(expense.amount)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {expense.transactionType === "credit"
                        ? "Income"
                        : "Expense"}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteExpense(expense.id)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
