import "server-only";
import { adminServices } from "./firebase-admin";
import { ApiError } from "./api-server";
export async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new ApiError(401, "Sign in to continue.");
  const { auth } = adminServices();
  let token;
  try { token = await auth.verifyIdToken(authorization.slice(7), true); }
  catch { throw new ApiError(401, "Your session is invalid or expired. Please sign in again."); }
  if (!process.env.ADMIN_UID || token.uid !== process.env.ADMIN_UID) throw new ApiError(403, "This account is not the administrator.");
  return token.uid;
}
