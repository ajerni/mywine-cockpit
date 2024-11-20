import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';
import dotenv from 'dotenv';

// Explicitly load .env file
dotenv.config({ path: '.env' });

const ALLOWED_ORIGINS = [
  'https://cockpit.mywine.info',
  'https://mywine-cockpit.vercel.app',
  'https://mywine-cockpit-git-images-ajernis-projects.vercel.app',
  'http://localhost:3000'
];

function addCorsHeaders(headers: Headers, requestOrigin: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0];
  
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return headers;
}

interface AuthUser {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  last_login: Date | null;
}

export async function OPTIONS() {
  const headers = addCorsHeaders(new Headers(), null);
  return new NextResponse(null, { headers });
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    
    // Force reload environment variables
    dotenv.config({ path: '.env', override: true });
    
    const { email, password: hashedPassword } = await request.json();
    
    if (!email || !hashedPassword) {
      return new NextResponse(
        JSON.stringify({ error: 'Email and password are required' }),
        { 
          status: 400,
          headers: addCorsHeaders(new Headers(), origin)
        }
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
        return new NextResponse(
          JSON.stringify({ error: 'Invalid credentials' }),
          { 
            status: 401,
            headers: addCorsHeaders(new Headers(), origin)
          }
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

      const headers = addCorsHeaders(new Headers(), origin);
      headers.set('Content-Type', 'application/json');

      return new NextResponse(
        JSON.stringify({ 
          success: true,
          token: fastApiToken
        }),
        { headers }
      );

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return new NextResponse(
        JSON.stringify({ error: dbError instanceof Error ? dbError.message : 'Database operation failed' }),
        { 
          status: 500,
          headers: addCorsHeaders(new Headers(), origin)
        }
      );
    }

  } catch (error) {
    console.error('Login error:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: addCorsHeaders(new Headers(), request.headers.get('origin'))
      }
    );
  }
} 