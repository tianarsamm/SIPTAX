import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Protected routes yang require authentication
  const protectedRoutes = ['/admin', '/dashboard']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Note: User check via localStorage happens on client-side (in pages)
  // This middleware level check is minimal since we use client-side auth state
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}