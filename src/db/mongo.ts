import mongoose from "mongoose";
import { config } from "../config/index.ts";

let isConnected = false;

export async function connectMongo(): Promise<void> {
  if (isConnected) return;

  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  await mongoose.connect(config.mongo.uri, {
    maxPoolSize: 50,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  isConnected = true;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  isConnected = false;
}
