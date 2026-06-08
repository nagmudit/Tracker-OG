import { NextRequest, NextResponse } from "next/server";
import { createExpenses, initDB } from "@/lib/database";
import { getUserFromRequest } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { validateExpenseInput } from "@/lib/validation";
import { Expense } from "@/types/expense";

const MAX_BULK_EXPENSES = 500;

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { expenses } = await request.json();
    if (!Array.isArray(expenses)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected an array of expenses." },
        { status: 400 }
      );
    }

    if (expenses.length > MAX_BULK_EXPENSES) {
      return NextResponse.json(
        { error: `Import up to ${MAX_BULK_EXPENSES} transactions at a time.` },
        { status: 413 }
      );
    }

    const validExpensesToInsert: Omit<Expense, 'createdAt'>[] = [];
    const validExpensesToReturn: Expense[] = [];

    const now = new Date().toISOString();

    for (const exp of expenses) {
      const validation = validateExpenseInput(exp);

      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const id = uuidv4();
      const value = validation.value;
      
      const newExpense = {
        id,
        ...value,
      };

      validExpensesToInsert.push(newExpense);
      validExpensesToReturn.push({ ...newExpense, createdAt: now } as Expense);
    }

    if (validExpensesToInsert.length === 0) {
       return NextResponse.json({ expenses: [] }, { status: 200 });
    }

    await createExpenses(user.id, validExpensesToInsert);

    return NextResponse.json({ expenses: validExpensesToReturn }, { status: 201 });
  } catch (error) {
    console.error("Failed to add expenses in bulk:", error);
    return NextResponse.json(
      { error: "Failed to add expenses" },
      { status: 500 }
    );
  }
}
