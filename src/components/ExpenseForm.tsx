"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CreditCard,
  IndianRupee,
  Plus,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { useExpense } from "@/context/ExpenseContext";
import { Expense } from "@/types/expense";
import { tokenToCssVar } from "@/utils/theme-colors";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
    setError("");
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
          className="no-scrollbar mx-auto max-h-[86dvh] max-w-xl gap-0 overflow-y-auto rounded-t-xl border-border"
        >
          <SheetHeader className="p-4 pb-2">
            <SheetTitle>{isEditing ? "Edit transaction" : "Quick add"}</SheetTitle>
            <SheetDescription>
              {isEditing ? "Update the saved entry." : "Amount first, details second."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Type</FieldLabel>
                <ToggleGroup
                  value={[formData.transactionType]}
                  onValueChange={(value) => {
                    const nextValue = value[0] as Expense["transactionType"] | undefined;
                    if (nextValue) updateField("transactionType", nextValue);
                  }}
                  className="grid w-full grid-cols-2 rounded-lg bg-muted p-1"
                  spacing={0}
                >
                  <ToggleGroupItem value="debit" className="h-9">
                    Expense
                  </ToggleGroupItem>
                  <ToggleGroupItem value="credit" className="h-9">
                    Income
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              <Field data-invalid={Boolean(error && !formData.amount)}>
                <FieldLabel htmlFor="amount">Amount</FieldLabel>
                <InputGroup className="h-12">
                  <InputGroupAddon>
                    <IndianRupee />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) => updateField("amount", event.target.value)}
                    placeholder="0"
                    className="text-xl font-semibold"
                    aria-invalid={Boolean(error && !formData.amount)}
                    autoFocus
                  />
                </InputGroup>
              </Field>

              <Field data-invalid={Boolean(error && !formData.category)}>
                <FieldLabel>Category</FieldLabel>
                <ToggleGroup
                  value={formData.category ? [formData.category] : []}
                  onValueChange={(value) => {
                    const nextValue = value[0];
                    if (nextValue) updateField("category", nextValue);
                  }}
                  className="no-scrollbar flex w-full overflow-x-auto pb-1"
                  variant="outline"
                >
                  {categoryOptions.map((category) => (
                    <ToggleGroupItem
                        key={category.id}
                        value={category.name}
                        className="h-8 shrink-0 rounded-full"
                      >
                      <span
                        className="size-2.5 rounded-full border border-border"
                        style={{ backgroundColor: tokenToCssVar(category.color) }}
                      />
                      {category.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Select
                  value={formData.category}
                  onValueChange={(value) => updateField("category", value || "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Payment</FieldLabel>
                <ToggleGroup
                  value={[formData.paymentMethod]}
                  onValueChange={(value) => {
                    const nextValue = value[0] as Expense["paymentMethod"] | undefined;
                    if (nextValue) updateField("paymentMethod", nextValue);
                  }}
                  className="grid w-full grid-cols-4 gap-2"
                  variant="outline"
                >
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <ToggleGroupItem
                        key={method.value}
                        value={method.value}
                        className="h-12 flex-col gap-0.5 px-1 text-xs"
                      >
                        <Icon />
                        <span>{method.label}</span>
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              </Field>

              <Field>
                <FieldLabel>Date</FieldLabel>
                <ToggleGroup
                  value={[formData.date]}
                  onValueChange={(value) => {
                    const nextValue = value[0];
                    if (nextValue) updateField("date", nextValue);
                  }}
                  className="grid w-full grid-cols-2 gap-2"
                  variant="outline"
                >
                  <ToggleGroupItem value={today()} className="h-9">
                    Today
                  </ToggleGroupItem>
                  <ToggleGroupItem value={yesterday()} className="h-9">
                    Yesterday
                  </ToggleGroupItem>
                </ToggleGroup>
                <InputGroup>
                  <InputGroupAddon>
                    <CalendarDays />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="date"
                    value={formData.date}
                    onChange={(event) => updateField("date", event.target.value)}
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Note</FieldLabel>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Optional"
                  rows={2}
                />
              </Field>

              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>

            <SheetFooter className="sticky bottom-0 -mx-4 border-t border-border bg-popover px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? "Save" : "Add"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ExpenseForm;
