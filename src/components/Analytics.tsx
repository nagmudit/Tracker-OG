"use client";

import React, { useMemo } from "react";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
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

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const Analytics: React.FC = () => {
  const { expenses, categories } = useExpense();

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
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">Insights</p>
        <h2 className="text-3xl font-semibold text-foreground">Analytics</h2>
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
          <Card className="shadow">
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Spent</p>
                  <p className="text-xl font-semibold text-destructive">
                    {formatCurrency(analytics.totalExpenses)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Received</p>
                  <p className="text-xl font-semibold text-primary">
                    {formatCurrency(analytics.totalIncome)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net</p>
                  <p
                    className={
                      analytics.netBalance >= 0
                        ? "text-xl font-semibold text-primary"
                        : "text-xl font-semibold text-destructive"
                    }
                  >
                    {formatCurrency(analytics.netBalance)}
                  </p>
                </div>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">{chartSummary}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 />
                  Spend by category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="sr-only">{chartSummary}</p>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
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

            <Card className="shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon />
                  Cashflow trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="sr-only">{chartSummary}</p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={analytics.monthlyTrends}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="var(--destructive)"
                      strokeWidth={2}
                      name="Expenses"
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      name="Income"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
