import "server-only";
import { LedgerError } from "./ledger";
import { ZodError, type ZodType } from "zod";
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function body<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const raw = await request.text();
  if (raw.length > 16_384) throw new ApiError(413, "Request is too large.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new ApiError(400, "Invalid JSON body."); }
  return schema.parse(value);
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export async function handle(action: () => Promise<Response>) {
  try { return await action(); }
  catch (error) {
    if (error instanceof ApiError || error instanceof LedgerError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") }, 400);
    if (error instanceof Error && error.message === "FIREBASE_SETUP_REQUIRED") return json({ error: "Server Firebase setup is incomplete. Follow the README setup steps." }, 503);
    return json({ error: "The request could not be completed. Please retry." }, 500);
  }
}
