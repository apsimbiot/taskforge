import { auth } from "@/auth";
import { getTenantFromRequest } from "@/lib/tenant";

// Main domain for multi-tenancy (configure for your environment)
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "taskforge.dev";

export default auth(async (req) => {
  const { pathname, origin } = req.nextUrl;
  const hostname = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";

  // Get tenant info from subdomain
  const { workspace: tenant, isMainApp } = await getTenantFromRequest(hostname, MAIN_DOMAIN);

  // Attach tenant info to request headers for API routes
  const requestHeaders = new Headers(req.headers);
  if (tenant) {
    requestHeaders.set("x-tenant-id", tenant.id);
    requestHeaders.set("x-tenant-subdomain", tenant.subdomain || "");
  }
  requestHeaders.set("x-is-main-app", isMainApp.toString());

  // Public paths that don't require auth
  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/ai/generate-tasks") ||
    pathname.startsWith("/api/forms/") && pathname.endsWith("/public"); // Public form submissions

  // Handle subdomain tenants
  if (!isMainApp) {
    // Tenant-specific routes - require auth
    if (!req.auth) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("redirect", pathname);
      return Response.redirect(loginUrl);
    }

    // Check if workspace is suspended
    if (tenant?.status === "suspended") {
      return new Response("Workspace suspended", { status: 403 });
    }

    // Add tenant header and continue
    return Response.next({
      request: { headers: requestHeaders },
    });
  }

  // Main app paths
  if (!req.auth && !isPublicPath) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("redirect", pathname);
    return Response.redirect(loginUrl);
  }

  return Response.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
