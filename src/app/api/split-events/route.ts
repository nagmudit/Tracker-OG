import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  createSplitEvent,
  deleteSplitEvent,
  getUserSplitEvents,
  initDB,
  updateSplitEvent,
} from '@/lib/database';
import {
  validateId,
  validateSplitEventInput,
  validateSplitEventUpdates,
} from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await getUserSplitEvents(user.id);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Get split events error:', error);
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
    const validation = validateSplitEventInput(input);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const event = await createSplitEvent(user.id, {
      id: uuidv4(),
      ...validation.value,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Create split event error:', error);
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
    const idValidation = validateId(id, 'Event ID');
    if (!idValidation.ok) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    const updateValidation = validateSplitEventUpdates(updates);
    if (!updateValidation.ok) {
      return NextResponse.json(
        { error: updateValidation.error },
        { status: 400 }
      );
    }

    const event = await updateSplitEvent(
      user.id,
      idValidation.value,
      updateValidation.value
    );
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Update split event error:', error);
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
    const idValidation = validateId(searchParams.get('id'), 'Event ID');
    if (!idValidation.ok) {
      return NextResponse.json({ error: idValidation.error }, { status: 400 });
    }

    await deleteSplitEvent(user.id, idValidation.value);
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete split event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
