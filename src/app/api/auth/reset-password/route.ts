import { NextRequest, NextResponse } from 'next/server';
import { initDB, verifySecurityAnswer, updateUserPassword } from '@/lib/database';
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const { email, securityAnswer, newPassword } = await request.json();

    if (!email || !securityAnswer || !newPassword) {
      return NextResponse.json(
        { error: 'Email, security answer, and new password are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    const userId = await verifySecurityAnswer(email.toLowerCase(), securityAnswer);
    
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
