import { Router } from "express";
import { authenticate } from "../../middleware/auth.ts";
import { getFollowingFeed, getForYouFeed } from "./feed.service.ts";
import { Video } from "../video/video.model.ts";

const router = Router();

router.get("/following", authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    const { videoIds, hasMore } = await getFollowingFeed(
      req.user!.userId,
      page,
      limit,
    );

    const videos = await Video.find({ _id: { $in: videoIds } })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ videos, page, limit, hasMore });
  } catch (err) {
    console.error("Following feed error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/for-you", authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    const { videoIds, hasMore } = await getForYouFeed(
      req.user!.userId,
      page,
      limit,
    );

    const videos = await Video.find({ _id: { $in: videoIds } })
      .sort({ viewCount: -1, createdAt: -1 })
      .lean();

    res.json({ videos, page, limit, hasMore });
  } catch (err) {
    console.error("ForYou feed error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
