import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { createSessionToken, claimGuestConversions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit/redis-limiter";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email("Invalid email").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit({
      key: `auth_login:${ip}`,
      limit: 10,
      windowSec: 300,
    });

    if (!rateCheck.allowed) {
      return rateLimitExceededResponse(rateCheck.retryAfterSec);
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", "Please provide a valid email and password.", 400);
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user || user.status !== "active") {
      return errorResponse("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

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
    console.error("Login error:", err);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred during login.", 500);
  }
}
