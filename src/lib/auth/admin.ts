import { getCurrentUser } from "@/lib/auth/session";
import { IUser } from "@/lib/db/models/User";

export class ForbiddenError extends Error {
  public code = "FORBIDDEN";
  public status = 403;
  constructor(message = "Administrative privileges required.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  public code = "UNAUTHENTICATED";
  public status = 401;
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireAdmin(): Promise<IUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.role !== "admin") {
    throw new ForbiddenError();
  }
  return user;
}
