import { connectDB } from "../src/lib/db/connection";
import { User } from "../src/lib/db/models/User";

async function promoteAdmin() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: bun run scripts/promote-admin.ts <email>");
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`User with email '${email}' not found. Please register this account first.`);
    process.exit(1);
  }

  user.role = "admin";
  await user.save();

  console.log(`Successfully promoted user '${user.name}' (${user.email}) to role: admin.`);
  process.exit(0);
}

promoteAdmin().catch((err) => {
  console.error("Failed to promote user:", err);
  process.exit(1);
});
