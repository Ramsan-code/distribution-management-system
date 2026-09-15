import { adminServices } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { body, handle, json } from "@/lib/api-server";
import { paymentSchema } from "@/lib/validations";
import { recordPayment } from "@/lib/ledger";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const snapshot = await adminServices().db.collection("payments").orderBy("createdAt", "desc").get();
    return json({ payments: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    const uid = await requireAdmin(request);
    const input = await body(request, paymentSchema);
    return json({ payment: await recordPayment(adminServices().db, input, uid) }, 201);
  });
}
