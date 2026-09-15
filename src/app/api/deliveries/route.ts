import { adminServices } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { body, handle, json } from "@/lib/api-server";
import { deliverySchema } from "@/lib/validations";
import { createDelivery } from "@/lib/ledger";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const snapshot = await adminServices().db.collection("deliveries").orderBy("createdAt", "desc").get();
    return json({ deliveries: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    const uid = await requireAdmin(request);
    const input = await body(request, deliverySchema);
    return json({ delivery: await createDelivery(adminServices().db, input, uid) }, 201);
  });
}
