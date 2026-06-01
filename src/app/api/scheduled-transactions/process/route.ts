import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { initDB, processDueScheduledTransactions } from '@/lib/database';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

function today() {
  return new Date().toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const runDate =
      typeof body.today === 'string' && isoDateRegex.test(body.today)
        ? body.today
        : today();

    const result = await processDueScheduledTransactions(user.id, runDate);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Process scheduled transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
