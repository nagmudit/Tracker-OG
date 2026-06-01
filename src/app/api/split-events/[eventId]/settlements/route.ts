import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  createSplitSettlement,
  deleteSplitSettlement,
  initDB,
  updateSplitSettlement,
} from '@/lib/database';
import { validateId, validateSplitSettlementInput } from '@/lib/validation';
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
    const validation = validateSplitSettlementInput(input);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const event = await createSplitSettlement(user.id, eventIdValidation.value, {
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
    console.error('Create split settlement error:', error);
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
    const settlementIdValidation = validateId(id, 'Settlement ID');
    if (!settlementIdValidation.ok) {
      return NextResponse.json(
        { error: settlementIdValidation.error },
        { status: 400 }
      );
    }

    const validation = validateSplitSettlementInput(input);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const event = await updateSplitSettlement(
      user.id,
      eventIdValidation.value,
      settlementIdValidation.value,
      validation.value
    );
    if (!event) {
      return NextResponse.json(
        { error: 'Settlement or participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Update split settlement error:', error);
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
    const settlementIdValidation = validateId(
      searchParams.get('id'),
      'Settlement ID'
    );

    if (!eventIdValidation.ok) {
      return NextResponse.json(
        { error: eventIdValidation.error },
        { status: 400 }
      );
    }
    if (!settlementIdValidation.ok) {
      return NextResponse.json(
        { error: settlementIdValidation.error },
        { status: 400 }
      );
    }

    const event = await deleteSplitSettlement(
      user.id,
      eventIdValidation.value,
      settlementIdValidation.value
    );
    if (!event) {
      return NextResponse.json(
        { error: 'Settlement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Delete split settlement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
