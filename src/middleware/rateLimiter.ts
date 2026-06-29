import type { Request, Response, NextFunction } from "express";
import { getRedis } from "../db/redis.ts";
import { config } from "../config/index.ts";

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const redis = getRedis();
    if (redis.status !== "ready") {
      next();
      return;
    }

    const key = `ratelimit:${req.ip ?? req.socket.remoteAddress}:${req.path}`;
    const window = config.rateLimit.windowMs;
    const max = config.rateLimit.maxRequests;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.pexpire(key, window);
    }

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - current));

    if (current > max) {
      const ttl = await redis.pttl(key);
      res.setHeader("Retry-After", Math.ceil(ttl / 1000));
      res.status(429).json({ error: "Too many requests, please try again later" });
      return;
    }

    next();
  } catch {
    next();
  }
}
