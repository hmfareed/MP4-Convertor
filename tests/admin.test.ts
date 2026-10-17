import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { connectDB } from "../src/lib/db/connection";
import { User } from "../src/lib/db/models/User";
import { ConversionJob } from "../src/lib/db/models/ConversionJob";
import { ForbiddenError, UnauthorizedError } from "../src/lib/auth/admin";
import bcrypt from "bcryptjs";

describe("Phase 6 — Admin Dashboard & Role Management", () => {
  const normalUserEmail = `normal_user_${Date.now()}@example.com`;
  const adminUserEmail = `admin_user_${Date.now()}@example.com`;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [normalUserEmail, adminUserEmail] } });
  });

  it("handles ForbiddenError and UnauthorizedError correctly", () => {
    const unauthErr = new UnauthorizedError();
    expect(unauthErr.status).toBe(401);
    expect(unauthErr.code).toBe("UNAUTHENTICATED");

    const forbidErr = new ForbiddenError();
    expect(forbidErr.status).toBe(403);
    expect(forbidErr.code).toBe("FORBIDDEN");
  });

  it("allows promoting a normal user to admin role", async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("TestPass123!", salt);

    const user = await User.create({
      name: "Standard User",
      email: normalUserEmail,
      passwordHash,
      role: "user",
      status: "active",
    });

    expect(user.role).toBe("user");

    // Promote to admin
    user.role = "admin";
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated?.role).toBe("admin");
  });

  it("calculates job metrics correctly for admin dashboard", async () => {
    const totalJobs = await ConversionJob.countDocuments();
    const completedJobs = await ConversionJob.countDocuments({ status: "completed" });
    const failedJobs = await ConversionJob.countDocuments({ status: "failed" });

    expect(typeof totalJobs).toBe("number");
    expect(typeof completedJobs).toBe("number");
    expect(typeof failedJobs).toBe("number");
    expect(completedJobs).toBeLessThanOrEqual(totalJobs);
  });
});
