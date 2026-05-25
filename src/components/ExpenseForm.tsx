"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useExpense } from "@/context/ExpenseContext";
import { Expense } from "@/types/expense";
import {
  Banknote,
  CalendarDays,
  CreditCard,
  IndianRupee,
  Plus,
  Smartphone,
  WalletCards,
  X,
} from "lucide-react";

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
  const { addExpense, updateExpense, categories, theme } = useExpense();
  const [internalOpen, setInternalOpen] = useState(false);
  const [error, setError] = useState("");
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const isEditing = Boolean(expense);

  const [formData, setFormData] = useState<FormState>(defaultFormState);

  const activeColor =
    theme === "dark"
      ? "bg-green-500 border-green-500 text-white"
      : "bg-pink-500 border-pink-500 text-white";
  const focusColor =
    theme === "dark"
      ? "focus:ring-green-500"
      : "focus:ring-pink-500";

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
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-colors sm:bottom-6 sm:right-6 lg:bottom-6 ${
            theme === "dark"
              ? "bg-green-500 hover:bg-green-600"
              : "bg-pink-500 hover:bg-pink-600"
          }`}
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl dark:bg-gray-800 sm:max-w-lg sm:rounded-lg sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isEditing ? "Edit Transaction" : "Quick Add"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isEditing ? "Update the saved entry" : "Log it before you forget it"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label="Close transaction form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                {(["debit", "credit"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateField("transactionType", type)}
                    className={`h-11 rounded-md text-sm font-semibold transition-colors ${
                      formData.transactionType === type
                        ? activeColor
                        : "text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {type === "debit" ? "Expense" : "Income"}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount
                </label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) => updateField("amount", event.target.value)}
                    placeholder="0"
                    className={`h-14 w-full rounded-lg border border-gray-300 bg-white px-4 pl-10 text-2xl font-semibold text-gray-900 outline-none focus:ring-2 ${focusColor} dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {categoryOptions.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => updateField("category", category.name)}
                      className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                        formData.category === category.name
                          ? activeColor
                          : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </button>
                  ))}
                </div>
                <select
                  value={formData.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  className={`mt-3 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 ${focusColor} dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payment
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => updateField("paymentMethod", method.value)}
                        className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors ${
                          formData.paymentMethod === method.value
                            ? activeColor
                            : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Today", value: today() },
                    { label: "Yesterday", value: yesterday() },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => updateField("date", option.value)}
                      className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                        formData.date === option.value
                          ? activeColor
                          : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="relative mt-3">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) => updateField("date", event.target.value)}
                    className={`h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pl-9 text-sm text-gray-900 outline-none focus:ring-2 ${focusColor} dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Note
                </label>
                <textarea
                  value={formData.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Optional"
                  rows={2}
                  className={`w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 ${focusColor} dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pb-2 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-12 flex-1 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`h-12 flex-1 rounded-lg px-4 text-sm font-semibold text-white transition-colors ${
                    theme === "dark"
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-pink-500 hover:bg-pink-600"
                  }`}
                >
                  {isEditing ? "Save Changes" : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpenseForm;
