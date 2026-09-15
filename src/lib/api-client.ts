"use client";
import { auth } from "./firebase-client";
export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new RequestError(401, "Please sign in.");
  const token = await user.getIdToken();
  const response = await fetch(path, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${token}` } });
  const result = await response.json();
  if (!response.ok) throw new RequestError(response.status, result.error || "Request failed.");
  return result as T;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please retry."; }
