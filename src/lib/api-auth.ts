import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, users, workspaceMembers, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticate a request using an API key
 * Returns the user ID and their workspace memberships if valid, null if invalid
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<{ userId: string; workspaceIds: string[] } | null> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7); // Remove "Bearer " prefix

  if (!apiKey || apiKey.length < 10) {
    return null;
  }

  const keyHash = hashApiKey(apiKey);

  // Look up the API key
  const keyRecord = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, keyHash),
    with: {
      user: true,
    },
  });

  if (!keyRecord) {
    return null;
  }

  // Check if key has expired
  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    return null;
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRecord.id));

  // Get user's workspace memberships
  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, keyRecord.userId),
  });

  return {
    userId: keyRecord.userId,
    workspaceIds: memberships.map((m) => m.workspaceId),
  };
}

/**
 * Require API key authentication - returns 401 if not authenticated
 */
export async function requireApiAuth(
  request: NextRequest
): Promise<{ userId: string; workspaceIds: string[] }> {
  const auth = await authenticateApiKey(request);

  if (!auth) {
    throw new ApiAuthError("Invalid or missing API key", 401);
  }

  return auth;
}

/**
 * Custom error for API auth failures
 */
export class ApiAuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "ApiAuthError";
  }
}

/**
 * Check if a user has access to a specific workspace
 */
export async function userHasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  return !!membership;
}

/**
 * Generate a new API key (plain text - only returned once)
 */
export function generateApiKey(): string {
  return `tfk_${crypto.randomBytes(24).toString("hex")}`;
}
