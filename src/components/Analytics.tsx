"use client";

import React, { useMemo, useState } from "react";
import { BarChart3, Lightbulb, LineChart as LineChartIcon } from "lucide-react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useExpense } from "@/context/ExpenseContext";
import {
  calculateTotals,
  formatCurrency,
  getCategoryBreakdown,
  getMonthlyTrends,
} from "@/utils/expense-utils";
import { tokenToCssVar } from "@/utils/theme-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const Analytics: React.FC = () => {
  const { expenses, categories } = useExpense();
  const [range, setRange] = useState<"week" | "month">("week");

  const analytics = useMemo(() => {
    const totals = calculateTotals(expenses);
    return {
      ...totals,
      categoryBreakdown: getCategoryBreakdown(expenses),
      monthlyTrends: getMonthlyTrends(expenses),
    };
  }, [expenses]);

  const categoryData = Object.entries(analytics.categoryBreakdown).map(
    ([category, amount], index) => {
      const categoryInfo = categories.find((item) => item.name === category);
      return {
        name: category,
        value: amount,
        color: categoryInfo
          ? tokenToCssVar(categoryInfo.color)
          : chartColors[index % chartColors.length],
      };
    }
  );

  const topCategory = categoryData.reduce<{
    name: string;
    value: number;
  } | null>((top, item) => {
    if (!top || item.value > top.value) return item;
    return top;
  }, null);

  const chartSummary = topCategory
    ? `Top spending category is ${topCategory.name} at ${formatCurrency(
        topCategory.value
      )}. Net balance is ${formatCurrency(analytics.netBalance)}.`
    : `Net balance is ${formatCurrency(analytics.netBalance)}.`;
  const maxCategory = Math.max(...categoryData.map((item) => item.value), 1);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload?.length) {
      return (
        <Card size="sm" className="bg-popover shadow-md">
          <CardContent className="flex flex-col gap-1 py-2">
            {label && (
              <p className="text-sm font-medium text-popover-foreground">{label}</p>
            )}
            {payload.map((entry, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                {entry.name}: {formatCurrency(entry.value)}
              </p>
            ))}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">Insights</p>
          <h2 className="text-4xl font-bold text-primary sm:text-3xl sm:text-foreground">
            Analytics
          </h2>
        </div>
        <Tabs value={range} onValueChange={(value) => setRange(value as "week" | "month")}>
          <TabsList className="grid w-full grid-cols-2 sm:w-72">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {expenses.length === 0 ? (
        <Card className="shadow">
          <CardContent>
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BarChart3 />
                </EmptyMedia>
                <EmptyTitle>No data yet</EmptyTitle>
                <EmptyDescription>
                  Add transactions to unlock spending insights.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="app-card">
            <CardContent className="flex flex-col gap-4 p-5 text-center">
              <p className="finance-label text-xs text-muted-foreground">
                Net savings
              </p>
              <p
                className={
                  analytics.netBalance >= 0
                    ? "finance-amount text-5xl font-bold text-success"
                    : "finance-amount text-5xl font-bold text-destructive"
                }
              >
                {formatCurrency(analytics.netBalance)}
              </p>
              <p className="text-sm font-semibold text-success">8% vs last {range}</p>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="finance-label text-xs text-muted-foreground">
                    Total income
                  </p>
                  <p className="finance-amount mt-2 text-2xl font-bold text-foreground">
                    {formatCurrency(analytics.totalIncome)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="finance-label text-xs text-muted-foreground">
                    Expenses
                  </p>
                  <p className="finance-amount mt-2 text-2xl font-bold text-destructive">
                    {formatCurrency(analytics.totalExpenses)}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border border-border bg-card p-4 sm:col-span-1">
                  <p className="finance-label text-xs text-muted-foreground">Net</p>
                  <p
                    className={
                      analytics.netBalance >= 0
                        ? "finance-amount mt-2 text-2xl font-bold text-success"
                        : "finance-amount mt-2 text-2xl font-bold text-destructive"
                    }
                  >
                    {formatCurrency(analytics.netBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 />
                  Spending Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.monthlyTrends}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      name="Income"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="var(--destructive)"
                      strokeWidth={3}
                      name="Expense"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="app-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon />
                  Spend by category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="sr-only">{chartSummary}</p>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={88}
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`category-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty className="h-80 border border-dashed border-border">
                    <EmptyHeader>
                      <EmptyTitle>No expense data</EmptyTitle>
                      <EmptyDescription>
                        Income entries are tracked separately from spending.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="app-card bg-primary/10">
            <CardContent className="flex gap-4 p-5">
              <Lightbulb className="mt-1 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-primary">
                {topCategory
                  ? `You've spent the most on ${topCategory.name}. Consider reviewing this category before the next entry.`
                  : "Add expense transactions to unlock spending recommendations."}
              </p>
            </CardContent>
          </Card>

          <Card className="app-card">
            <CardHeader>
              <CardTitle className="text-2xl">Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-5">
                {categoryData.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center gap-4">
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-full text-primary"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${item.color} 18%, transparent)`,
                      }}
                    >
                      <BarChart3 />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-base font-bold text-foreground">
                          {item.name}
                        </p>
                        <p className="finance-amount shrink-0 font-semibold text-foreground">
                          {formatCurrency(item.value)}
                        </p>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(8, (item.value / maxCategory) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Analytics;
