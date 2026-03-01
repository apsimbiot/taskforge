import { NextRequest, NextResponse } from "next/server";
import { checkAndSendReminders } from "@/lib/reminders";

export async function POST(request: NextRequest) {
  try {
    // Optional: Add API key check for security if needed
    // const apiKey = request.headers.get("x-api-key");
    // if (apiKey !== process.env.CRON_API_KEY) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const sentCount = await checkAndSendReminders();

    return NextResponse.json({
      success: true,
      remindersSent: sentCount,
      message: sentCount === 0 
        ? "No pending reminders to send" 
        : `Sent ${sentCount} reminder${sentCount === 1 ? "" : "s"}`
    });
  } catch (error) {
    console.error("Error checking reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optionally allow GET for manual testing (disable in production)
export async function GET(request: NextRequest) {
  return POST(request);
}
