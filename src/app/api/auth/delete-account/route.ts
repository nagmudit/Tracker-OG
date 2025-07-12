import { NextRequest, NextResponse } from 'next/server';
import { initDB, deleteUser } from '@/lib/database';
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

    // Delete user and all associated data
    await deleteUser(userId);

    // Clear auth cookie
    const response = NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
