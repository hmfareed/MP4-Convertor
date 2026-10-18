import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { getStorage } from "@/lib/storage";
import { errorResponse } from "@/lib/errors";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    await connectDB();
    const { batchId } = params;

    if (!batchId) {
      return errorResponse("VALIDATION_FAILED", "Batch ID is required.", 400);
    }

    const completedJobs = await ConversionJob.find({
      batchId,
      status: "completed",
      "output.storageKey": { $exists: true },
      deletedAt: { $exists: false },
    });

    if (completedJobs.length === 0) {
      return errorResponse(
        "NOT_FOUND",
        "No completed conversions found in this batch for download.",
        404
      );
    }

    const storage = getStorage();
    const passThrough = new PassThrough();
    const archive = new ZipArchive({
      zlib: { level: 6 },
    });

    // Handle archiver errors
    archive.on("error", (err: Error) => {
      console.error("ZIP archiver error:", err);
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    // Track filenames to prevent collision in ZIP
    const seenNames = new Set<string>();

    for (const job of completedJobs) {
      if (!job.output?.storageKey) continue;
      const filePath = storage.getPath(job.output.storageKey);

      if (fs.existsSync(filePath)) {
        let baseName = job.output.filename || `${job.originalFilename.replace(/\.[^/.]+$/, "")}.mp3`;
        let finalName = baseName;
        let counter = 1;

        while (seenNames.has(finalName.toLowerCase())) {
          const extIdx = baseName.lastIndexOf(".");
          const namePart = extIdx !== -1 ? baseName.substring(0, extIdx) : baseName;
          const extPart = extIdx !== -1 ? baseName.substring(extIdx) : ".mp3";
          finalName = `${namePart}-${counter}${extPart}`;
          counter++;
        }

        seenNames.add(finalName.toLowerCase());
        archive.file(filePath, { name: finalName });
      }
    }

    // Finalize the archive (asynchronously flushes data)
    archive.finalize();

    // Stream to client
    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on("data", (chunk) => controller.enqueue(chunk));
        passThrough.on("end", () => controller.close());
        passThrough.on("error", (err) => controller.error(err));
      },
      cancel() {
        passThrough.destroy();
      },
    });

    const zipFilename = `converted-audio-${batchId.slice(0, 8)}.zip`;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("Batch ZIP download error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to package batch download ZIP.", 500);
  }
}
