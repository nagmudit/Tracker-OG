import { NextResponse } from 'next/server';
import { initDB, openDB } from '@/lib/database';

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await initDB();
    const db = await openDB();
    const tableInfo = await db.all(
      `SELECT column_name AS name, data_type AS type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'
       ORDER BY ordinal_position`
    );
    await db.close();
    
    return NextResponse.json({ 
      message: 'Database structure check',
      columns: tableInfo.map(col => ({ name: col.name, type: col.type }))
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { error: 'Database check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
