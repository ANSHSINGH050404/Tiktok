import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../config/index.ts";
import { Video, type VideoDocument } from "./video.model.ts";

const s3 = new S3Client({
  region: config.aws.region,
  credentials: config.aws.accessKeyId
    ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey!,
      }
    : undefined,
});

export interface UploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
  videoId: string;
}

export async function generateUploadUrl(
  userId: string,
  description: string,
  mimeType: string,
): Promise<UploadUrlResponse> {
  const videoId = uuidv4();
  const extension = mimeType.split("/")[1] ?? "mp4";
  const s3Key = `uploads/${userId}/${videoId}.${extension}`;

  const presignedUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: s3Key,
      ContentType: mimeType,
    }),
    { expiresIn: 3600 },
  );

  await Video.create({
    _id: videoId,
    userId,
    description,
    s3Key,
    status: "uploading",
    metadata: { mimeType, width: 0, height: 0, size: 0 },
  });

  return { uploadUrl: presignedUrl, s3Key, videoId };
}

export async function getVideoById(videoId: string): Promise<VideoDocument | null> {
  return Video.findById(videoId);
}

export async function confirmUpload(
  videoId: string,
  metadata: { width: number; height: number; size: number },
): Promise<VideoDocument | null> {
  return Video.findByIdAndUpdate(
    videoId,
    {
      status: "processing",
      "metadata.width": metadata.width,
      "metadata.height": metadata.height,
      "metadata.size": metadata.size,
    },
    { new: true },
  );
}

export async function markVideoReady(
  videoId: string,
  hlsPlaylistKey: string,
  thumbnailKey: string,
  duration: number,
): Promise<VideoDocument | null> {
  return Video.findByIdAndUpdate(
    videoId,
    {
      status: "ready",
      hlsPlaylistKey,
      thumbnailKey,
      duration,
    },
    { new: true },
  );
}

export async function markVideoFailed(videoId: string): Promise<VideoDocument | null> {
  return Video.findByIdAndUpdate(
    videoId,
    { status: "failed" },
    { new: true },
  );
}

export async function incrementViewCount(videoId: string): Promise<void> {
  await Video.findByIdAndUpdate(videoId, { $inc: { viewCount: 1 } });
}

export function getPlaybackUrl(hlsPlaylistKey: string): string {
  if (config.aws.cloudfrontDomain) {
    return `https://${config.aws.cloudfrontDomain}/${hlsPlaylistKey}`;
  }
  return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${hlsPlaylistKey}`;
}

export function getThumbnailUrl(thumbnailKey: string): string {
  if (config.aws.cloudfrontDomain) {
    return `https://${config.aws.cloudfrontDomain}/${thumbnailKey}`;
  }
  return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${thumbnailKey}`;
}
