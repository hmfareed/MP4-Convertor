import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { getStorage } from "@/lib/storage";
import { errorResponse } from "@/lib/errors";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const jobId = params.id;
    const job = await ConversionJob.findById(jobId);

    if (!job) {
      return errorResponse("NOT_FOUND", "Conversion job not found.", 404);
    }

    if (job.status !== "completed" || !job.output?.storageKey) {
      return errorResponse(
        "INVALID_STATE",
        "The audio output is not yet ready for preview.",
        409
      );
    }

    const storage = getStorage();
    const filePath = storage.getPath(job.output.storageKey);

    if (!fs.existsSync(filePath)) {
      return errorResponse(
        "JOB_EXPIRED",
        "The requested audio file is no longer available.",
        410
      );
    }

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    const format = job.output.format || job.settings.format || "mp3";
    const { getFormatConfig } = await import("@/lib/constants");
    const formatConfig = getFormatConfig(format);

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": formatConfig.mime,
        "Content-Length": stat.size.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    console.error("Audio preview route error:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to stream the requested audio preview.",
      500
    );
  }
}
