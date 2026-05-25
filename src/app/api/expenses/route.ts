import { NextRequest, NextResponse } from 'next/server';
import { initDB, getUserExpenses, createExpense, deleteExpense, updateExpense } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';
import { validateExpenseInput, validateExpenseUpdates, validateId } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const expenses = await getUserExpenses(user.id);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const expenseData = await request.json();
    const validation = validateExpenseInput(expenseData);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const expense = {
      id: uuidv4(),
      ...validation.value,
      createdAt: new Date().toISOString(),
    };

    await createExpense(user.id, expense);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, ...updates } = await request.json();
    const idValidation = validateId(id, 'Expense ID');
    if (!idValidation.ok) {
      return NextResponse.json(
        { error: idValidation.error },
        { status: 400 }
      );
    }

    const updateValidation = validateExpenseUpdates(updates);
    if (!updateValidation.ok) {
      return NextResponse.json(
        { error: updateValidation.error },
        { status: 400 }
      );
    }

    const expense = await updateExpense(user.id, idValidation.value, updateValidation.value);
    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const idValidation = validateId(id, 'Expense ID');
    if (!idValidation.ok) {
      return NextResponse.json(
        { error: idValidation.error },
        { status: 400 }
      );
    }

    await deleteExpense(user.id, idValidation.value);
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
