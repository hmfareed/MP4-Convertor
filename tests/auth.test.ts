import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { connectDB } from "../src/lib/db/connection";
import { User } from "../src/lib/db/models/User";
import { createSessionToken, verifySessionToken } from "../src/lib/auth/session";
import bcrypt from "bcryptjs";

describe("Phase 4 — User Authentication & Session System", () => {
  const testEmail = `test_user_${Date.now()}@example.com`;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteOne({ email: testEmail });
  });

  it("hashes passwords securely with bcrypt", async () => {
    const rawPassword = "SuperSecurePassword123!";
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    expect(hash).not.toBe(rawPassword);
    expect(await bcrypt.compare(rawPassword, hash)).toBe(true);
    expect(await bcrypt.compare("WrongPassword", hash)).toBe(false);
  });

  it("signs and verifies JWT session tokens with jose", async () => {
    const payload = {
      userId: "usr_mock_12345",
      email: "user@example.com",
      role: "user" as const,
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const decoded = await verifySessionToken(token);
    expect(decoded).toBeDefined();
    expect(decoded!.userId).toBe(payload.userId);
    expect(decoded!.email).toBe(payload.email);
    expect(decoded!.role).toBe("user");
  });

  it("creates user in MongoDB and prevents duplicate emails", async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Password123!", salt);

    const user = await User.create({
      name: "Test Explorer",
      email: testEmail,
      passwordHash,
      role: "user",
      status: "active",
    });

    expect(user._id).toBeDefined();
    expect(user.name).toBe("Test Explorer");
    expect(user.email).toBe(testEmail);

    // Test duplicate registration error
    let duplicateFailed = false;
    try {
      await User.create({
        name: "Duplicate User",
        email: testEmail,
        passwordHash,
      });
    } catch {
      duplicateFailed = true;
    }

    expect(duplicateFailed).toBe(true);
  });
});
