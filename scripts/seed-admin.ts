import { connectDB } from "../src/lib/db/connection";
import { User } from "../src/lib/db/models/User";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const email = (process.argv[2] || "admin@example.com").trim().toLowerCase();
  const password = process.argv[3] || "Admin12345!";
  const name = process.argv[4] || "Administrator";

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    existing.status = "active";
    const salt = await bcrypt.genSalt(10);
    existing.passwordHash = await bcrypt.hash(password, salt);
    await existing.save();
    console.log(`Updated existing user '${email}' to role 'admin' with updated password.`);
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await User.create({
    name,
    email,
    passwordHash,
    role: "admin",
    status: "active",
  });

  console.log(`Successfully created admin account:`);
  console.log(`- Name:     ${admin.name}`);
  console.log(`- Email:    ${admin.email}`);
  console.log(`- Password: ${password}`);
  console.log(`- Role:     ${admin.role}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
