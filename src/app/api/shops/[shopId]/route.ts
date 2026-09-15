import type { QuerySnapshot } from "firebase-admin/firestore";
import { adminServices } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { ApiError, body, handle, json } from "@/lib/api-server";
import { idSchema, shopUpdateSchema } from "@/lib/validations";
export const runtime = "nodejs";
type Context = { params: Promise<{ shopId: string }> };
export async function GET(request: Request, context: Context) {
  return handle(async () => {
    await requireAdmin(request);
    const id = idSchema.parse((await context.params).shopId);
    const { db } = adminServices();
    // One transaction gives the balance and history a consistent snapshot.
    return db.runTransaction(async tx => {
      const shop = await tx.get(db.collection("shops").doc(id));
      if (!shop.exists) throw new ApiError(404, "Shop not found.");
      const deliveries = await tx.get(db.collection("deliveries").where("shopId", "==", id));
      const payments = await tx.get(db.collection("payments").where("shopId", "==", id));
      const rows = (snapshot: QuerySnapshot) => snapshot.docs
        .sort((a, b) => String(b.data().createdAt).localeCompare(String(a.data().createdAt)))
        .map(doc => ({ ...doc.data(), id: doc.id }));
      return json({ shop: { ...shop.data(), id }, deliveries: rows(deliveries), payments: rows(payments) });
    });
  });
}
export async function PATCH(request: Request, context: Context) {
  return handle(async () => {
    await requireAdmin(request);
    const id = idSchema.parse((await context.params).shopId);
    const input = await body(request, shopUpdateSchema);
    const { db } = adminServices();
    const ref = db.collection("shops").doc(id);
    return db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new ApiError(404, "Shop not found.");
      tx.update(ref, input);
      return json({ shop: { ...snapshot.data(), ...input, id } });
    });
  });
}
