import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Returns the session if the caller is a logged-in admin, otherwise null. */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).isAdmin) return null;
  return session;
}
