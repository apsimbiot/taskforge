import { NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://minio:9000",
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "taskforge",
    secretAccessKey: process.env.S3_SECRET_KEY || "taskforge123",
  },
  forcePathStyle: true,
})

const BUCKET = process.env.S3_BUCKET || "taskforge"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const key = path.join("/")

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Convert the stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Determine content type from key extension
    const ext = key.split(".").pop()?.toLowerCase() || ""
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
    }
    const contentType = contentTypes[ext] || "application/octet-stream"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("File proxy error:", error)
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 })
  }
}
