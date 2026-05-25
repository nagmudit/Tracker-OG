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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <div className="space-y-1">
        <Badge variant="secondary">Ledger</Badge>
        <h2 className="text-3xl font-semibold text-foreground">Transactions</h2>
        <p className="text-sm text-muted-foreground">
          Search, filter, edit, or remove entries.
        </p>
      </div>

      <Card className="shadow">
        <CardContent className="space-y-3 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search category, note, or payment"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Select
              value={filter}
              onValueChange={(value) =>
                setFilter(value as "all" | "debit" | "credit")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="debit">Expenses</SelectItem>
                <SelectItem value="credit">Income</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={category}
              onValueChange={(value) => setCategory(value || "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                setPaymentMethod(value as "all" | Expense["paymentMethod"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                {Object.entries(paymentMeta).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as "date" | "amount")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest first</SelectItem>
                <SelectItem value="amount">Highest amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {sortedExpenses.length === 0 ? (
        <Card className="border-dashed shadow">
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto mb-4 size-14 text-muted-foreground" />
            <p className="font-medium text-foreground">No transactions found</p>
            <p className="text-sm text-muted-foreground">
              Adjust filters or add your first entry.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedExpenses.map((expense) => {
            const PaymentIcon = paymentMeta[expense.paymentMethod]?.icon || WalletCards;
            const paymentLabel = paymentMeta[expense.paymentMethod]?.label || "Payment";

            return (
              <Card key={expense.id} className="shadow">
                <CardHeader>
                  <div className="flex gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <PaymentIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate">{expense.category}</CardTitle>
                      <CardDescription>
                        {format(new Date(expense.date), "MMM dd, yyyy")} · {paymentLabel}
                      </CardDescription>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={
                          expense.transactionType === "credit"
                            ? "font-semibold text-primary"
                            : "font-semibold text-destructive"
                        }
                      >
                        {expense.transactionType === "credit" ? "+" : "-"}
                        {formatCurrency(expense.amount)}
                      </p>
                      <Badge variant="outline">
                        {expense.transactionType === "credit" ? "Income" : "Expense"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {(expense.description || true) && (
                  <CardContent className="flex items-center justify-between gap-3">
                    <p className="min-w-0 break-words text-sm text-muted-foreground">
                      {expense.description || "No note"}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingExpense(expense)}
                      >
                        <Edit3 />
                        <span className="sr-only">Edit transaction</span>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => deleteExpense(expense.id)}
                      >
                        <Trash2 />
                        <span className="sr-only">Delete transaction</span>
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
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
