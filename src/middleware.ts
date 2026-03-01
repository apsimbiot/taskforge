import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Main domain for multi-tenancy (configure for your environment)
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "taskforge.dev";

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const hostname = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const host = hostname.split(":")[0];

  // Determine if this is a tenant subdomain
  let subdomain: string | null = null;
  let isMainApp = true;

  if (host.endsWith(`.${MAIN_DOMAIN}`) && host !== `app.${MAIN_DOMAIN}` && host !== MAIN_DOMAIN) {
    subdomain = host.replace(`.${MAIN_DOMAIN}`, "");
    isMainApp = false;
  }

  // Public paths that don't require auth
  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/ai/generate-tasks");

  // Handle subdomain tenants
  if (!isMainApp && subdomain) {
    // Tenant-specific routes - require auth
    if (!req.auth && !isPublicPath) {
      // API routes should return 401 JSON, not redirect
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Set tenant headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-tenant-subdomain", subdomain);
    response.headers.set("x-is-main-app", "false");
    return response;
  }

  // Main app paths
  if (!req.auth && !isPublicPath) {
    // API routes should return 401 JSON, not redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", origin);
    return NextResponse.redirect(loginUrl);
  }

  // Continue with main app
  const response = NextResponse.next();
  response.headers.set("x-is-main-app", "true");
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
