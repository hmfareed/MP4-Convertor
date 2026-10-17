import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { createSessionToken, claimGuestConversions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit/redis-limiter";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Please provide a valid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit({
      key: `auth_register:${ip}`,
      limit: 5,
      windowSec: 600,
    });

    if (!rateCheck.allowed) {
      return rateLimitExceededResponse(rateCheck.retryAfterSec);
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_FAILED",
        parsed.error.errors[0]?.message || "Invalid registration fields.",
        400
      );
    }

    const { name, email, password } = parsed.data;

    // Check existing email
    const existing = await User.findOne({ email });
    if (existing) {
      return errorResponse(
        "EMAIL_TAKEN",
        "An account with this email address already exists.",
        409
      );
    }

    // Salt and hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "user",
      status: "active",
      lastLoginAt: new Date(),
    });

    // Claim guest session jobs
    await claimGuestConversions(user._id.toString());

    // Generate JWT token
    const token = await createSessionToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        defaultBitrate: user.defaultBitrate,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Register error:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred during registration.",
      500
    );
  }
}
