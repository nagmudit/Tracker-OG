"use client";

import React, { useState } from "react";
import { useExpense } from "@/context/ExpenseContext";
import { formatCurrency, calculateTotals } from "@/utils/expense-utils";
import { TrendingUp, TrendingDown, DollarSign, Sun, Moon } from "lucide-react";

const Dashboard: React.FC = () => {
  const { expenses, theme, toggleTheme } = useExpense();
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">(
    "month"
  );

  const getFilteredExpenses = () => {
    const now = new Date();
    const startDate = new Date();

    switch (timeFilter) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        return expenses;
    }

    return expenses.filter((expense) => new Date(expense.date) >= startDate);
  };

  const filteredExpenses = getFilteredExpenses();
  const filteredTotals = calculateTotals(filteredExpenses);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    change,
  }: {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    change?: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
          {change && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {change}
            </p>
          )}
        </div>
        <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
      </div>
    </div>
  );

  const recentTransactions = filteredExpenses.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your expenses and manage your budget
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <select
            value={timeFilter}
            onChange={(e) =>
              setTimeFilter(e.target.value as "all" | "month" | "week")
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="all">All Time</option>
            <option value="month">Last Month</option>
            <option value="week">Last Week</option>
          </select>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(filteredTotals.totalExpenses)}
          icon={TrendingDown}
          color="text-red-600 dark:text-red-400"
          change={`${
            filteredExpenses.filter((e) => e.transactionType === "debit").length
          } transactions`}
        />
        <StatCard
          title="Total Income"
          value={formatCurrency(filteredTotals.totalIncome)}
          icon={TrendingUp}
          color="text-green-600 dark:text-green-400"
          change={`${
            filteredExpenses.filter((e) => e.transactionType === "credit")
              .length
          } transactions`}
        />
        <StatCard
          title="Net Balance"
          value={formatCurrency(filteredTotals.netBalance)}
          icon={DollarSign}
          color={
            filteredTotals.netBalance >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }
        />
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Transactions
        </h2>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No recent transactions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-100 dark:bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-pink-600 dark:text-green-600 font-semibold text-sm sm:text-base">
                      {transaction.category.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      {transaction.category}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`font-bold text-sm sm:text-base ${
                      transaction.transactionType === "credit"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {transaction.transactionType === "credit" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {transaction.paymentMethod?.replace("-", " ") || "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
