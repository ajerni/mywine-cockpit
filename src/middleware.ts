import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://cockpit.mywine.info',
  'https://mywine-cockpit.vercel.app',
  'https://mywine-cockpit-git-images-ajernis-projects.vercel.app',
  'http://localhost:3000',
  '.vercel.app'
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Allow internal API calls (no origin header)
  if (!origin) {
    return NextResponse.next();
  }
  
  // Only allow specified origins
  if (!ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || (allowed.startsWith('.') && origin.endsWith(allowed))
  )) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      headers: {
        'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  // Continue with the request
  const response = NextResponse.next();
  
  // Add CORS headers to all responses
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
}; 