import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3"

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

let bucketChecked = false

export async function ensureBucket(): Promise<boolean> {
  if (bucketChecked) return true
  
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }))
    bucketChecked = true
    return true
  } catch {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }))
      console.log(`Created bucket: ${BUCKET}`)
      bucketChecked = true
      return true
    } catch (createError) {
      console.error("Failed to create bucket:", createError)
      return false
    }
  }
}

export { s3Client, BUCKET }
