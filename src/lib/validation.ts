import { Category, Expense } from "@/types/expense";
import { validateEmail, validatePassword } from "@/lib/auth";
import { isCategoryColorToken } from "@/utils/theme-colors";

const paymentMethods: Expense["paymentMethod"][] = [
  "cash",
  "upi",
  "credit-card",
  "debit-card",
];

const transactionTypes: Expense["transactionType"][] = ["credit", "debit"];

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDateString(value: string): boolean {
  if (!isoDateRegex.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export function validateId(id: unknown, label = "ID"): ValidationResult<string> {
  const value = cleanString(id);
  if (!value) {
    return { ok: false, error: `${label} is required` };
  }
  if (value.length > 120) {
    return { ok: false, error: `${label} is too long` };
  }
  return { ok: true, value };
}

export function validateSignupInput(input: Record<string, unknown>) {
  const email = cleanString(input.email).toLowerCase();
  const name = cleanString(input.name);
  const password = typeof input.password === "string" ? input.password : "";
  const securityQuestion = cleanString(input.securityQuestion);
  const securityAnswer = cleanString(input.securityAnswer);

  if (!email || !name || !password || !securityQuestion || !securityAnswer) {
    return {
      ok: false as const,
      error:
        "Email, name, password, security question, and security answer are required",
    };
  }
  if (!validateEmail(email)) {
    return { ok: false as const, error: "Invalid email format" };
  }
  if (name.length < 2 || name.length > 80) {
    return { ok: false as const, error: "Name must be 2-80 characters" };
  }
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return { ok: false as const, error: passwordValidation.message || "Invalid password" };
  }
  if (securityQuestion.length > 160 || securityAnswer.length > 120) {
    return { ok: false as const, error: "Security question or answer is too long" };
  }

  return {
    ok: true as const,
    value: { email, name, password, securityQuestion, securityAnswer },
  };
}

export function validateExpenseInput(
  input: Record<string, unknown>
): ValidationResult<Omit<Expense, "id" | "createdAt">> {
  const amount =
    typeof input.amount === "number"
      ? input.amount
      : Number.parseFloat(String(input.amount ?? ""));
  const category = cleanString(input.category);
  const paymentMethod = input.paymentMethod as Expense["paymentMethod"];
  const transactionType = input.transactionType as Expense["transactionType"];
  const description = cleanString(input.description).slice(0, 240);
  const date = cleanString(input.date);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be greater than zero" };
  }
  if (!category || category.length > 80) {
    return { ok: false, error: "Category is required and must be under 80 characters" };
  }
  if (!paymentMethods.includes(paymentMethod)) {
    return { ok: false, error: "Invalid payment method" };
  }
  if (!transactionTypes.includes(transactionType)) {
    return { ok: false, error: "Invalid transaction type" };
  }
  if (!isValidDateString(date)) {
    return { ok: false, error: "Invalid transaction date" };
  }

  return {
    ok: true,
    value: { amount, category, paymentMethod, transactionType, description, date },
  };
}

export function validateExpenseUpdates(
  input: Record<string, unknown>
): ValidationResult<Partial<Expense>> {
  const updates: Partial<Expense> = {};

  if (input.amount !== undefined) {
    const amount =
      typeof input.amount === "number"
        ? input.amount
        : Number.parseFloat(String(input.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Amount must be greater than zero" };
    }
    updates.amount = amount;
  }

  if (input.category !== undefined) {
    const category = cleanString(input.category);
    if (!category || category.length > 80) {
      return { ok: false, error: "Category is required and must be under 80 characters" };
    }
    updates.category = category;
  }

  if (input.paymentMethod !== undefined) {
    const paymentMethod = input.paymentMethod as Expense["paymentMethod"];
    if (!paymentMethods.includes(paymentMethod)) {
      return { ok: false, error: "Invalid payment method" };
    }
    updates.paymentMethod = paymentMethod;
  }

  if (input.transactionType !== undefined) {
    const transactionType = input.transactionType as Expense["transactionType"];
    if (!transactionTypes.includes(transactionType)) {
      return { ok: false, error: "Invalid transaction type" };
    }
    updates.transactionType = transactionType;
  }

  if (input.description !== undefined) {
    updates.description = cleanString(input.description).slice(0, 240);
  }

  if (input.date !== undefined) {
    const date = cleanString(input.date);
    if (!isValidDateString(date)) {
      return { ok: false, error: "Invalid transaction date" };
    }
    updates.date = date;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "At least one expense field is required" };
  }

  return { ok: true, value: updates };
}

export function validateCategoryInput(
  input: Record<string, unknown>
): ValidationResult<Omit<Category, "id" | "isDefault">> {
  const name = cleanString(input.name);
  const color = cleanString(input.color);

  if (!name || name.length > 40) {
    return { ok: false, error: "Category name is required and must be under 40 characters" };
  }
  if (!isCategoryColorToken(color)) {
    return { ok: false, error: "Category color must be a theme token" };
  }

  return { ok: true, value: { name, color } };
}
