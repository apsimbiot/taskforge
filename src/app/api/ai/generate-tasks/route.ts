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

const IMPROVED_PROMPT = `You are an expert project manager. Analyze the following content and extract actionable tasks that need to be completed.

For each task, provide:
- title: A clear, concise task title (action-oriented)
- description: A brief description explaining what needs to be done
- priority: One of "urgent", "high", "medium", or "low" - be strict and realistic
- effort: Estimated effort in human-readable format (e.g., "15m", "2h", "1d", "1w")
- subtasks: Array of smaller actionable steps needed to complete this task (if applicable)

Guidelines:
- Break down complex requests into multiple specific tasks
- Set realistic priorities based on importance and urgency
- Estimate effort based on typical scope
- Include subtasks for multi-step tasks
- Focus on actionable items, not abstract concepts

Respond ONLY with a valid JSON array, no markdown, no explanations. Example format:
[
  {"title": "Set up development environment", "description": "Install Node.js, configure IDE, clone repository", "priority": "high", "effort": "1h", "subtasks": ["Install Node.js LTS", "Configure VS Code extensions", "Clone repo and install deps"]},
  {"title": "Implement user authentication", "description": "Add login/logout functionality with JWT", "priority": "urgent", "effort": "4h", "subtasks": ["Create auth API endpoints", "Add login form", "Implement session handling"]}
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

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let promptContent = "";
    let result;

    // Handle different input types
    if (type === "url") {
      // Fetch URL content first
      try {
        const urlValidation = new URL(content);
        if (!["http:", "https:"].includes(urlValidation.protocol)) {
          return NextResponse.json(
            { error: "Invalid URL protocol. Only HTTP and HTTPS are supported." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }

      // Fetch the URL content
      try {
        const fetchResponse = await fetch(content, {
          headers: {
            "User-Agent": "TaskForge-AI/1.0 (AI Task Generator)",
          },
        });

        if (!fetchResponse.ok) {
          return NextResponse.json(
            { error: `Failed to fetch URL: ${fetchResponse.status} ${fetchResponse.statusText}` },
            { status: 400 }
          );
        }

        const html = await fetchResponse.text();
        
        // Basic HTML to text extraction
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Truncate if too long
        promptContent = text.length > 15000
          ? text.substring(0, 15000) + "\n\n[Content truncated due to length...]"
          : text;

        result = await model.generateContent(
          IMPROVED_PROMPT + `\n\nAnalyze the following content from URL: ${content}\n\nContent:\n${promptContent}`
        );
      } catch (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : "Unknown error";
        console.error("URL fetch error:", msg);
        return NextResponse.json(
          { error: `Failed to fetch URL: ${msg}` },
          { status: 400 }
        );
      }
    } else if (content.startsWith("data:")) {
      // Handle base64 data URLs (images and PDFs)
      const match = content.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid file data" }, { status: 400 });
      }
      const mimeType = match[1];
      const base64Data = match[2];

      // Check size — base64 data should be under 2MB to stay within context limits
      if (base64Data.length > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large (max 2MB after encoding). Please use a smaller PDF or paste text directly." },
          { status: 400 }
        );
      }

      // Send directly to Gemini — it handles images AND PDFs natively
      result = await model.generateContent([
        IMPROVED_PROMPT + "\n\nExtract actionable tasks from this file:",
        { inlineData: { mimeType, data: base64Data } },
      ]);
    } else {
      // Plain text — truncate to prevent context overflow
      const truncated = content.length > 15000
        ? content.substring(0, 15000) + "\n\n[Content truncated...]"
        : content;
      result = await model.generateContent(
        IMPROVED_PROMPT + `\n\nContent:\n${truncated}`
      );
    }

    const response = result.response;
    const text = response.text();

    // Clean markdown code blocks
    const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let tasks;
    try {
      tasks = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", cleanedText);
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again with different input." },
        { status: 500 }
      );
    }

    // Validate the response is an array
    if (!Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "AI response format invalid. Expected an array of tasks." },
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
