import { query } from "../../db/pg.ts";
import { getRedis } from "../../db/redis.ts";
import { Video } from "../video/video.model.ts";

const FEED_TTL = 300;

export async function getFollowingFeed(
  userId: string,
  page: number,
  limit: number,
): Promise<{ videoIds: string[]; hasMore: boolean }> {
  const redis = getRedis();
  const feedKey = `feed:following:${userId}`;

  const cached = await redis.zrevrange(feedKey, 0, -1);
  if (cached.length > 0) {
    const start = (page - 1) * limit;
    const end = start + limit;
    const ids = cached.slice(start, end);
    return { videoIds: ids, hasMore: cached.length > end };
  }

  const result = await query(
    "SELECT followee_id FROM follows WHERE follower_id = $1",
    [userId],
  );

  const followeeIds = result.rows.map((r) => r.followee_id);
  if (followeeIds.length === 0) {
    return { videoIds: [], hasMore: false };
  }

  const videos = await Video.find({ userId: { $in: followeeIds } })
    .sort({ createdAt: -1 })
    .limit(200)
    .select("_id")
    .lean();

  const videoIds = videos.map((v) => v._id.toString());

  if (videoIds.length > 0) {
    const pipeline = redis.pipeline();
    videoIds.forEach((id, i) => {
      pipeline.zadd(feedKey, Date.now() - i, id);
    });
    pipeline.expire(feedKey, FEED_TTL);
    await pipeline.exec();
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    videoIds: videoIds.slice(start, end),
    hasMore: videoIds.length > end,
  };
}

export async function getForYouFeed(
  userId: string,
  page: number,
  limit: number,
): Promise<{ videoIds: string[]; hasMore: boolean }> {
  const redis = getRedis();
  const feedKey = `feed:foryou:${userId}`;

  const cached = await redis.lrange(feedKey, (page - 1) * limit, page * limit - 1);
  if (cached.length > 0) {
    const total = await redis.llen(feedKey);
    return { videoIds: cached, hasMore: total > page * limit };
  }

  const videos = await Video.find({ status: "ready" })
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(200)
    .select("_id")
    .lean();

  const videoIds = videos.map((v) => v._id.toString());

  if (videoIds.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.rpush(feedKey, ...videoIds);
    pipeline.expire(feedKey, FEED_TTL);
    await pipeline.exec();
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    videoIds: videoIds.slice(start, end),
    hasMore: videoIds.length > end,
  };
}
