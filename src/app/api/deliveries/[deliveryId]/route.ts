import { adminServices } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { ApiError, body, handle, json } from "@/lib/api-server";
import { deliveryStatusSchema, idSchema } from "@/lib/validations";
import { setDeliveryStatus } from "@/lib/ledger";
export const runtime = "nodejs";
type Context = { params: Promise<{ deliveryId: string }> };
export async function GET(request: Request, context: Context) {
  return handle(async () => {
    await requireAdmin(request);
    const id = idSchema.parse((await context.params).deliveryId);
    const doc = await adminServices().db.collection("deliveries").doc(id).get();
    if (!doc.exists) throw new ApiError(404, "Delivery not found.");
    return json({ delivery: { ...doc.data(), id } });
  });
}
export async function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const uid = await requireAdmin(request);
    const id = idSchema.parse((await context.params).deliveryId);
    const { status } = await body(request, deliveryStatusSchema);
    return json({ delivery: await setDeliveryStatus(adminServices().db, id, status, uid) });
  });
}
