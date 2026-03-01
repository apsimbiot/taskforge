import { NextRequest, NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/api-auth";

/**
 * Middleware for API v1 routes that enforces API key authentication
 */
export async function apiAuthMiddleware(request: NextRequest) {
  try {
    const auth = await requireApiKeyAuth(request);
    return { auth, error: null };
  } catch (error: any) {
    if (error.statusCode === 401) {
      return {
        auth: null,
        error: NextResponse.json(
          { error: error.message || "Invalid or missing API key" },
          { status: 401 }
        ),
      };
    }
    return {
      auth: null,
      error: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}
