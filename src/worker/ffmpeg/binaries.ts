import fs from "fs";
import path from "path";
import { env } from "@/lib/config/env";

export function getFFmpegPath(): string {
  if (env.FFMPEG_PATH && fs.existsSync(env.FFMPEG_PATH)) {
    return env.FFMPEG_PATH;
  }

  // Check node_modules installer paths directly to avoid webpack dynamic require scanning
  const cwd = process.cwd();
  const potentialPaths = [
    path.join(cwd, "node_modules", "@ffmpeg-installer", "win32-x64", "ffmpeg.exe"),
    path.join(cwd, "node_modules", "@ffmpeg-installer", "win32-ia32", "ffmpeg.exe"),
    path.join(cwd, "node_modules", "@ffmpeg-installer", "linux-x64", "ffmpeg"),
    path.join(cwd, "node_modules", "@ffmpeg-installer", "darwin-x64", "ffmpeg"),
    path.join(cwd, "node_modules", "@ffmpeg-installer", "darwin-arm64", "ffmpeg"),
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  try {
    // Dynamic runtime require fallback
    const req = eval("require");
    const installer = req("@ffmpeg-installer/ffmpeg");
    if (installer?.path && fs.existsSync(installer.path)) {
      return installer.path;
    }
  } catch {
    // ignore
  }

  return "ffmpeg";
}

export function getFFprobePath(): string {
  if (env.FFPROBE_PATH && fs.existsSync(env.FFPROBE_PATH)) {
    return env.FFPROBE_PATH;
  }

  // Check node_modules installer paths directly
  const cwd = process.cwd();
  const potentialPaths = [
    path.join(cwd, "node_modules", "@ffprobe-installer", "win32-x64", "ffprobe.exe"),
    path.join(cwd, "node_modules", "@ffprobe-installer", "win32-ia32", "ffprobe.exe"),
    path.join(cwd, "node_modules", "@ffprobe-installer", "linux-x64", "ffprobe"),
    path.join(cwd, "node_modules", "@ffprobe-installer", "darwin-x64", "ffprobe"),
    path.join(cwd, "node_modules", "@ffprobe-installer", "darwin-arm64", "ffprobe"),
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  try {
    const req = eval("require");
    const installer = req("@ffprobe-installer/ffprobe");
    if (installer?.path && fs.existsSync(installer.path)) {
      return installer.path;
    }
  } catch {
    // ignore
  }

  return "ffprobe";
}
