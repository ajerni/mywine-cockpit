import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Paths that require authentication
const protectedPaths = ['/dashboard'];

// Add allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://mywine-cockpit.vercel.app',
  'https://mywine-cockpit-git-sums-ajernis-projects.vercel.app',
  'http://cockpit.mywine.info',
];

export async function middleware(request: NextRequest) {
  // CORS check
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }

  // Check if the requested path requires authentication
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token');

  if (!token) {
    return redirectToLogin(request);
  }

  try {
    // Verify the JWT token
    await jwtVerify(
      token.value,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    
    return NextResponse.next();
  } catch (error) {
    // Token is invalid or expired
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (all API endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public/*)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 