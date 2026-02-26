import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
// pdf-parse is CJS — use dynamic import

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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { type, content, listId } = inputSchema.parse(body);

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analyze the following content and extract actionable tasks.

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

    let result;
    let textContent = content;

    // Handle base64 data URLs
    if (content.startsWith("data:")) {
      const match = content.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid file data" }, { status: 400 });
      }
      const mimeType = match[1];
      const base64Data = match[2];

      if (mimeType === "application/pdf") {
        // Extract text from PDF server-side
        try {
          const buffer = Buffer.from(base64Data, "base64");
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(buffer);
          textContent = pdfData.text;
        } catch {
          return NextResponse.json({ error: "Failed to parse PDF" }, { status: 400 });
        }
      } else if (mimeType.startsWith("image/")) {
        // Send images directly to Gemini vision
        result = await model.generateContent([
          prompt + "\n\nAnalyze this image and extract actionable tasks from it:",
          { inlineData: { mimeType, data: base64Data } },
        ]);
      }
    }

    // For text content (including extracted PDF text)
    if (!result) {
      const truncated = textContent.length > 15000
        ? textContent.substring(0, 15000) + "\n\n[Content truncated...]"
        : textContent;
      result = await model.generateContent(
        prompt + `\n\nContent:\n${truncated}`
      );
    }

    const response = result.response;
    const text = response.text();

    // Clean the response - remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let tasks;
    try {
      tasks = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", cleanedText);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: text },
        { status: 500 }
      );
    }

    // Validate the parsed tasks
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
    console.error("Error generating tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
