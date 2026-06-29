import { Router } from "express";
import { authenticate } from "../../middleware/auth.ts";
import { rateLimiter } from "../../middleware/rateLimiter.ts";
import {
  generateUploadUrl,
  getVideoById,
  confirmUpload,
  getPlaybackUrl,
  getThumbnailUrl,
  incrementViewCount,
  markVideoReady,
  markVideoFailed,
} from "./video.service.ts";
import { config } from "../../config/index.ts";

const router = Router();

router.post("/upload-url", authenticate, rateLimiter, async (req, res) => {
  try {
    const { description, mimeType } = req.body as {
      description?: string;
      mimeType?: string;
    };

    if (!mimeType) {
      res.status(400).json({ error: "mimeType is required" });
      return;
    }

    const result = await generateUploadUrl(
      req.user!.userId,
      description ?? "",
      mimeType,
    );

    res.status(201).json(result);
  } catch (err) {
    console.error("Generate upload URL error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/confirm", authenticate, async (req, res) => {
  try {
    const videoId = req.params["id"] as string;
    const { width, height, size } = req.body as {
      width: number;
      height: number;
      size: number;
    };

    const video = await confirmUpload(videoId, {
      width: width ?? 0,
      height: height ?? 0,
      size: size ?? 0,
    });

    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    res.json({ video });
  } catch (err) {
    console.error("Confirm upload error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const videoId = req.params.id!;
    const video = await getVideoById(videoId);

    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    await incrementViewCount(videoId);

    const response: Record<string, unknown> = {
      id: video._id,
      userId: video.userId,
      description: video.description,
      duration: video.duration,
      status: video.status,
      viewCount: video.viewCount + 1,
      metadata: video.metadata,
      createdAt: video.createdAt,
    };

    if (video.status === "ready") {
      response.playbackUrl = getPlaybackUrl(video.hlsPlaylistKey!);
      if (video.thumbnailKey) {
        response.thumbnailUrl = getThumbnailUrl(video.thumbnailKey);
      }
    }

    res.json({ video: response });
  } catch (err) {
    console.error("Get video error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/transcode-webhook", async (req, res) => {
  try {
    const secret = req.headers["x-webhook-secret"] as string | undefined;

    if (secret !== config.transcode.webhookSecret) {
      res.status(401).json({ error: "Invalid webhook secret" });
      return;
    }

    const { videoId, status, hlsPlaylistKey, thumbnailKey, duration } =
      req.body as {
        videoId: string;
        status: "ready" | "failed";
        hlsPlaylistKey?: string;
        thumbnailKey?: string;
        duration?: number;
      };

    if (status === "ready") {
      await markVideoReady(
        videoId,
        hlsPlaylistKey!,
        thumbnailKey!,
        duration ?? 0,
      );
    } else {
      await markVideoFailed(videoId);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Transcode webhook error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
