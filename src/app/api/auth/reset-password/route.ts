import { NextRequest, NextResponse } from 'next/server';
import { verifySecurityAnswer, updateUserPassword } from '@/lib/database';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, securityAnswer, newPassword } = await request.json();

    if (!email || !securityAnswer || !newPassword) {
      return NextResponse.json(
        { error: 'Email, security answer, and new password are required' },
        { status: 400 }
      );
    }

    const userId = await verifySecurityAnswer(email, securityAnswer);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid security answer' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the password
    await updateUserPassword(userId, hashedPassword);

    return NextResponse.json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
