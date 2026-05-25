"use client";

import React, { useState } from "react";
import { useExpense } from "@/context/ExpenseContext";
import { calculateTotals, formatCurrency } from "@/utils/expense-utils";
import { DollarSign, Moon, Sun, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const totals = calculateTotals(filteredExpenses);
  const recentTransactions = filteredExpenses.slice(0, 5);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    tone,
    detail,
  }: {
    title: string;
    value: string;
    icon: React.ElementType;
    tone: "primary" | "destructive" | "secondary";
    detail?: string;
  }) => (
    <Card className="shadow">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <CardAction>
          <div className="rounded-md bg-muted p-2">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p
          className={
            tone === "destructive"
              ? "text-2xl font-semibold text-destructive"
              : tone === "secondary"
              ? "text-2xl font-semibold text-secondary-foreground"
              : "text-2xl font-semibold text-primary"
          }
        >
          {value}
        </p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge variant="secondary">Overview</Badge>
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track cash flow and spot the latest spending movement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={timeFilter}
            onValueChange={(value) =>
              setTimeFilter(value as "all" | "month" | "week")
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" size="icon-lg" onClick={toggleTheme}>
            {theme === "light" ? <Moon /> : <Sun />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totals.totalExpenses)}
          icon={TrendingDown}
          tone="destructive"
          detail={`${filteredExpenses.filter((item) => item.transactionType === "debit").length} transactions`}
        />
        <StatCard
          title="Total Income"
          value={formatCurrency(totals.totalIncome)}
          icon={TrendingUp}
          tone="primary"
          detail={`${filteredExpenses.filter((item) => item.transactionType === "credit").length} transactions`}
        />
        <StatCard
          title="Net Balance"
          value={formatCurrency(totals.netBalance)}
          icon={DollarSign}
          tone={totals.netBalance >= 0 ? "primary" : "destructive"}
        />
      </div>

      <Card className="shadow">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>The latest five entries in the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No recent transactions.
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
                      {transaction.category.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {transaction.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()} ·{" "}
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
