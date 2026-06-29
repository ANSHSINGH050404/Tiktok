import mongoose, { Schema, type Document } from "mongoose";

export type VideoStatus = "uploading" | "processing" | "ready" | "failed";

export interface VideoDocument extends Document {
  userId: string;
  description: string;
  s3Key: string;
  thumbnailKey: string | null;
  hlsPlaylistKey: string | null;
  duration: number;
  status: VideoStatus;
  viewCount: number;
  metadata: {
    width: number;
    height: number;
    size: number;
    mimeType: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<VideoDocument>(
  {
    userId: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    s3Key: { type: String, required: true, unique: true },
    thumbnailKey: { type: String, default: null },
    hlsPlaylistKey: { type: String, default: null },
    duration: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "failed"],
      default: "uploading",
      index: true,
    },
    viewCount: { type: Number, default: 0 },
    metadata: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      size: { type: Number, default: 0 },
      mimeType: { type: String, default: "video/mp4" },
    },
  },
  { timestamps: true },
);

videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ status: 1, createdAt: -1 });

export const Video = mongoose.model<VideoDocument>("Video", videoSchema);
