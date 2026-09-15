import { adminServices } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { body, handle, json } from "@/lib/api-server";
import { shopSchema } from "@/lib/validations";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const snapshot = await adminServices().db.collection("shops").orderBy("name").get();
    return json({ shops: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    const uid = await requireAdmin(request);
    const input = await body(request, shopSchema);
    const data = { ...input, active: true, deliveredCents: 0, paidCents: 0, outstandingCents: 0, createdAt: new Date().toISOString(), createdBy: uid };
    const ref = await adminServices().db.collection("shops").add(data);
    return json({ shop: { ...data, id: ref.id } }, 201);
  });
}
