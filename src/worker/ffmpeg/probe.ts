import { spawn } from "child_process";
import { getFFprobePath } from "@/worker/ffmpeg/binaries";

export interface ProbeResult {
  formatName: string;
  durationSeconds: number;
  sizeBytes: number;
  hasAudio: boolean;
  audioCodec?: string;
  channels?: number;
  sampleRate?: number;
}

export async function probeMedia(filePath: string): Promise<ProbeResult> {
  const ffprobePath = getFFprobePath();

  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration,size,format_name:stream=codec_name,codec_type,channels,sample_rate",
    "-of",
    "json",
    "-protocol_whitelist",
    "file",
    filePath,
  ];

  return new Promise((resolve, reject) => {
    const process = spawn(ffprobePath, args, {
      shell: false,
      windowsHide: true,
    });

    let stdoutData = "";
    let stderrData = "";

    process.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    process.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    const timeout = setTimeout(() => {
      process.kill("SIGKILL");
      reject(new Error("FFprobe inspection timed out."));
    }, 15000);

    process.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new Error(
            `FFprobe failed with code ${code}. Stderr: ${stderrData || "Corrupted media or unreadable file."}`
          )
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdoutData);
        const format = parsed.format || {};
        const streams = parsed.streams || [];

        const audioStream = streams.find(
          (s: { codec_type?: string }) => s.codec_type === "audio"
        );

        const duration = parseFloat(format.duration || "0");
        const size = parseInt(format.size || "0", 10);

        resolve({
          formatName: format.format_name || "unknown",
          durationSeconds: isNaN(duration) ? 0 : duration,
          sizeBytes: isNaN(size) ? 0 : size,
          hasAudio: !!audioStream,
          audioCodec: audioStream?.codec_name,
          channels: audioStream?.channels ? parseInt(audioStream.channels, 10) : undefined,
          sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate, 10) : undefined,
        });
      } catch (err) {
        reject(new Error(`Failed to parse FFprobe output: ${(err as Error).message}`));
      }
    });

    process.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
