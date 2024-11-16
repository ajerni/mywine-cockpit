import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';

interface AuthUser {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  last_login: Date | null;
}

export async function POST(request: Request) {
  try {
    console.log('1. Starting login process...');
    
    const { email, password: hashedPassword } = await request.json();
    
    if (!email || !hashedPassword) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query using pgcrypto's crypt function for bcrypt comparison
    console.log('3. Querying database...');
    try {
      const result = await query<AuthUser>(
        `SELECT * FROM wine_cockpit_auth 
         WHERE email = $1 
         AND password_hash = crypt($2, password_hash)`,
        [email, hashedPassword]
      );

      console.log('4. Query completed, matching users found:', result.rows.length);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Create JWT token
      console.log('5. Creating JWT token...');
      const token = await new SignJWT({ email: result.rows[0].email })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));

      const response = NextResponse.json({ success: true });
      
      // Set cookie
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 hours
      });

      // Update last_login timestamp
      try {
        await query(
          'UPDATE wine_cockpit_auth SET last_login = NOW() WHERE email = $1',
          [email]
        );
      } catch (updateError) {
        console.error('Failed to update last_login:', updateError);
        // Don't fail the login if this update fails
      }

      console.log('6. Login successful');
      return response;

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw new Error(dbError instanceof Error ? dbError.message : 'Database operation failed');
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
} 