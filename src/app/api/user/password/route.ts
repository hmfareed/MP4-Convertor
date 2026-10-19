import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { User } from "@/lib/db/models/User";
import { errorResponse } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return errorResponse("UNAUTHORIZED", "Authentication required.", 401);
    }

    const body = await req.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", parsed.error.errors[0]?.message || "Invalid input.", 400);
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = await User.findById(sessionUser._id);
    if (!user) {
      return errorResponse("NOT_FOUND", "User account not found.", 404);
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return errorResponse("INVALID_CREDENTIALS", "Incorrect current password.", 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error("Change password error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to update password.", 500);
  }
}
