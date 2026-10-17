import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";
import { User, IUser } from "@/lib/db/models/User";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { Upload } from "@/lib/db/models/Upload";
import { connectDB } from "@/lib/db/connection";
import crypto from "crypto";

const SECRET_KEY = new TextEncoder().encode(env.SESSION_SECRET);
export const SESSION_COOKIE_NAME = "mp4_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<IUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user || user.status !== "active") return null;

    return user;
  } catch {
    return null;
  }
}

/**
 * Claims any guest conversions associated with the active guest cookie
 * and links them directly to the authenticated user.
 */
export async function claimGuestConversions(userId: string): Promise<number> {
  try {
    const cookieStore = cookies();
    const guestToken = cookieStore.get("mp4_guest_token")?.value;
    if (!guestToken) return 0;

    const guestTokenHash = crypto.createHash("sha256").update(guestToken).digest("hex");

    await connectDB();

    // Reassign uploads and conversion jobs to user
    await Upload.updateMany(
      { ownerId: guestTokenHash },
      { $set: { ownerType: "user", ownerId: userId } }
    );

    const result = await ConversionJob.updateMany(
      { ownerId: guestTokenHash },
      { $set: { ownerType: "user", ownerId: userId } }
    );

    return result.modifiedCount || 0;
  } catch (err) {
    console.warn("Failed to claim guest conversions:", err);
    return 0;
  }
}
