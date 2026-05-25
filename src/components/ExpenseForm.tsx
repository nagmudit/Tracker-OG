"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useExpense } from "@/context/ExpenseContext";
import { Expense } from "@/types/expense";
import { tokenToCssVar } from "@/utils/theme-colors";
import {
  Banknote,
  CalendarDays,
  CreditCard,
  IndianRupee,
  Plus,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  amount: string;
  category: string;
  paymentMethod: Expense["paymentMethod"];
  transactionType: Expense["transactionType"];
  description: string;
  date: string;
};

interface ExpenseFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  expense?: Expense | null;
  hideTrigger?: boolean;
  onSaved?: () => void;
}

const today = () => new Date().toISOString().split("T")[0];

const yesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

const defaultFormState = (): FormState => ({
  amount: "",
  category: "",
  paymentMethod: "cash",
  transactionType: "debit",
  description: "",
  date: today(),
});

const paymentMethods: Array<{
  value: Expense["paymentMethod"];
  label: string;
  icon: React.ElementType;
}> = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "credit-card", label: "Credit", icon: CreditCard },
  { value: "debit-card", label: "Debit", icon: WalletCards },
];

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  open,
  onOpenChange,
  expense,
  hideTrigger = false,
  onSaved,
}) => {
  const { addExpense, updateExpense, categories } = useExpense();
  const [internalOpen, setInternalOpen] = useState(false);
  const [error, setError] = useState("");
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const isEditing = Boolean(expense);
  const [formData, setFormData] = useState<FormState>(defaultFormState);

  const setOpen = (nextOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
  };

  const categoryOptions = useMemo(() => categories.slice(0, 10), [categories]);

  useEffect(() => {
    if (!isOpen) return;

    if (expense) {
      setFormData({
        amount: String(expense.amount),
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        transactionType: expense.transactionType,
        description: expense.description || "",
        date: expense.date,
      });
      setError("");
      return;
    }

    const lastCategory = localStorage.getItem("last-category") || "";
    const lastPayment =
      (localStorage.getItem("last-payment-method") as Expense["paymentMethod"]) ||
      "cash";

    setFormData({
      ...defaultFormState(),
      category: categories.some((category) => category.name === lastCategory)
        ? lastCategory
        : "",
      paymentMethod: paymentMethods.some((method) => method.value === lastPayment)
        ? lastPayment
        : "cash",
    });
    setError("");
  }, [categories, expense, isOpen]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number.parseFloat(formData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!formData.category) {
      setError("Choose a category.");
      return;
    }

    const payload = {
      amount,
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      transactionType: formData.transactionType,
      description: formData.description,
      date: formData.date,
    };

    if (expense) {
      await updateExpense(expense.id, payload);
    } else {
      await addExpense(payload);
      localStorage.setItem("last-category", formData.category);
      localStorage.setItem("last-payment-method", formData.paymentMethod);
    }

    onSaved?.();
    setOpen(false);
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          className="fixed bottom-20 right-4 z-40 size-14 rounded-full shadow-lg sm:bottom-6 sm:right-6 lg:bottom-6"
          onClick={() => setOpen(true)}
        >
          <Plus />
          <span className="sr-only">Add transaction</span>
        </Button>
      )}

      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[92vh] max-w-2xl overflow-y-auto rounded-t-xl border-border"
        >
          <SheetHeader>
            <SheetTitle>{isEditing ? "Edit Transaction" : "Quick Add"}</SheetTitle>
            <SheetDescription>
              {isEditing ? "Update the saved entry." : "Log it before it slips away."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {(["debit", "credit"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={formData.transactionType === type ? "default" : "ghost"}
                  onClick={() => updateField("transactionType", type)}
                >
                  {type === "debit" ? "Expense" : "Income"}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                  placeholder="0"
                  className="h-14 pl-10 text-2xl font-semibold"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categoryOptions.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant={formData.category === category.name ? "default" : "outline"}
                    className="shrink-0 rounded-full"
                    onClick={() => updateField("category", category.name)}
                  >
                    <span
                      className="size-2.5 rounded-full border border-border"
                      style={{ backgroundColor: tokenToCssVar(category.color) }}
                    />
                    {category.name}
                  </Button>
                ))}
              </div>
              <Select
                value={formData.category}
                onValueChange={(value) => updateField("category", value || "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment</Label>
              <div className="grid grid-cols-4 gap-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.value}
                      type="button"
                      variant={
                        formData.paymentMethod === method.value ? "default" : "outline"
                      }
                      className="h-16 flex-col gap-1"
                      onClick={() => updateField("paymentMethod", method.value)}
                    >
                      <Icon />
                      <span className="text-xs">{method.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Today", value: today() },
                  { label: "Yesterday", value: yesterday() },
                ].map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    variant={formData.date === option.value ? "default" : "outline"}
                    onClick={() => updateField("date", option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Note</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Optional"
                rows={2}
              />
            </div>

            {error && (
              <Card size="sm" className="border-destructive bg-destructive/10 text-destructive">
                <CardContent className="py-2 text-sm">{error}</CardContent>
              </Card>
            )}

            <SheetFooter className="px-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? "Save Changes" : "Add Transaction"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ExpenseForm;
