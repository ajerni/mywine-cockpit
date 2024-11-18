import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';
import dotenv from 'dotenv';

// Explicitly load .env file
dotenv.config({ path: '.env' });

interface AuthUser {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  last_login: Date | null;
}

export async function POST(request: Request) {
  try {
    // Force reload environment variables
    dotenv.config({ path: '.env', override: true });
    
    const { email, password: hashedPassword } = await request.json();
    
    if (!email || !hashedPassword) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    try {
      const result = await query<AuthUser>(
        `SELECT * FROM wine_cockpit_auth 
         WHERE email = $1 
         AND password_hash = crypt($2, password_hash)`,
        [email, hashedPassword]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const now = Math.floor(Date.now() / 1000);
      const exp = now + (24 * 60 * 60);

      // Get JWT secret using dotenv explicitly
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not set in environment');
      }

      const secret = new TextEncoder().encode(jwtSecret);
      console.log('Creating token with secret from dotenv:', {
        secretLength: jwtSecret.length,
        timestamp: now,
        expiration: exp,
        fromDotEnv: true
      });
      
      const fastApiToken = await new SignJWT({ 
        sub: email,
        role: 'admin',
        exp: exp,
        iat: now
      })
        .setProtectedHeader({ 
          alg: 'HS256',
          typ: 'JWT'
        })
        .sign(secret);

      // Update last_login timestamp
      try {
        await query(
          'UPDATE wine_cockpit_auth SET last_login = NOW() WHERE email = $1',
          [email]
        );
      } catch (updateError) {
        console.error('Failed to update last_login:', updateError);
      }

      return NextResponse.json({ 
        success: true,
        token: fastApiToken
      });

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw new Error(dbError instanceof Error ? dbError.message : 'Database operation failed');
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 