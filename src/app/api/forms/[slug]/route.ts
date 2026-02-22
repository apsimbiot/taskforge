import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { forms, tasks, lists, spaces, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// GET /api/forms/[slug] - Public form (no auth required)
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const form = await db.query.forms.findFirst({
      where: eq(forms.slug, slug),
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (!form.isPublic) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Get linked list info if exists
    let listInfo = null;
    if (form.listId) {
      const list = await db.query.lists.findFirst({
        where: eq(lists.id, form.listId),
      });
      if (list) {
        listInfo = {
          id: list.id,
          name: list.name,
        };
      }
    }

    return NextResponse.json({ 
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        fields: form.fields,
        listInfo,
      }
    });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
