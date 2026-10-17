import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { env } from "@/lib/config/env";
import crypto from "crypto";

export interface StorageService {
  put(key: string, data: Buffer | Uint8Array | NodeJS.ReadableStream): Promise<void>;
  get(key: string): Promise<Buffer>;
  getStream(key: string): NodeJS.ReadableStream;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getPath(key: string): string;
}

export class LocalStorageService implements StorageService {
  private baseDir: string;

  constructor(baseDir: string = env.STORAGE_LOCAL_PATH) {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public getPath(key: string): string {
    // Sanitize key to prevent path traversal
    const safeKey = path.basename(key);
    const resolved = path.resolve(this.baseDir, safeKey);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error("Invalid storage key: path traversal detected");
    }
    return resolved;
  }

  async put(key: string, data: Buffer | Uint8Array | NodeJS.ReadableStream): Promise<void> {
    const targetPath = this.getPath(key);
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      await fs.promises.writeFile(targetPath, data);
    } else {
      const writeStream = fs.createWriteStream(targetPath);
      await pipeline(data, writeStream);
    }
  }

  async get(key: string): Promise<Buffer> {
    const targetPath = this.getPath(key);
    return await fs.promises.readFile(targetPath);
  }

  getStream(key: string): NodeJS.ReadableStream {
    const targetPath = this.getPath(key);
    return fs.createReadStream(targetPath);
  }

  async delete(key: string): Promise<void> {
    const targetPath = this.getPath(key);
    try {
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
    } catch (err) {
      console.warn(`Failed to delete storage file ${targetPath}:`, err);
    }
  }

  async exists(key: string): Promise<boolean> {
    const targetPath = this.getPath(key);
    return fs.existsSync(targetPath);
  }
}

export function generateStorageKey(prefix = "file", extension = ""): string {
  const randomId = crypto.randomUUID();
  const ext = extension ? (extension.startsWith(".") ? extension : `.${extension}`) : "";
  return `${prefix}_${randomId}${ext}`;
}

// Storage singleton instance
let storageInstance: StorageService | null = null;

export function getStorage(): StorageService {
  if (!storageInstance) {
    storageInstance = new LocalStorageService();
  }
  return storageInstance;
}
