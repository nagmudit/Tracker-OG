import { NextResponse } from 'next/server';
import { initDB, openDB } from '@/lib/database';

export async function GET() {
  try {
    await initDB();
    const db = await openDB();
    const tableInfo = await db.all('PRAGMA table_info(users)');
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
