import { Router } from "express";
import { query } from "../../db/pg.ts";
import { authenticate } from "../../middleware/auth.ts";
import type { User } from "../../types/index.ts";

const router = Router();

router.get("/me", authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, full_name, avatar_url, bio, created_at
       FROM users WHERE id = $1`,
      [req.user!.userId],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, full_name, avatar_url, bio, created_at
       FROM users WHERE id = $1`,
      [req.params.id],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = result.rows[0] as User;

    const [followersCount, followingCount] = await Promise.all([
      query("SELECT COUNT(*) FROM follows WHERE followee_id = $1", [user.id]),
      query("SELECT COUNT(*) FROM follows WHERE follower_id = $1", [user.id]),
    ]);

    res.json({
      user,
      followersCount: parseInt(followersCount.rows[0].count, 10),
      followingCount: parseInt(followingCount.rows[0].count, 10),
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/me", authenticate, async (req, res) => {
  try {
    const { full_name, bio, avatar_url } = req.body as {
      full_name?: string;
      bio?: string;
      avatar_url?: string;
    };

    const result = await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, username, email, full_name, avatar_url, bio, created_at`,
      [full_name ?? null, bio ?? null, avatar_url ?? null, req.user!.userId],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
