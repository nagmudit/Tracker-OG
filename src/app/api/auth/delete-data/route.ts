import { NextRequest, NextResponse } from 'next/server';
import { initDB, deleteUserData } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    await initDB();
    
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get user ID
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.id;

    // Delete user data but keep the account
    await deleteUserData(userId);

    return NextResponse.json(
      { message: 'Data deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
