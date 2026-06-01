import { NextRequest, NextResponse } from 'next/server';
import {
  createScheduledTransaction,
  deleteScheduledTransaction,
  getUserScheduledTransactions,
  initDB,
  updateScheduledTransaction,
} from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';
import {
  validateId,
  validateScheduledTransactionInput,
  validateScheduledTransactionUpdates,
} from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduledTransactions = await getUserScheduledTransactions(user.id);
    return NextResponse.json({ scheduledTransactions });
  } catch (error) {
    console.error('Get scheduled transactions error:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const input = await request.json();
    const validation = validateScheduledTransactionInput(input);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const scheduledTransaction = await createScheduledTransaction(user.id, {
      id: uuidv4(),
      ...validation.value,
    });

    return NextResponse.json({ scheduledTransaction }, { status: 201 });
  } catch (error) {
    console.error('Create scheduled transaction error:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...updates } = await request.json();
    const idValidation = validateId(id, 'Schedule ID');
    if (!idValidation.ok) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    const updateValidation = validateScheduledTransactionUpdates(updates);
    if (!updateValidation.ok) {
      return NextResponse.json(
        { error: updateValidation.error },
        { status: 400 }
      );
    }

    const scheduledTransaction = await updateScheduledTransaction(
      user.id,
      idValidation.value,
      updateValidation.value
    );
    if (!scheduledTransaction) {
      return NextResponse.json(
        { error: 'Scheduled transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ scheduledTransaction });
  } catch (error) {
    console.error('Update scheduled transaction error:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const idValidation = validateId(id, 'Schedule ID');
    if (!idValidation.ok) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    await deleteScheduledTransaction(user.id, idValidation.value);
    return NextResponse.json({ message: 'Scheduled transaction deleted successfully' });
  } catch (error) {
    console.error('Delete scheduled transaction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
