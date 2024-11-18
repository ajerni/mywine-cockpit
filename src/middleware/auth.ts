import { NextResponse, NextRequest } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://cockpit.mywine.info',
  'https://mywine-cockpit.vercel.app'
];

// Helper function to check if origin is allowed
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

// Add CORS headers helper
function addCorsHeaders(headers: Headers, requestOrigin: string | null) {
  const origin = (isAllowedOrigin(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]) ?? ALLOWED_ORIGINS[0];
  
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return headers;
}

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export function authMiddleware(handler: RouteHandler) {
  return async (request: NextRequest) => {
    try {
      const origin = request.headers.get('origin');

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return NextResponse.json({}, { 
          headers: addCorsHeaders(new Headers(), origin)
        });
      }

      // Get token from Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Invalid authorization header' },
          { 
            status: 401,
            headers: addCorsHeaders(new Headers(), origin)
          }
        );
      }

      // Pass the request through with the original Authorization header
      const response = await handler(request);
      const headers = addCorsHeaders(new Headers(response.headers), origin);

      return new NextResponse(response.body, {
        status: response.status,
        headers
      });

    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { 
          status: 401,
          headers: addCorsHeaders(new Headers(), request.headers.get('origin'))
        }
      );
    }
  };
} 