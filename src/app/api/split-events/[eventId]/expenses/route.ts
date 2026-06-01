import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  createSplitExpense,
  deleteSplitExpense,
  initDB,
  updateSplitExpense,
} from '@/lib/database';
import { validateId, validateSplitExpenseInput } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await initDB();
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await context.params;
    const eventIdValidation = validateId(eventId, 'Event ID');
    if (!eventIdValidation.ok) {
      return NextResponse.json(
        { error: eventIdValidation.error },
        { status: 400 }
      );
    }

    const input = await request.json();
    const validation = validateSplitExpenseInput(input);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const event = await createSplitExpense(user.id, eventIdValidation.value, {
      id: uuidv4(),
      ...validation.value,
    });
    if (!event) {
      return NextResponse.json(
        { error: 'Event or participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Create split expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await initDB();
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await context.params;
    const eventIdValidation = validateId(eventId, 'Event ID');
    if (!eventIdValidation.ok) {
      return NextResponse.json(
        { error: eventIdValidation.error },
        { status: 400 }
      );
    }

    const { id, ...input } = await request.json();
    const expenseIdValidation = validateId(id, 'Expense ID');
    if (!expenseIdValidation.ok) {
      return NextResponse.json(
        { error: expenseIdValidation.error },
        { status: 400 }
      );
    }

    const validation = validateSplitExpenseInput(input);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const event = await updateSplitExpense(
      user.id,
      eventIdValidation.value,
      expenseIdValidation.value,
      validation.value
    );
    if (!event) {
      return NextResponse.json(
        { error: 'Expense or participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Update split expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await initDB();
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await context.params;
    const eventIdValidation = validateId(eventId, 'Event ID');
    const { searchParams } = new URL(request.url);
    const expenseIdValidation = validateId(searchParams.get('id'), 'Expense ID');

    if (!eventIdValidation.ok) {
      return NextResponse.json(
        { error: eventIdValidation.error },
        { status: 400 }
      );
    }
    if (!expenseIdValidation.ok) {
      return NextResponse.json(
        { error: expenseIdValidation.error },
        { status: 400 }
      );
    }

    const event = await deleteSplitExpense(
      user.id,
      eventIdValidation.value,
      expenseIdValidation.value
    );
    if (!event) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Delete split expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
