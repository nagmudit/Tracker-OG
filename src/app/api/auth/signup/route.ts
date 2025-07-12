import { NextRequest, NextResponse } from 'next/server';
import { initDB, createUser, getUserByEmail } from '@/lib/database';
import { hashPassword, generateToken, validateEmail, validatePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const { email, name, password, securityQuestion, securityAnswer } = await request.json();

    // Validate input
    if (!email || !name || !password || !securityQuestion || !securityAnswer) {
      return NextResponse.json(
        { error: 'Email, name, password, security question, and security answer are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

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
    const userId = await createUser(email, name, hashedPassword, securityQuestion, securityAnswer);

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
