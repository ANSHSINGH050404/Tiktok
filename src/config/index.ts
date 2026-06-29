import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  postgres: {
    url: process.env.DATABASE_URL!,
  },

  mongo: {
    uri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/tiktok",
  },

  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as string,
  },

  aws: {
    region: process.env.AWS_REGION ?? "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.S3_BUCKET ?? "tiktok-videos",
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
  },

  transcode: {
    webhookSecret: process.env.TRANSCODE_WEBHOOK_SECRET ?? "local-dev-secret",
  },

  rateLimit: {
    windowMs: 60_000,
    maxRequests: 100,
  },
} as const;

function validateConfig(): void {
  const required = [
    ["DATABASE_URL", config.postgres.url],
    ["JWT_SECRET", config.jwt.secret],
  ] as const;

  for (const [name, val] of required) {
    if (!val) {
      throw new Error(`Missing required env var: ${name}`);
    }
  }
}

validateConfig();
