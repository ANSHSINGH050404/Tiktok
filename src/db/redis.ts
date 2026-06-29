import Redis from "ioredis";
import { config } from "../config/index.ts";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(config.redis.url, {
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    client.on("error", (err) => {
      console.error("Redis error:", err);
    });
  }

  return client;
}

export async function connectRedis(): Promise<void> {
  const r = getRedis();
  if (r.status === "ready") return;
  await r.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
