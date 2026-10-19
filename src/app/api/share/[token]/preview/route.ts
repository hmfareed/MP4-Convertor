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
      return errorResponse("INVALID_STATE", "Audio not ready.", 409);
    }

    const storage = getStorage();
    const filePath = storage.getPath(job.output.storageKey);

    if (!fs.existsSync(filePath)) {
      return errorResponse("JOB_EXPIRED", "Audio file has expired.", 410);
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.get("range");

    const format = job.output.format || job.settings.format || "mp3";
    const formatConfig = getFormatConfig(format);
    const contentType = formatConfig.mime || "audio/mpeg";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
        },
      });
    }

    const fileStream = fs.createReadStream(filePath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": stat.size.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err: unknown) {
    console.error("Shared audio preview error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to stream audio preview.", 500);
  }
}
