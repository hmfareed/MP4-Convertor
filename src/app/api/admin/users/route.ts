import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { requireAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/admin";
import { errorResponse } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    await requireAdmin();

    const users = await User.find({})
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ users });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return errorResponse("UNAUTHENTICATED", err.message, 401);
    }
    if (err instanceof ForbiddenError) {
      return errorResponse("FORBIDDEN", err.message, 403);
    }
    console.error("Admin users GET error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to load users.", 500);
  }
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const adminUser = await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", "Invalid update payload.", 400);
    }

    const { userId, status, role } = parsed.data;

    // Prevent admin from demoting or suspending self
    if (userId === adminUser._id.toString() && (status === "suspended" || role === "user")) {
      return errorResponse("FORBIDDEN", "You cannot demote or suspend your own administrator account.", 403);
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (role) updates.role = role;

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { returnDocument: "after" }).select("-passwordHash");

    if (!updatedUser) {
      return errorResponse("NOT_FOUND", "User not found.", 404);
    }

    return NextResponse.json({ user: updatedUser });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return errorResponse("UNAUTHENTICATED", err.message, 401);
    }
    if (err instanceof ForbiddenError) {
      return errorResponse("FORBIDDEN", err.message, 403);
    }
    console.error("Admin users PATCH error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to update user.", 500);
  }
}
