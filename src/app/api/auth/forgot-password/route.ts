import { NextRequest, NextResponse } from 'next/server';
import { getUserSecurityQuestion } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const securityQuestion = await getUserSecurityQuestion(email);
    
    if (!securityQuestion) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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
