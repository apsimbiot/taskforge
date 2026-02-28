import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the current tenant from request
 * Looks for subdomain in hostname (e.g., acme.taskforge.dev)
 */
export async function getTenantFromRequest(
  hostname: string,
  domain: string = "taskforge.dev"
): Promise<{ workspace: typeof workspaces.$inferSelect | null; isMainApp: boolean }> {
  // Remove port if present
  const host = hostname.split(":")[0];

  // Check if it's a subdomain
  if (host.endsWith(`.${domain}`) && host !== `app.${domain}` && host !== domain) {
    const subdomain = host.replace(`.${domain}`, "");

    // Look up workspace by subdomain
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.subdomain, subdomain),
    });

    if (workspace && workspace.status === "active") {
      return { workspace, isMainApp: false };
    }
  }

  // Main app (app.taskforge.dev or localhost)
  return { workspace: null, isMainApp: true };
}

/**
 * Get tenant by subdomain
 */
export async function getTenantBySubdomain(subdomain: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.subdomain, subdomain),
  });
}

/**
 * Get tenant by workspace ID
 */
export async function getTenantById(workspaceId: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
}

/**
 * Check if subdomain is available
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  // Check database
  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.subdomain, subdomain),
  });

  if (existing) return false;

  // Reserved subdomains
  const reserved = ["app", "www", "admin", "api", "auth", "dashboard", "mail"];
  if (reserved.includes(subdomain.toLowerCase())) return false;

  // Valid subdomain format
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(subdomain)) return false;

  return true;
}
