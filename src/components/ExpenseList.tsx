"use client";

import React, { useMemo, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  Banknote,
  Calendar,
  CreditCard,
  Edit3,
  Filter,
  MoreVertical,
  Search,
  Smartphone,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useExpense } from "@/context/ExpenseContext";
import { formatCurrency } from "@/utils/expense-utils";
import { Expense } from "@/types/expense";
import ExpenseForm from "@/components/ExpenseForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  const [paymentMethod, setPaymentMethod] = useState<
    "all" | Expense["paymentMethod"]
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

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

  const activeFilterCount = [
    filter !== "all",
    category !== "all",
    paymentMethod !== "all",
    Boolean(startDate),
    Boolean(endDate),
    sortBy !== "date",
  ].filter(Boolean).length;

  const groupedExpenses = useMemo(() => {
    return sortedExpenses.reduce<Array<{ label: string; items: Expense[] }>>(
      (groups, expense) => {
        const date = new Date(expense.date);
        const label = isToday(date)
          ? "Today"
          : isYesterday(date)
            ? "Yesterday"
            : format(date, "MMM dd, yyyy");
        const lastGroup = groups[groups.length - 1];

        if (lastGroup?.label === label) {
          lastGroup.items.push(expense);
        } else {
          groups.push({ label, items: [expense] });
        }

        return groups;
      },
      []
    );
  }, [sortedExpenses]);

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    setCategory("all");
    setPaymentMethod("all");
    setStartDate("");
    setEndDate("");
    setSortBy("date");
  };

  const confirmDelete = async () => {
    if (!deletingExpense) return;
    await deleteExpense(deletingExpense.id);
    setDeletingExpense(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">Ledger</p>
          <h2 className="text-4xl font-bold text-primary sm:text-3xl sm:text-foreground">
            History
          </h2>
        </div>
        <Badge variant="secondary" className="finance-label h-7 w-fit">
          {sortedExpenses.length} shown
        </Badge>
      </header>

      <div className="flex flex-col gap-4">
        <InputGroup className="h-14 border-transparent bg-muted">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions"
            className="text-lg"
          />
        </InputGroup>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {[
            { label: "Type", active: filter !== "all" },
            { label: "Category", active: category !== "all" },
            { label: "Date", active: Boolean(startDate || endDate) },
            { label: "Payment", active: paymentMethod !== "all" },
          ].map((chip) => (
            <Button
              key={chip.label}
              type="button"
              variant={chip.active ? "default" : "secondary"}
              className="shrink-0 rounded-full"
              onClick={() => setIsFilterOpen(true)}
            >
              {chip.label === "Type" && <Filter data-icon="inline-start" />}
              {chip.label}
            </Button>
          ))}
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 rounded-full"
              onClick={clearFilters}
            >
              Clear {activeFilterCount}
            </Button>
          )}
        </div>
      </div>

      <Card className="app-card overflow-visible bg-transparent py-0 sm:bg-card sm:py-4">
        <CardContent className="px-0 sm:px-4">
          {sortedExpenses.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Calendar />
                </EmptyMedia>
                <EmptyTitle>No transactions found</EmptyTitle>
                <EmptyDescription>
                  Adjust filters or add a new transaction.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-6">
              {groupedExpenses.map((group) => (
                <section key={group.label} className="flex flex-col gap-3">
                  <p className="finance-label text-xs text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    {group.items.map((expense) => {
                      const PaymentIcon =
                        paymentMeta[expense.paymentMethod]?.icon || WalletCards;
                      const paymentLabel =
                        paymentMeta[expense.paymentMethod]?.label || "Payment";

                      return (
                        <div key={expense.id} className="flex items-center gap-3 p-4">
                          <span
                            className={
                              expense.transactionType === "credit"
                                ? "flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-success"
                                : "flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary"
                            }
                          >
                            <PaymentIcon />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-foreground">
                                  {expense.category}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                  {paymentLabel} | {format(new Date(expense.date), "hh:mm a")}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p
                                  className={
                                    expense.transactionType === "credit"
                                      ? "finance-amount font-bold text-success"
                                      : "finance-amount font-bold text-destructive"
                                  }
                                >
                                  {expense.transactionType === "credit" ? "+" : "-"}
                                  {formatCurrency(expense.amount)}
                                </p>
                                <Badge variant="outline" className="finance-label mt-1">
                                  {expense.transactionType === "credit"
                                    ? "Credit"
                                    : "Debit"}
                                </Badge>
                              </div>
                            </div>
                            {expense.description && (
                              <p className="mt-1 break-words text-sm text-muted-foreground">
                                {expense.description}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button type="button" variant="ghost" size="icon-sm" />
                              }
                            >
                              <MoreVertical />
                              <span className="sr-only">Transaction actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                                  <Edit3 />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeletingExpense(expense)}
                                >
                                  <Trash2 />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[88dvh] max-w-xl overflow-y-auto rounded-t-xl"
        >
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Type</FieldLabel>
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
                    <SelectGroup>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="debit">Expenses</SelectItem>
                      <SelectItem value="credit">Income</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value || "all")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((item) => (
                        <SelectItem key={item.id} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Payment</FieldLabel>
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
                    <SelectGroup>
                      <SelectItem value="all">All payments</SelectItem>
                      {Object.entries(paymentMeta).map(([value, meta]) => (
                        <SelectItem key={value} value={value}>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Sort</FieldLabel>
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as "date" | "amount")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="date">Newest first</SelectItem>
                      <SelectItem value="amount">Highest amount</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="start-date">From</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="end-date">To</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </InputGroup>
                </Field>
              </div>
            </FieldGroup>
          </div>
          <SheetFooter>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
              <Button type="button" onClick={() => setIsFilterOpen(false)}>
                Apply
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ExpenseForm
        open={Boolean(editingExpense)}
        onOpenChange={(open) => {
          if (!open) setEditingExpense(null);
        }}
        expense={editingExpense}
        hideTrigger
      />

      <AlertDialog
        open={Boolean(deletingExpense)}
        onOpenChange={(open) => {
          if (!open) setDeletingExpense(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete transaction</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseList;
