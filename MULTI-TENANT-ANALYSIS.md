# TaskForge Multi-Tenant Analysis Report

> Generated: 2026-02-28  
> Status: SECURITY-CRITICAL FINDINGS  
> Recommendation: IMPLEMENT SUBDOMAIN MULTI-TENANCY

---

## Executive Summary

TaskForge has a **workspace-based isolation model** but is **NOT truly multi-tenant**. The current architecture uses path-based workspace scoping (`/dashboard/workspaces/[id]/`) rather than subdomain-based tenant isolation. This creates significant security gaps and prevents true multi-client isolation.

---

## 1. Current State

### ✅ What Works

| Component | Status | Notes |
|-----------|--------|-------|
| **Database Schema** | ✅ Good | Has `workspaces`, `workspaceMembers`, `spaces`, `tasks`, etc. |
| **Workspace Membership** | ✅ Good | Proper many-to-many relationship between users and workspaces |
| **Role-Based Access** | ✅ Good | Owner, admin, member, viewer roles implemented |
| **API Authorization** | ✅ Mostly Good | Most endpoints check workspace membership |
| **Frontend Routing** | ✅ Good | Path-based workspace scoping at `/dashboard/workspaces/[id]/` |
| **Auth Setup** | ✅ Basic | NextAuth with JWT sessions |

### ❌ What's Broken / Missing

| Component | Status | Issue |
|-----------|--------|-------|
| **Subdomain Routing** | ❌ Missing | No middleware for subdomain → tenant resolution |
| **Search API** | ❌ VULNERABLE | No authentication - anyone can search all data |
| **Forms DELETE** | ❌ VULNERABLE | No authentication - anyone can delete forms |
| **Multi-Tenant DB Isolation** | ❌ Missing | No Row-Level Security (RLS) at PostgreSQL level |
| **Tenant Metadata** | ❌ Missing | No `subdomain`, `plan`, `status` on workspaces |
| **Onboarding Flow** | ❌ Missing | Registration creates user, no org creation |
| **Session Tenant Context** | ❌ Missing | Auth session doesn't include current workspace |
| **Cross-Subdomain Auth** | ❌ Not Configured | Cookie domain not set for subdomain sharing |

---

## 2. Security Gaps

### 🔴 CRITICAL: Unauthenticated Endpoints

| Endpoint | File | Issue |
|----------|------|-------|
| `GET /api/search` | `src/app/api/search/route.ts` | **NO AUTH** - Anyone can search ALL tasks and documents across ALL workspaces |
| `DELETE /api/forms/[slug]` | `src/app/api/forms/[slug]/route.ts` | **NO AUTH** - Anyone can delete ANY form by slug or ID |
| `GET /api/forms/[slug]` | `src/app/api/forms/[slug]/route.ts` | Returns form metadata even if not public (info leak) |
| `POST /api/notifications` | `src/app/api/notifications/route.ts` | Allows creating notifications for ANY user (abuse vector) |

### 🟠 HIGH: Missing Workspace Isolation

| Endpoint Category | Issue |
|-------------------|-------|
| **Tasks via direct ID** | Task endpoints check membership via `checkTaskAccess()` - GOOD |
| **Lists** | Check membership via space - GOOD |
| **Spaces** | Check membership via workspace - GOOD |
| **Documents** | Check membership via workspace - GOOD |
| **Workspace CRUD** | Check membership - GOOD |

### 🔵 MEDIUM: Architectural Gaps

1. **No Row-Level Security (RLS)** - Database-level tenant isolation is missing
2. **API-level checks are sole defense** - If any endpoint forgets a check, data leaks
3. **Slug uniqueness is global** - Workspaces compete for slugs across entire system (should be per-tenant)

---

## 3. Architecture Plan: Subdomain-Based Multi-Tenancy

### Target Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           DNS (Wildcard)                │
                    │   *.taskforge.dev → Load Balancer       │
                    └─────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │        Next.js Middleware               │
                    │  1. Extract subdomain                   │
                    │  2. Resolve to tenant/workspace         │
                    │  3. Set tenant context                  │
                    │  4. Redirect or allow                   │
                    └─────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │  app.taskforge │   │ acme.taskforge │   │  beta.taskforge │
    │    (main app)  │   │   (tenant A)   │   │   (tenant B)   │
    │   - Login      │   │   - Workspace  │   │   - Workspace  │
    │   - Register   │   │   - All data   │   │   - All data   │
    │   - Dashboard  │   │     scoped     │   │     scoped     │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Middleware Flow

```
Request: https://acme.taskforge.dev/dashboard

┌──────────────────────────────────────────────────────────────┐
│                    Middleware.ts                             │
├──────────────────────────────────────────────────────────────┤
│ 1. Extract hostname: "acme.taskforge.dev"                   │
│ 2. Extract subdomain: "acme"                                 │
│ 3. If subdomain === "app" or "www" or empty:               │
│    → Continue to main app routes                             │
│ 4. Else:                                                     │
│    → Lookup workspace where slug = "acme"                   │
│    → If not found: Show "Create your workspace" or 404      │
│    → If found: Check user membership                         │
│    → Set headers: x-tenant-id, x-workspace-id               │
│    → Allow request                                           │
└──────────────────────────────────────────────────────────────┘
```

### URL Structure Changes

| Current (Path-Based) | Target (Subdomain-Based) |
|----------------------|--------------------------|
| `taskforge.dev/dashboard/workspaces/[id]/spaces/[spaceId]` | `acme.taskforge.dev/` (root shows workspace) |
| `taskforge.dev/dashboard/workspaces/[id]/members` | `acme.taskforge.dev/members` |
| `taskforge.dev/login` | `app.taskforge.dev/login` |

---

## 4. Schema Changes Required

### 4.1 Add Subdomain to Workspaces

```typescript
// src/db/schema/index.ts - Add to workspaces table

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(), // Keep for URLs
  
  // NEW: Subdomain for multi-tenancy
  subdomain: varchar("subdomain", { length: 63 }).unique(), // RFC 1123 (max 63 chars)
  customDomain: varchar("custom_domain", { length: 255 }).unique(), // For custom domains
  
  // NEW: Tenant metadata
  plan: varchar("plan", { length: 20 }).default("free"), // free, pro, enterprise
  status: varchar("status", { length: 20 }).default("active"), // active, suspended, trial
  trialEndsAt: timestamp("trial_ends_at"),
  
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url"),
  
  // NEW: Branding (allow white-labeling)
  primaryColor: varchar("primary_color", { length: 7 }).default("#6366f1"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 4.2 Optional: Dedicated Tenants Table

If you want stricter separation between "organization" and "workspace":

```typescript
// Optional: Separate tenants table
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  subdomain: varchar("subdomain", { length: 63 }).unique(),
  customDomain: varchar("custom_domain", { length: 255 }).unique(),
  plan: varchar("plan", { length: 20 }).default("free"),
  status: varchar("status", { length: 20 }).default("active"),
  
  // Single owner per tenant
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
    
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenants have many workspaces
export const workspaces = pgTable("workspaces", {
  // ... existing fields ...
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" }),
});
```

**Recommendation:** For now, use workspaces as tenants. Add `subdomain`, `plan`, `status` fields. Only add a separate `tenants` table if you need multiple workspaces per organization.

### 4.3 Row-Level Security (RLS) - PostgreSQL

Enable RLS as additional defense layer:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policy that filters by workspace membership
CREATE POLICY "Tenant isolation" ON tasks
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN lists l ON l.id = tasks.list_id
      JOIN spaces s ON s.id = l.space_id
      WHERE wm.workspace_id = s.workspace_id
      AND wm.user_id = current_user_id()
    )
  );
```

---

## 5. Implementation Roadmap

### Phase 1: Critical Security Fixes (Week 1)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 1.1 | Add auth to `GET /api/search` | 1hr | 🔴 CRITICAL |
| 1.2 | Add auth to `DELETE /api/forms/[slug]` | 1hr | 🔴 CRITICAL |
| 1.3 | Add workspace filter to search results | 2hr | 🔴 CRITICAL |
| 1.4 | Validate notification target user | 1hr | 🟠 HIGH |

### Phase 2: Subdomain Infrastructure (Week 2)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 2.1 | Add `subdomain`, `plan`, `status` to workspaces schema | 2hr | 🔴 CRITICAL |
| 2.2 | Create migration for new fields | 1hr | 🔴 CRITICAL |
| 2.3 | Update middleware.ts for subdomain detection | 4hr | 🔴 CRITICAL |
| 2.4 | Add tenant resolution utility | 2hr | 🔴 CRITICAL |
| 2.5 | Configure NextAuth for subdomain cookies | 2hr | 🔴 CRITICAL |

### Phase 3: Registration/Onboarding Flow (Week 2-3)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 3.1 | Create signup → create organization flow | 4hr | 🟠 HIGH |
| 3.2 | Auto-create default workspace on signup | 2hr | 🟠 HIGH |
| 3.3 | Subdomain availability checker | 2hr | 🟠 HIGH |
| 3.4 | Update registration UI with org name + subdomain | 4hr | 🟠 HIGH |

### Phase 4: Frontend Routing Changes (Week 3)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 4.1 | Update workspace switcher to show subdomain | 2hr | 🟡 MEDIUM |
| 4.2 | Add middleware-aware routing | 4hr | 🟡 MEDIUM |
| 4.3 | Handle "main app" vs "tenant app" views | 3hr | 🟡 MEDIUM |
| 4.4 | Update sidebar for subdomain context | 2hr | 🟡 MEDIUM |

### Phase 5: Advanced Multi-Tenancy (Week 4+)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 5.1 | Implement PostgreSQL RLS policies | 4hr | 🟡 MEDIUM |
| 5.2 | Custom domain support | 6hr | 🔵 LOW |
| 5.3 | Plan/billing integration | 8hr | 🔵 LOW |
| 5.4 | Tenant usage analytics | 4hr | 🔵 LOW |

---

## 6. Code Examples

### 6.1 Updated Middleware (Subdomain Detection)

```typescript
// src/middleware.ts (updated)

import { auth } from "@/auth";
import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

const PUBLIC_HOSTNAMES = new Set(["app", "www", "localhost", "127.0.0.1"]);
const DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "taskforge.dev";

export default auth(async (req) => {
  const hostname = req.nextUrl.hostname;
  const path = req.nextUrl.pathname;

  // Extract subdomain
  const subdomain = hostname.replace(`.${DOMAIN}`, "");

  // If main app (app.taskforge.dev, www.taskforge.dev, localhost)
  if (PUBLIC_HOSTNAMES.has(subdomain) || subdomain === hostname) {
    // Allow access to public routes
    const isPublicPath =
      path === "/" ||
      path === "/login" ||
      path === "/register" ||
      path.startsWith("/api/auth") ||
      path.startsWith("/api/health") ||
      path.startsWith("/api/ai/generate-tasks");

    if (!req.auth && !isPublicPath && !path.startsWith("/api/forms")) {
      const newUrl = new URL("/login", req.nextUrl.origin);
      return Response.redirect(newUrl);
    }
    return;
  }

  // Tenant subdomain (e.g., acme.taskforge.dev)
  // Look up workspace by subdomain
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.subdomain, subdomain),
  });

  if (!workspace) {
    // Tenant not found - show error or redirect to signup
    return new NextResponse("Workspace not found", { status: 404 });
  }

  // Check if user is authenticated
  if (!req.auth) {
    // Redirect to login with tenant context
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("redirect", req.nextUrl.href);
    return Response.redirect(loginUrl);
  }

  // Check workspace membership
  const membership = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.workspaceId, workspace.id),
  });

  if (!membership) {
    // User is authenticated but not a member
    return new NextResponse("Access denied to this workspace", { status: 403 });
  }

  // Set tenant context headers for downstream use
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-workspace-id", workspace.id);
  requestHeaders.set("x-workspace-slug", workspace.slug);
  requestHeaders.set("x-tenant-subdomain", subdomain);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
```

### 6.2 Tenant Context Utility

```typescript
// src/lib/tenant.ts

import { headers } from "next/headers";
import { db } from "@/db";
import { workspaces, workspaceMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface TenantContext {
  workspaceId: string;
  workspaceSlug: string;
  subdomain: string;
  userId: string;
  role: string;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const headersList = await headers();
  
  const workspaceId = headersList.get("x-workspace-id");
  const workspaceSlug = headersList.get("x-workspace-slug");
  const subdomain = headersList.get("x-tenant-subdomain");
  
  if (!workspaceId || !workspaceSlug || !subdomain) {
    return null;
  }

  // Get current user from session (implement based on your auth)
  // This is a placeholder - integrate with your actual session
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return null;
  }

  return {
    workspaceId,
    workspaceSlug,
    subdomain,
    userId: session.user.id,
    role: membership.role,
  };
}

// Helper to require tenant context
export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getTenantContext();
  if (!context) {
    throw new Error("Tenant context required");
  }
  return context;
}
```

### 6.3 Protected API Route with Tenant Context

```typescript
// Example: Updated task route with tenant isolation

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireTenantContext } from "@/lib/tenant";
import { db } from "@/db";
import { tasks, lists, spaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // This now uses tenant context from middleware
  const tenant = await requireTenantContext();
  
  const { id: taskId } = await params;

  // Query with tenant context - automatically scoped to workspace
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      list: {
        with: {
          space: true,
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Double-check workspace matches (belt and suspenders)
  if (task.list.space.workspaceId !== tenant.workspaceId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ task });
}
```

### 6.4 NextAuth Configuration for Subdomains

```typescript
// src/auth.ts (updated)

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [...],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  // KEY: Configure cookies for subdomain sharing
  cookies: {
    sessionToken: {
      name: "__session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // THIS IS CRITICAL for subdomain auth:
        domain: process.env.NODE_ENV === "production" 
          ? ".taskforge.dev"  // Note the leading dot
          : "localhost",
      },
    },
  },
});
```

### 6.5 Registration with Org/Subdomain Creation

```typescript
// src/app/api/auth/register/route.ts (updated)

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users, workspaces, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(1).max(255),  // Organization name
  subdomain: z.string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Invalid subdomain format")
    .transform(s => s.toLowerCase()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if email exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Check if subdomain is available
    const existingSubdomain = await db.query.workspaces.findFirst({
      where: eq(workspaces.subdomain, validatedData.subdomain),
    });

    if (existingSubdomain) {
      return NextResponse.json(
        { error: "Subdomain already taken" },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await hash(validatedData.password, 12);
    const [newUser] = await db
      .insert(users)
      .values({
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
      })
      .returning();

    // Create workspace with subdomain
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: validatedData.orgName,
        slug: validatedData.subdomain, // or separate slug field
        subdomain: validatedData.subdomain,
        ownerId: newUser.id,
        status: "trial",
      })
      .returning();

    // Add owner as workspace member
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: newUser.id,
      role: "owner",
    });

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
          subdomain: workspace.subdomain,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 7. DNS Configuration

For subdomains to work in production:

```dns
; DNS records (example for Cloudflare)
*.taskforge.dev    A     192.0.2.1    ; Point to your server
taskforge.dev      A     192.0.2.1    ; Main domain also works
```

Or for custom domain:
```dns
acme.com           CNAME taskforge.dev
```

---

## 8. Summary

### Immediate Actions (Before Any Multi-Tenant Work)
1. ✅ Fix `/api/search` - Add authentication
2. ✅ Fix `/api/forms/[slug]` DELETE - Add authentication  
3. ✅ Add workspace filtering to search

### For True Multi-Tenancy
1. Add `subdomain`, `plan`, `status` fields to workspaces
2. Implement middleware for subdomain → tenant resolution
3. Configure NextAuth for cross-subdomain sessions
4. Create registration → organization flow
5. Optionally add PostgreSQL RLS as defense-in-depth

### Estimated Timeline
- **Security fixes**: 1 week
- **Subdomain infrastructure**: 2 weeks
- **Frontend changes**: 1 week  
- **RLS/Advanced**: 1 week
- **Total**: ~5 weeks for full implementation

---

*Report generated by OpenClaw subagent for TaskForge multi-tenancy analysis*
