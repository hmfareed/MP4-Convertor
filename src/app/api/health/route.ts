import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "mp4-to-mp3-web",
    timestamp: new Date().toISOString(),
  });
}
