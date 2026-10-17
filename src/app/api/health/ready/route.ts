import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { getRedisConnection } from "@/lib/queue/redis";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  let mongoStatus = "disconnected";
  let redisStatus = "disconnected";

  try {
    await connectDB();
    mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "connecting";
  } catch {
    mongoStatus = "error";
  }

  try {
    const redis = getRedisConnection();
    const ping = await redis.ping();
    redisStatus = ping === "PONG" ? "connected" : "degraded";
  } catch {
    redisStatus = "error";
  }

  const isReady = mongoStatus === "connected" && redisStatus === "connected";

  return NextResponse.json(
    {
      status: isReady ? "ready" : "degraded",
      services: {
        mongodb: mongoStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    },
    { status: isReady ? 200 : 503 }
  );
}
