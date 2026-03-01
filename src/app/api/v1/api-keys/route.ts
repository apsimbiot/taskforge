import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { generateApiKey, hashApiKey } from "@/lib/api-auth";

const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  expiresIn: z.number().min(1).max(365).optional(), // days
});

// GET /api/v1/api-keys - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, session.user.id),
      orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
    });

    // Return keys without the hash
    const safeKeys = keys.map((key) => ({
      id: key.id,
      name: key.name,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));

    return NextResponse.json({ apiKeys: safeKeys });
  } catch (error) {
    console.error("Error listing API keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/v1/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createApiKeySchema.parse(body);

    // Generate the plain text key (only returned once)
    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);

    const expiresAt = validatedData.expiresIn
      ? new Date(Date.now() + validatedData.expiresIn * 24 * 60 * 60 * 1000)
      : null;

    const [keyRecord] = await db
      .insert(apiKeys)
      .values({
        userId: session.user.id,
        keyHash,
        name: validatedData.name,
        expiresAt,
      })
      .returning();

    // Return the plain text key (only available at creation)
    return NextResponse.json(
      {
        apiKey: {
          id: keyRecord.id,
          name: keyRecord.name,
          key: plainKey, // Only returned once!
          expiresAt: keyRecord.expiresAt,
          createdAt: keyRecord.createdAt,
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
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
