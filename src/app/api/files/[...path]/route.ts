import { NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { ensureBucket, s3Client, BUCKET } from "@/lib/init-minio"

// Lazy initialization flag
let initialized = false

async function ensureInitialized() {
  if (!initialized) {
    await ensureBucket()
    initialized = true
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    await ensureInitialized()
    
    const { path } = await params
    const key = path.join("/")

    // Check if file exists first
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    } catch (headError: any) {
      if (headError?.name === "NotFound" || headError?.$metadata?.httpStatusCode === 404) {
        return NextResponse.json({ error: "File not found" }, { status: 404 })
      }
      console.error("HeadObject error:", headError)
    }

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
