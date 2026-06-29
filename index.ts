import express from "express";
import cors from "cors";
import { config } from "./src/config/index.ts";
import { connectMongo } from "./src/db/mongo.ts";
import { connectRedis } from "./src/db/redis.ts";
import authRouter from "./src/modules/auth/auth.routes.ts";
import userRouter from "./src/modules/user/user.routes.ts";
import videoRouter from "./src/modules/video/video.routes.ts";
import feedRouter from "./src/modules/feed/feed.routes.ts";
import interactionRouter from "./src/modules/interaction/interaction.routes.ts";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/videos", videoRouter);
app.use("/api/feed", feedRouter);
app.use("/api/interactions", interactionRouter);

async function start(): Promise<void> {
  try {
    await Promise.all([connectMongo(), connectRedis()]);

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
