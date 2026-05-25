import { NextRequest, NextResponse } from 'next/server';
import { initDB, createUser, getUserByEmail } from '@/lib/database';
import { hashPassword, generateToken, normalizeSecurityAnswer } from '@/lib/auth';
import { validateSignupInput } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const body = await request.json();
    const validation = validateSignupInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, name, password, securityQuestion, securityAnswer } = validation.value;

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const hashedSecurityAnswer = await hashPassword(normalizeSecurityAnswer(securityAnswer));
    const userId = await createUser(email, name, hashedPassword, securityQuestion, hashedSecurityAnswer);

    // Generate token
    const token = generateToken({ id: userId as number, email, name });

    // Set cookie
    const response = NextResponse.json(
      { message: 'User created successfully', user: { id: userId, email, name } },
      { status: 201 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
