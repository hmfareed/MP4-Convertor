import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { User } from "@/lib/db/models/User";
import { errorResponse } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSettingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50).optional(),
  defaultFormat: z.enum(["mp3", "wav", "flac", "aac", "ogg", "opus"]).optional(),
  defaultBitrate: z.union([
    z.literal(96),
    z.literal(128),
    z.literal(192),
    z.literal(256),
    z.literal(320),
  ]).optional(),
  autoDownload: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return errorResponse("UNAUTHORIZED", "Authentication required.", 401);
    }

    const body = await req.json().catch(() => null);
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", parsed.error.errors[0]?.message || "Invalid settings.", 400);
    }

    const updates = parsed.data;
    const user = await User.findById(sessionUser._id);
    if (!user) {
      return errorResponse("NOT_FOUND", "User not found.", 404);
    }

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.defaultFormat !== undefined) user.defaultFormat = updates.defaultFormat;
    if (updates.defaultBitrate !== undefined) user.defaultBitrate = updates.defaultBitrate;
    if (updates.autoDownload !== undefined) user.autoDownload = updates.autoDownload;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        defaultBitrate: user.defaultBitrate,
        defaultFormat: user.defaultFormat,
        autoDownload: user.autoDownload,
      },
    });
  } catch (err) {
    console.error("Update settings error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to update settings.", 500);
  }
}
