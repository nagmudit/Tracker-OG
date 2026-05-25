"use client";

import React, { useMemo } from "react";
import { useExpense } from "@/context/ExpenseContext";
import {
  calculateTotals,
  formatCurrency,
  getCategoryBreakdown,
  getMonthlyTrends,
  getPaymentMethodBreakdown,
} from "@/utils/expense-utils";
import { tokenToCssVar } from "@/utils/theme-colors";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
} from "recharts";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
      paymentMethodBreakdown: getPaymentMethodBreakdown(expenses),
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

  const paymentMethodData = Object.entries(analytics.paymentMethodBreakdown).map(
    ([method, amount]) => ({
      name: method.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value: amount,
    })
  );

  const StatCard = ({
    title,
    value,
    icon: Icon,
    tone,
  }: {
    title: string;
    value: string;
    icon: React.ElementType;
    tone: "primary" | "destructive";
  }) => (
    <Card className="shadow">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <CardAction>
          <Icon className="size-5 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p
          className={
            tone === "destructive"
              ? "text-2xl font-semibold text-destructive"
              : "text-2xl font-semibold text-primary"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
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
    if (active && payload?.length) {
      return (
        <Card size="sm" className="bg-popover shadow-md">
          <CardContent className="py-2">
            <p className="text-sm font-medium text-popover-foreground">{label}</p>
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
    <div className="space-y-6">
      <div className="space-y-1">
        <Badge variant="secondary">Insights</Badge>
        <h2 className="text-3xl font-semibold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          See where money comes from, where it goes, and how it changes over time.
        </p>
      </div>

      {expenses.length === 0 ? (
        <Card className="shadow">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Add transactions to unlock analytics.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Total Expenses"
              value={formatCurrency(analytics.totalExpenses)}
              icon={TrendingDown}
              tone="destructive"
            />
            <StatCard
              title="Total Income"
              value={formatCurrency(analytics.totalIncome)}
              icon={TrendingUp}
              tone="primary"
            />
            <StatCard
              title="Net Balance"
              value={formatCurrency(analytics.netBalance)}
              icon={DollarSign}
              tone={analytics.netBalance >= 0 ? "primary" : "destructive"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="shadow">
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Debit transactions grouped by category.</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${percent ? (percent * 100).toFixed(0) : "0"}%`
                        }
                        outerRadius={82}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`category-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No expense data available.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Debit totals by payment method.</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentMethodData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={paymentMethodData}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="var(--chart-2)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No payment method data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow">
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Income and expenses for the last six months.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={380}>
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
        </>
      )}
    </div>
  );
};

export default Analytics;
