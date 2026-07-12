import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-email", "/embed"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = publicRoutes.some((route) => pathname === route);

  const authCookie = request.cookies.get("presstech-auth");
  let isAuthenticated = false;

  if (authCookie?.value) {
    try {
      const parsed = JSON.parse(authCookie.value);
      isAuthenticated = parsed?.state?.isAuthenticated === true;
    } catch {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|mockServiceWorker.js|widget.js|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js)$).*)",
  ],
};
