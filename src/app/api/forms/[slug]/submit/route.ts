import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { forms, tasks, lists, taskActivities, workspaces, spaces } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/forms/[slug]/submit - Submit form (no auth required, creates task)
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const form = await db.query.forms.findFirst({
      where: eq(forms.slug, slug),
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (!form.isPublic) {
      return NextResponse.json({ error: "Form not available" }, { status: 404 });
    }

    if (!form.listId) {
      return NextResponse.json({ error: "Form not linked to a list" }, { status: 400 });
    }

    const body = await request.json();

    // Get the list and its space to find workspace
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, form.listId),
      with: {
        space: true,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Linked list not found" }, { status: 400 });
    }

    // Get workspace owner for task creation
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, list.space.workspaceId),
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
    }

    // Build task title from form data
    const title = body.title || body.Name || body.name || `Form submission: ${form.name}`;
    
    // Build description from form fields
    const description: Record<string, any> = {};
    const fields = (form.fields as Array<{name: string, label: string, type: string}>) || [];
    
    for (const field of fields) {
      if (body[field.name] !== undefined) {
        description[field.label || field.name] = body[field.name];
      }
    }

    // Create the task
    const [task] = await db.insert(tasks).values({
      listId: form.listId,
      title,
      description,
      status: "todo",
      priority: "none",
      creatorId: workspace.ownerId,
    }).returning();

    // Log activity
    await db.insert(taskActivities).values({
      taskId: task.id,
      userId: workspace.ownerId,
      action: "created",
      field: "source",
      newValue: `form:${form.slug}`,
    });

    return NextResponse.json({ 
      success: true, 
      task: { id: task.id, title: task.title },
      message: "Submission received successfully" 
    }, { status: 201 });
  } catch (error) {
    console.error("Error submitting form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
