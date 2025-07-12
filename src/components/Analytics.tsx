"use client";

import React, { useMemo } from "react";
import { useExpense } from "@/context/ExpenseContext";
import {
  formatCurrency,
  getCategoryBreakdown,
  getPaymentMethodBreakdown,
  getMonthlyTrends,
  calculateTotals,
} from "@/utils/expense-utils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const Analytics: React.FC = () => {
  const { expenses, categories, theme } = useExpense();

  const analytics = useMemo(() => {
    const totals = calculateTotals(expenses);
    const categoryBreakdown = getCategoryBreakdown(expenses);
    const paymentMethodBreakdown = getPaymentMethodBreakdown(expenses);
    const monthlyTrends = getMonthlyTrends(expenses);

    return {
      ...totals,
      categoryBreakdown,
      paymentMethodBreakdown,
      monthlyTrends,
    };
  }, [expenses]);

  // Theme-aware colors
  const getThemeColors = () => {
    if (theme === "dark") {
      return {
        primary: "#10B981", // Green for dark theme
        secondary: "#059669",
        accent: "#34D399",
        danger: "#EF4444",
        warning: "#F59E0B",
        info: "#3B82F6",
        success: "#10B981",
        bar: "#10B981",
        categoryColors: [
          "#10B981",
          "#059669",
          "#34D399",
          "#6EE7B7",
          "#A7F3D0",
          "#047857",
          "#065F46",
          "#064E3B",
          "#052E16",
          "#022C22",
        ],
      };
    } else {
      return {
        primary: "#EC4899", // Pink for light theme
        secondary: "#DB2777",
        accent: "#F472B6",
        danger: "#EF4444",
        warning: "#F59E0B",
        info: "#3B82F6",
        success: "#10B981",
        bar: "#EC4899",
        categoryColors: [
          "#EC4899",
          "#DB2777",
          "#F472B6",
          "#F9A8D4",
          "#FBCFE8",
          "#BE185D",
          "#9D174D",
          "#831843",
          "#701A75",
          "#581C87",
        ],
      };
    }
  };

  const themeColors = getThemeColors();

  const categoryData = Object.entries(analytics.categoryBreakdown).map(
    ([category, amount], index) => {
      const categoryInfo = categories.find((cat) => cat.name === category);
      return {
        name: category,
        value: amount,
        color:
          categoryInfo?.color ||
          themeColors.categoryColors[index % themeColors.categoryColors.length],
      };
    }
  );

  const paymentMethodData = Object.entries(
    analytics.paymentMethodBreakdown
  ).map(([method, amount]) => ({
    name: method.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: amount,
  }));

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subValue,
  }: {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    subValue?: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subValue}
            </p>
          )}
        </div>
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
    </div>
  );

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Analytics
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(analytics.totalExpenses)}
          icon={TrendingDown}
          color="text-red-600 dark:text-red-400"
        />
        <StatCard
          title="Total Income"
          value={formatCurrency(analytics.totalIncome)}
          icon={TrendingUp}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          title="Net Balance"
          value={formatCurrency(analytics.netBalance)}
          icon={DollarSign}
          color={
            analytics.netBalance >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Expenses by Category
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({
                    name,
                    percent,
                  }: {
                    name: string;
                    percent?: number;
                  }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : "0"}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              No expense data available
            </div>
          )}
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Methods
          </h3>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill={themeColors.bar} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              No payment method data available
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Monthly Trends
        </h3>
        {analytics.monthlyTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={analytics.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke={themeColors.danger}
                strokeWidth={2}
                name="Expenses"
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke={themeColors.success}
                strokeWidth={2}
                name="Income"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400">
            No trend data available
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
