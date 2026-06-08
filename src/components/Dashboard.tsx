"use client";

import React, { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { useExpense } from "@/context/ExpenseContext";
import { calculateTotals, formatCurrency } from "@/utils/expense-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TimeFilter = "week" | "month" | "year" | "all";

const timeOptions: Array<{ value: TimeFilter; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

interface DashboardProps {
  onAddTransaction?: () => void;
  onViewTransactions?: () => void;
}

const transactionDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const Dashboard: React.FC<DashboardProps> = ({
  onAddTransaction,
  onViewTransactions,
}) => {
  const { expenses } = useExpense();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");

  const filteredExpenses = React.useMemo(() => {
    const now = new Date();
    const startDate = new Date();

    if (timeFilter === "week") {
      startDate.setDate(now.getDate() - 7);
      return expenses.filter((expense) => new Date(expense.date) >= startDate);
    }

    if (timeFilter === "month") {
      startDate.setMonth(now.getMonth() - 1);
      return expenses.filter((expense) => new Date(expense.date) >= startDate);
    }

    if (timeFilter === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
      return expenses.filter((expense) => new Date(expense.date) >= startDate);
    }

    return expenses;
  }, [expenses, timeFilter]);

  const totals = calculateTotals(filteredExpenses);
  const debitCount = filteredExpenses.filter(
    (item) => item.transactionType === "debit"
  ).length;
  const creditCount = filteredExpenses.filter(
    (item) => item.transactionType === "credit"
  ).length;
  const recentTransactions = filteredExpenses.slice(0, 5);

  const expensePercent =
    totals.totalIncome > 0
      ? Math.min(100, Math.round((totals.totalExpenses / totals.totalIncome) * 100))
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground sm:hidden">Welcome back,</p>
          <h1 className="text-3xl font-bold tracking-normal text-foreground sm:text-4xl">
            Your money today
          </h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Welcome back, your finances are looking steady.
          </p>
        </div>
        <Tabs
          value={timeFilter}
          onValueChange={(value) => setTimeFilter(value as TimeFilter)}
        >
          <TabsList className="grid w-full grid-cols-4 sm:w-fit">
            {timeOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr_1fr]">
        <Card className="balance-panel border-primary/20 py-5 shadow-lg shadow-primary/15">
          <CardContent className="flex min-h-56 flex-col justify-between gap-8 p-5 sm:min-h-48 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-3">
                <p className="text-lg font-medium text-white/75">Net Balance</p>
                <p className="finance-amount text-4xl font-bold leading-tight text-white sm:text-5xl">
                  {formatCurrency(totals.netBalance)}
                </p>
              </div>
              <Wallet />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="finance-label text-xs text-white/70">Received</p>
                <p className="finance-amount mt-2 text-xl font-bold text-secondary">
                  {formatCurrency(totals.totalIncome)}
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="finance-label text-xs text-white/70">Spent</p>
                <p className="finance-amount mt-2 text-xl font-bold text-white">
                  {formatCurrency(totals.totalExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardContent className="flex min-h-40 flex-col justify-between gap-5 p-5">
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-success">
                <ArrowDownLeft />
              </span>
              <span className="finance-label text-xs text-success">+ income</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received</p>
              <p className="finance-amount mt-1 text-3xl font-bold text-foreground">
                {formatCurrency(totals.totalIncome)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{creditCount} entries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardContent className="flex min-h-40 flex-col justify-between gap-5 p-5">
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                <ArrowUpRight />
              </span>
              <span className="finance-label text-xs text-destructive">
                {expensePercent}% used
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="finance-amount mt-1 text-3xl font-bold text-foreground">
                {formatCurrency(totals.totalExpenses)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{debitCount} entries</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="app-card">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Recent Transactions</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onViewTransactions}
            >
              View All
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>No entries yet</EmptyTitle>
                <EmptyDescription>
                  Add a transaction to see your latest activity here.
                </EmptyDescription>
              </EmptyHeader>
              {onAddTransaction && (
                <Button type="button" onClick={onAddTransaction}>
                  Add Transaction
                </Button>
              )}
            </Empty>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-primary">
                      {transaction.category.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-foreground">
                        {transaction.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transactionDateFormatter.format(
                          new Date(`${transaction.date}T00:00:00`)
                        )} |{" "}
                        {transaction.paymentMethod.replace("-", " ")}
                      </p>
                    </div>
                  </div>
                  <p
                    className={
                      transaction.transactionType === "credit"
                        ? "finance-amount shrink-0 font-bold text-success"
                        : "finance-amount shrink-0 font-bold text-destructive"
                    }
                  >
                    {transaction.transactionType === "credit" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="app-card bg-muted/55">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-primary" />
            <p className="text-lg font-semibold text-foreground">Spending Insights</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${expensePercent}%` }}
              />
            </div>
            <p className="finance-amount text-sm text-muted-foreground">
              {expensePercent}% of income
            </p>
          </div>
          <p className="text-sm italic leading-6 text-muted-foreground">
            {totals.totalExpenses > 0
              ? "Review your top categories before the next big purchase."
              : "Add a transaction to unlock weekly spending signals."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
