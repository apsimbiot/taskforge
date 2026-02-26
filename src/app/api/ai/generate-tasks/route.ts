import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const inputSchema = z.object({
  type: z.enum(["text", "image", "file", "url"]),
  content: z.string().min(1),
  listId: z.string().uuid().optional(),
});

const taskSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["urgent", "high", "medium", "low"]),
  effort: z.string().optional(),
  subtasks: z.array(z.string()).optional(),
});

const PROMPT = `Analyze the following content and extract actionable tasks.

Return a JSON array of tasks. Each task should have:
- title: string (concise task title)
- description: string (brief description)  
- priority: "urgent" | "high" | "medium" | "low"
- effort: string (optional, estimated effort like "1h", "2d", etc.)
- subtasks: string[] (optional, list of subtasks)

Respond ONLY with valid JSON array, no other text. Example:
[
  {"title": "Task 1", "description": "Description", "priority": "high", "effort": "2h", "subtasks": ["Subtask 1", "Subtask 2"]},
  {"title": "Task 2", "description": "Description", "priority": "medium"}
]`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { type, content, listId } = inputSchema.parse(body);

    // Use 1.5-flash which has better document understanding
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let result;

    // Handle base64 data URLs (images and PDFs)
    if (content.startsWith("data:")) {
      const match = content.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid file data" }, { status: 400 });
      }
      const mimeType = match[1];
      const base64Data = match[2];

      // Check size — base64 data should be under 3MB
      if (base64Data.length > 3 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Please use a smaller file or paste the text directly." },
          { status: 400 }
        );
      }

      // Send directly to Gemini — it handles images AND PDFs natively
      result = await model.generateContent([
        PROMPT + "\n\nExtract actionable tasks from this file:",
        { inlineData: { mimeType, data: base64Data } },
      ]);
    } else {
      // Plain text — truncate to prevent context overflow
      const truncated = content.length > 15000
        ? content.substring(0, 15000) + "\n\n[Content truncated...]"
        : content;
      result = await model.generateContent(
        PROMPT + `\n\nContent:\n${truncated}`
      );
    }

    const response = result.response;
    const text = response.text();

    // Clean markdown code blocks
    const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let tasks;
    try {
      tasks = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse AI response:", cleanedText);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const validatedTasks = z.array(taskSchema).parse(tasks);

    return NextResponse.json({
      tasks: validatedTasks,
      listId: listId || null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("Error generating tasks:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
