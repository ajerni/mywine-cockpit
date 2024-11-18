import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://mywine-cockpit-git-sql-ajernis-projects.vercel.app',
  'https://cockpit.mywine.info'
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Only allow specified origins
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
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