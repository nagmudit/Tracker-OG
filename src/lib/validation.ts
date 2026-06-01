import { Category, Expense, ScheduledTransaction } from "@/types/expense";
import { SplitMode } from "@/types/split";
import { validateEmail, validatePassword } from "@/lib/auth";
import { isCategoryColorToken } from "@/utils/theme-colors";

const paymentMethods: Expense["paymentMethod"][] = [
  "cash",
  "upi",
  "credit-card",
  "debit-card",
];

const transactionTypes: Expense["transactionType"][] = ["credit", "debit"];
const scheduleFrequencies: ScheduledTransaction["frequency"][] = [
  "once",
  "weekly",
  "monthly",
  "yearly",
];

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

function cleanOptionalDate(value: unknown): string {
  const date = cleanString(value);
  return date && isValidDateString(date) ? date : "";
}

function parsePositiveAmount(value: unknown, label = "Amount") {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: `${label} must be greater than zero` };
  }
  return { ok: true as const, value: Math.round(amount * 100) / 100 };
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

export function validateScheduledTransactionInput(
  input: Record<string, unknown>
): ValidationResult<Omit<ScheduledTransaction, "id" | "createdAt">> {
  const baseValidation = validateExpenseInput({
    amount: input.amount,
    category: input.category,
    paymentMethod: input.paymentMethod,
    transactionType: input.transactionType,
    description: input.description,
    date: input.nextRunDate,
  });

  if (!baseValidation.ok) {
    return baseValidation;
  }

  const title = cleanString(input.title).slice(0, 80);
  const frequency = input.frequency as ScheduledTransaction["frequency"];

  if (!title) {
    return { ok: false, error: "Schedule title is required" };
  }
  if (!scheduleFrequencies.includes(frequency)) {
    return { ok: false, error: "Invalid schedule frequency" };
  }

  return {
    ok: true,
    value: {
      title,
      amount: baseValidation.value.amount,
      category: baseValidation.value.category,
      paymentMethod: baseValidation.value.paymentMethod,
      transactionType: baseValidation.value.transactionType,
      description: baseValidation.value.description,
      frequency,
      nextRunDate: baseValidation.value.date,
      active: input.active === undefined ? true : Boolean(input.active),
    },
  };
}

export function validateScheduledTransactionUpdates(
  input: Record<string, unknown>
): ValidationResult<Partial<ScheduledTransaction>> {
  const updates: Partial<ScheduledTransaction> = {};

  if (input.title !== undefined) {
    const title = cleanString(input.title).slice(0, 80);
    if (!title) {
      return { ok: false, error: "Schedule title is required" };
    }
    updates.title = title;
  }

  const expenseUpdateValidation = validateExpenseUpdates({
    amount: input.amount,
    category: input.category,
    paymentMethod: input.paymentMethod,
    transactionType: input.transactionType,
    description: input.description,
    date: input.nextRunDate,
  });

  if (expenseUpdateValidation.ok) {
    if (expenseUpdateValidation.value.amount !== undefined) {
      updates.amount = expenseUpdateValidation.value.amount;
    }
    if (expenseUpdateValidation.value.category !== undefined) {
      updates.category = expenseUpdateValidation.value.category;
    }
    if (expenseUpdateValidation.value.paymentMethod !== undefined) {
      updates.paymentMethod = expenseUpdateValidation.value.paymentMethod;
    }
    if (expenseUpdateValidation.value.transactionType !== undefined) {
      updates.transactionType = expenseUpdateValidation.value.transactionType;
    }
    if (expenseUpdateValidation.value.description !== undefined) {
      updates.description = expenseUpdateValidation.value.description;
    }
    if (expenseUpdateValidation.value.date !== undefined) {
      updates.nextRunDate = expenseUpdateValidation.value.date;
    }
  } else {
    const expenseKeys = [
      "amount",
      "category",
      "paymentMethod",
      "transactionType",
      "description",
      "nextRunDate",
    ];
    if (expenseKeys.some((key) => input[key] !== undefined)) {
      return expenseUpdateValidation;
    }
  }

  if (input.frequency !== undefined) {
    const frequency = input.frequency as ScheduledTransaction["frequency"];
    if (!scheduleFrequencies.includes(frequency)) {
      return { ok: false, error: "Invalid schedule frequency" };
    }
    updates.frequency = frequency;
  }

  if (input.active !== undefined) {
    updates.active = Boolean(input.active);
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "At least one schedule field is required" };
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

function cleanParticipantNames(input: unknown): ValidationResult<string[]> {
  if (!Array.isArray(input)) {
    return { ok: true, value: ["You"] };
  }

  const names = input
    .map((name) => cleanString(name).slice(0, 60))
    .filter(Boolean);
  const withSelf = ["You", ...names.filter((name) => name.toLowerCase() !== "you")];
  const uniqueNames = Array.from(
    new Map(withSelf.map((name) => [name.toLowerCase(), name])).values()
  );

  if (uniqueNames.length < 2) {
    return { ok: false, error: "Add at least one other person" };
  }
  if (uniqueNames.length > 20) {
    return { ok: false, error: "Events can include up to 20 people" };
  }

  return { ok: true, value: uniqueNames };
}

export function validateSplitEventInput(input: Record<string, unknown>) {
  const name = cleanString(input.name).slice(0, 80);
  const description = cleanString(input.description).slice(0, 240);
  const startDate = cleanOptionalDate(input.startDate);
  const endDate = cleanOptionalDate(input.endDate);
  const participants = cleanParticipantNames(input.participants);

  if (!name) {
    return { ok: false as const, error: "Event name is required" };
  }
  if (!participants.ok) {
    return participants;
  }
  if (input.startDate && !startDate) {
    return { ok: false as const, error: "Invalid start date" };
  }
  if (input.endDate && !endDate) {
    return { ok: false as const, error: "Invalid end date" };
  }
  if (startDate && endDate && endDate < startDate) {
    return { ok: false as const, error: "End date must be after start date" };
  }

  return {
    ok: true as const,
    value: { name, description, startDate, endDate, participants: participants.value },
  };
}

export function validateSplitEventUpdates(input: Record<string, unknown>) {
  const updates: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  } = {};

  if (input.name !== undefined) {
    const name = cleanString(input.name).slice(0, 80);
    if (!name) {
      return { ok: false as const, error: "Event name is required" };
    }
    updates.name = name;
  }
  if (input.description !== undefined) {
    updates.description = cleanString(input.description).slice(0, 240);
  }
  if (input.startDate !== undefined) {
    const startDate = cleanOptionalDate(input.startDate);
    if (input.startDate && !startDate) {
      return { ok: false as const, error: "Invalid start date" };
    }
    updates.startDate = startDate;
  }
  if (input.endDate !== undefined) {
    const endDate = cleanOptionalDate(input.endDate);
    if (input.endDate && !endDate) {
      return { ok: false as const, error: "Invalid end date" };
    }
    updates.endDate = endDate;
  }
  if (
    updates.startDate &&
    updates.endDate &&
    updates.endDate < updates.startDate
  ) {
    return { ok: false as const, error: "End date must be after start date" };
  }
  if (Object.keys(updates).length === 0) {
    return { ok: false as const, error: "At least one event field is required" };
  }

  return { ok: true as const, value: updates };
}

export function validateSplitExpenseInput(input: Record<string, unknown>) {
  const title = cleanString(input.title).slice(0, 80);
  const amount = parsePositiveAmount(input.amount);
  const payerParticipantId = cleanString(input.payerParticipantId);
  const category = cleanString(input.category).slice(0, 60);
  const note = cleanString(input.note).slice(0, 240);
  const date = cleanString(input.date);
  const splitMode = input.splitMode as SplitMode;
  const shareInputs = Array.isArray(input.shares) ? input.shares : [];

  if (!title) {
    return { ok: false as const, error: "Expense title is required" };
  }
  if (!amount.ok) {
    return amount;
  }
  if (!payerParticipantId) {
    return { ok: false as const, error: "Payer is required" };
  }
  if (!isValidDateString(date)) {
    return { ok: false as const, error: "Invalid expense date" };
  }
  if (splitMode !== "equal" && splitMode !== "custom") {
    return { ok: false as const, error: "Invalid split mode" };
  }

  const shares = shareInputs
    .map((share) => {
      if (!share || typeof share !== "object") return null;
      const record = share as Record<string, unknown>;
      const participantId = cleanString(record.participantId);
      const shareAmount =
        splitMode === "custom"
          ? parsePositiveAmount(record.amount, "Share amount")
          : { ok: true as const, value: 0 };
      if (!participantId || !shareAmount.ok) return null;
      return { participantId, amount: shareAmount.value };
    })
    .filter((share): share is { participantId: string; amount: number } =>
      Boolean(share)
    );

  const uniqueShares = Array.from(
    new Map(shares.map((share) => [share.participantId, share])).values()
  );
  if (uniqueShares.length === 0) {
    return { ok: false as const, error: "Choose at least one participant" };
  }

  if (splitMode === "custom") {
    const total = Math.round(
      uniqueShares.reduce((sum, share) => sum + share.amount, 0) * 100
    );
    if (total !== Math.round(amount.value * 100)) {
      return { ok: false as const, error: "Custom shares must equal the amount" };
    }
  }

  return {
    ok: true as const,
    value: {
      title,
      amount: amount.value,
      payerParticipantId,
      category,
      note,
      date,
      splitMode,
      shares: uniqueShares,
    },
  };
}

export function validateSplitSettlementInput(input: Record<string, unknown>) {
  const fromParticipantId = cleanString(input.fromParticipantId);
  const toParticipantId = cleanString(input.toParticipantId);
  const amount = parsePositiveAmount(input.amount);
  const note = cleanString(input.note).slice(0, 240);
  const date = cleanString(input.date);

  if (!fromParticipantId || !toParticipantId) {
    return { ok: false as const, error: "Both people are required" };
  }
  if (fromParticipantId === toParticipantId) {
    return { ok: false as const, error: "Choose two different people" };
  }
  if (!amount.ok) {
    return amount;
  }
  if (!isValidDateString(date)) {
    return { ok: false as const, error: "Invalid settlement date" };
  }

  return {
    ok: true as const,
    value: { fromParticipantId, toParticipantId, amount: amount.value, note, date },
  };
}
