"use client";

import React, { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays } from "lucide-react";
import { useExpense } from "@/context/ExpenseContext";
import { calculateTotals, formatCurrency } from "@/utils/expense-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TimeFilter = "week" | "month" | "all";

const timeOptions: Array<{ value: TimeFilter; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
];

const Dashboard: React.FC = () => {
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

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
          <h1 className="text-3xl font-semibold text-foreground">Your money today</h1>
        </div>
        <Tabs
          value={timeFilter}
          onValueChange={(value) => setTimeFilter(value as TimeFilter)}
        >
          <TabsList>
            {timeOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <Card className="shadow">
        <CardHeader>
          <CardTitle>Net balance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p
              className={
                totals.netBalance >= 0
                  ? "text-4xl font-semibold text-primary sm:text-5xl"
                  : "text-4xl font-semibold text-destructive sm:text-5xl"
              }
            >
              {formatCurrency(totals.netBalance)}
            </p>
            <p className="text-sm text-muted-foreground">
              {filteredExpenses.length} entries in this view
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-destructive">
                  <ArrowDownLeft />
                </span>
                <div>
                  <p className="font-medium text-foreground">Spent</p>
                  <p className="text-xs text-muted-foreground">{debitCount} entries</p>
                </div>
              </div>
              <p className="font-semibold text-destructive">
                {formatCurrency(totals.totalExpenses)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
                  <ArrowUpRight />
                </span>
                <div>
                  <p className="font-medium text-foreground">Received</p>
                  <p className="text-xs text-muted-foreground">{creditCount} entries</p>
                </div>
              </div>
              <p className="font-semibold text-primary">
                {formatCurrency(totals.totalIncome)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow">
        <CardHeader>
          <CardTitle>Recent</CardTitle>
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
            </Empty>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                      {transaction.category.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {transaction.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()} |{" "}
                        {transaction.paymentMethod.replace("-", " ")}
                      </p>
                    </div>
                  </div>
                  <p
                    className={
                      transaction.transactionType === "credit"
                        ? "shrink-0 font-semibold text-primary"
                        : "shrink-0 font-semibold text-destructive"
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
    </div>
  );
};

export default Dashboard;
