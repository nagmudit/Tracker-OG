import { NextRequest, NextResponse } from 'next/server';
import { getUserSecurityQuestion, initDB } from '@/lib/database';
import { validateEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const { email } = await request.json();

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'A valid email is required' },
        { status: 400 }
      );
    }

    const securityQuestion = await getUserSecurityQuestion(email.toLowerCase());
    
    if (!securityQuestion) {
      return NextResponse.json(
        {
          message: 'If this account exists, reset instructions are available.',
          securityQuestion: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      securityQuestion,
    });
  } catch (error) {
    console.error('Get security question error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
