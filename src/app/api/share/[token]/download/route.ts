import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { getStorage } from "@/lib/storage";
import { errorResponse } from "@/lib/errors";
import { getFormatConfig } from "@/lib/constants";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB();
    const token = params.token;

    const job = await ConversionJob.findOne({
      $or: [{ shareToken: token }, { _id: token.match(/^[0-9a-fA-F]{24}$/) ? token : null }],
    });

    if (!job) {
      return errorResponse("NOT_FOUND", "Shared conversion not found.", 404);
    }

    if (job.status !== "completed" || !job.output?.storageKey) {
      return errorResponse("INVALID_STATE", "The audio output is not yet ready for download.", 409);
    }

    const storage = getStorage();
    const filePath = storage.getPath(job.output.storageKey);

    if (!fs.existsSync(filePath)) {
      return errorResponse(
        "JOB_EXPIRED",
        "The audio file has expired and is no longer available.",
        410
      );
    }

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);
    const safeFilename = encodeURIComponent(job.output.filename || "audio.mp3");

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    const format = job.output.format || job.settings.format || "mp3";
    const formatConfig = getFormatConfig(format);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": formatConfig.mime || "audio/mpeg",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    console.error("Shared download error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to download audio file.", 500);
  }
}
