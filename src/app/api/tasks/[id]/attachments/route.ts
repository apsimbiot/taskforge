import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/auth";
import { db } from "@/db";
import { taskAttachments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://minio:9000",
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "taskforge",
    secretAccessKey: process.env.S3_SECRET_KEY || "taskforge123",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || "taskforge";

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
];

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

// GET - List attachments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;

    const attachments = await db
      .select({
        id: taskAttachments.id,
        taskId: taskAttachments.taskId,
        filename: taskAttachments.filename,
        fileKey: taskAttachments.fileKey,
        fileSize: taskAttachments.fileSize,
        mimeType: taskAttachments.mimeType,
        uploadedBy: taskAttachments.uploadedBy,
        createdAt: taskAttachments.createdAt,
      })
      .from(taskAttachments)
      .where(eq(taskAttachments.taskId, taskId))
      .orderBy(desc(taskAttachments.createdAt));

    // Add URL to each attachment
    const attachmentsWithUrl = attachments.map((attachment) => ({
      ...attachment,
      url: `/api/files/${attachment.fileKey}`,
    }));

    return NextResponse.json(attachmentsWithUrl);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

// POST - Upload attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: images, PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, ZIP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 25MB allowed." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "bin";
    const uuid = randomUUID();
    const key = `attachments/${taskId}/${uuid}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to MinIO
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Insert into database
    const [attachment] = await db
      .insert(taskAttachments)
      .values({
        taskId,
        filename: file.name,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: session.user.id,
      })
      .returning({
        id: taskAttachments.id,
        taskId: taskAttachments.taskId,
        filename: taskAttachments.filename,
        fileKey: taskAttachments.fileKey,
        fileSize: taskAttachments.fileSize,
        mimeType: taskAttachments.mimeType,
        uploadedBy: taskAttachments.uploadedBy,
        createdAt: taskAttachments.createdAt,
      });

    return NextResponse.json({
      ...attachment,
      url: `/api/files/${attachment.fileKey}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// DELETE - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json({ error: "Attachment ID required" }, { status: 400 });
    }

    // Get attachment from DB
    const [attachment] = await db
      .select({
        id: taskAttachments.id,
        fileKey: taskAttachments.fileKey,
      })
      .from(taskAttachments)
      .where(eq(taskAttachments.id, attachmentId))
      .limit(1);

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Delete from MinIO
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: attachment.fileKey,
    });
    await s3Client.send(deleteCommand);

    // Delete from DB
    await db
      .delete(taskAttachments)
      .where(eq(taskAttachments.id, attachmentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
