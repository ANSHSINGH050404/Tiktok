import { Router } from "express";
import { authenticate } from "../../middleware/auth.ts";
import { query } from "../../db/pg.ts";

const router = Router();

router.post("/follow/:userId", authenticate, async (req, res) => {
  try {
    const followeeId = req.params.userId;

    if (followeeId === req.user!.userId) {
      res.status(400).json({ error: "Cannot follow yourself" });
      return;
    }

    await query(
      "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.user!.userId, followeeId],
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/follow/:userId", authenticate, async (req, res) => {
  try {
    await query(
      "DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2",
      [req.user!.userId, req.params.userId],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Unfollow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/follow/:userId/status", authenticate, async (req, res) => {
  try {
    const result = await query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = $2",
      [req.user!.userId, req.params.userId],
    );

    res.json({ isFollowing: (result.rowCount ?? 0) > 0 });
  } catch (err) {
    console.error("Follow status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/likes/:videoId", authenticate, async (req, res) => {
  try {
    await query(
      "INSERT INTO likes (user_id, video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.user!.userId, req.params.videoId],
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/likes/:videoId", authenticate, async (req, res) => {
  try {
    await query(
      "DELETE FROM likes WHERE user_id = $1 AND video_id = $2",
      [req.user!.userId, req.params.videoId],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Unlike error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/likes/:videoId/status", authenticate, async (req, res) => {
  try {
    const result = await query(
      "SELECT 1 FROM likes WHERE user_id = $1 AND video_id = $2",
      [req.user!.userId, req.params.videoId],
    );

    const countResult = await query(
      "SELECT COUNT(*) FROM likes WHERE video_id = $1",
      [req.params.videoId],
    );

    res.json({
      isLiked: (result.rowCount ?? 0) > 0,
      likeCount: parseInt(countResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error("Like status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/comments/:videoId", authenticate, async (req, res) => {
  try {
    const { content } = req.body as { content: string };

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    const result = await query(
      `INSERT INTO comments (user_id, video_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, video_id, content, created_at`,
      [req.user!.userId, req.params.videoId, content.trim()],
    );

    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/comments/:videoId", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const offset = (page - 1) * limit;

    const [commentsResult, countResult] = await Promise.all([
      query(
        `SELECT c.id, c.user_id, c.video_id, c.content, c.created_at,
                u.username, u.avatar_url
         FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.video_id = $1
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.params.videoId, limit, offset],
      ),
      query("SELECT COUNT(*) FROM comments WHERE video_id = $1", [
        req.params.videoId,
      ]),
    ]);

    res.json({
      comments: commentsResult.rows,
      page,
      limit,
      total: parseInt(countResult.rows[0].count, 10),
      hasMore: offset + limit < parseInt(countResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/comments/:commentId", authenticate, async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.commentId, req.user!.userId],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Comment not found or not yours" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
