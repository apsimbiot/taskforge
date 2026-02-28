import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users, workspaces, workspaceMembers, spaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isSubdomainAvailable } from "@/lib/tenant";

// Simple in-memory rate limiter: max 5 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || request.headers.get("x-real-ip") 
    || "unknown";
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  
  try {
    const body = await request.json();
    const { name, email, password, organizationName, subdomain } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, password" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Validate subdomain if provided
    let finalSubdomain: string | null = null;
    if (subdomain) {
      // Check subdomain format
      if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(subdomain)) {
        return NextResponse.json(
          { error: "Invalid subdomain format. Use only letters, numbers, and hyphens." },
          { status: 400 }
        );
      }
      
      // Check availability
      const available = await isSubdomainAvailable(subdomain);
      if (!available) {
        return NextResponse.json(
          { error: "Subdomain is not available" },
          { status: 409 }
        );
      }
      finalSubdomain = subdomain.toLowerCase();
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create user and workspace in a transaction
    const result = await db.transaction(async (tx) => {
      // Create user
      const [newUser] = await tx
        .insert(users)
        .values({
          name,
          email,
          passwordHash,
        })
        .returning();

      // Generate slug from organization name or use subdomain
      const slug = finalSubdomain || organizationName?.toLowerCase().replace(/[^a-z0-9]/g, "-") || newUser.id.slice(0, 8);

      // Create workspace
      const [newWorkspace] = await tx
        .insert(workspaces)
        .values({
          name: organizationName || `${name}'s Workspace`,
          slug,
          subdomain: finalSubdomain,
          ownerId: newUser.id,
          plan: "free",
          status: "active",
        })
        .returning();

      // Add user as owner of workspace
      await tx.insert(workspaceMembers).values({
        workspaceId: newWorkspace.id,
        userId: newUser.id,
        role: "owner",
      });

      // Create default "Inbox" space
      const [defaultSpace] = await tx
        .insert(spaces)
        .values({
          workspaceId: newWorkspace.id,
          name: "Inbox",
          description: "Your default task space",
          color: "#6366f1",
          icon: "inbox",
          order: 0,
        })
        .returning();

      return { user: newUser, workspace: newWorkspace, space: defaultSpace };
    });

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name,
          slug: result.workspace.slug,
          subdomain: result.workspace.subdomain,
        },
        message: "Account and organization created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
