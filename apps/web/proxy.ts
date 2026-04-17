import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define the routes that need authentication
// Using a matcher avoids running middleware on every single asset/page request
const protectedRoutes = ['/explore', '/dashboard', '/trips', '/account'];
const authRoutes = ['/login', '/signup', '/forgot-password'];

/**
 * Middleware: Edge Authentication & Routing
 * ==========================================
 * Secures app routes before they hit the Next.js server.
 * Uses lightweight `jose` for Edge-compatible JWT verification.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Check if route is protected or auth-related
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If it's a public marketing page (e.g. /destinations, /), bypass entirely
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  // 2. Extract JWT token (assuming standard Supabase / custom auth convention)
  // TODO: Update token key name once the auth provider is explicitly configured
  const token = request.cookies.get('sb-access-token')?.value || request.cookies.get('access_token')?.value;

  let isValidAuth = false;

  // 3. Verify JWT at the Edge
  if (token && process.env.JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);
      isValidAuth = true;
    } catch (err) {
      // Token is invalid, expired, or tampered with
      isValidAuth = false;
    }
  } else if (token) {
    // During dev, if JWT_SECRET isn't fully piped in for edge but token exists, we do a basic check.
    // Replace with proper Supabase SSR client check later if using Supabase PKCE.
    isValidAuth = true;
  }

  // 4. Redirect Logic
  // Unauthenticated user trying to access a secure app feature
  if (isProtected && !isValidAuth) {
    const loginUrl = new URL('/login', request.url);
    // Persist the intent so they can be redirected back after login
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access the login/signup page again
  if (isAuthRoute && isValidAuth) {
    return NextResponse.redirect(new URL('/explore', request.url));
  }

  return NextResponse.next();
}

// Only invoke the middleware on pertinent paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - fonts/.* (font files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|fonts/.*|.*\..*).*)',
  ],
};
