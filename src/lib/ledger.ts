import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import type { z } from "zod";
import type { deliverySchema, paymentSchema } from "./validations";
import { checkedAdd } from "./money";
import type { Delivery, Payment, Shop } from "../types";

export class LedgerError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const conflict = (message: string): never => { throw new LedgerError(409, message); };
export async function createDelivery(db: Firestore, input: z.infer<typeof deliverySchema>, uid: string) {
  const { idempotencyKey, ...data } = input;
  const ref = db.collection("deliveries").doc(idempotencyKey);
  const shopRef = db.collection("shops").doc(data.shopId);
  return db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const saved = existing.data()!;
      if (saved.shopId !== data.shopId || saved.description !== data.description || saved.amountCents !== data.amountCents || saved.deliveryDate !== data.deliveryDate) conflict("This request ID was already used for a different delivery.");
      return { id: ref.id, ...saved } as Delivery;
    }
    const shop = await tx.get(shopRef);
    if (!shop.exists) throw new LedgerError(404, "Shop not found.");
    if (!shop.data()!.active) conflict("Reactivate this shop before adding deliveries.");
    const delivery = { ...data, status: "pending" as const, createdAt: new Date().toISOString(), deliveredAt: null, createdBy: uid };
    tx.create(ref, delivery);
    return { id: ref.id, ...delivery };
  });
}
export async function setDeliveryStatus(db: Firestore, id: string, status: "pending" | "delivered", uid: string) {
  const ref = db.collection("deliveries").doc(id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new LedgerError(404, "Delivery not found.");
    const delivery = snapshot.data() as Omit<Delivery, "id">;
    if (delivery.status === status) return { id, ...delivery };
    if (delivery.status === "delivered") conflict("Delivered entries cannot be reverted because they are part of the payment ledger.");
    const shopRef = db.collection("shops").doc(delivery.shopId);
    const shopSnapshot = await tx.get(shopRef);
    if (!shopSnapshot.exists) throw new LedgerError(404, "Shop not found.");
    const shop = shopSnapshot.data() as Shop;
    const deliveredAt = new Date().toISOString();
    tx.update(shopRef, {
      deliveredCents: checkedAdd(shop.deliveredCents, delivery.amountCents),
      outstandingCents: checkedAdd(shop.outstandingCents, delivery.amountCents),
    });
    tx.update(ref, { status, deliveredAt, deliveredBy: uid });
    return { id, ...delivery, status, deliveredAt };
  });
}
export async function recordPayment(db: Firestore, input: z.infer<typeof paymentSchema>, uid: string) {
  const { idempotencyKey, ...data } = input;
  const ref = db.collection("payments").doc(idempotencyKey);
  // A receipt reference is unique per shop, even if a client generates a fresh request ID.
  const referenceId = createHash("sha256").update(JSON.stringify([data.shopId, data.reference])).digest("hex");
  const referenceRef = db.collection("paymentReferences").doc(referenceId);
  const shopRef = db.collection("shops").doc(data.shopId);
  return db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const saved = existing.data()!;
      if (saved.shopId !== data.shopId || saved.amountCents !== data.amountCents || saved.note !== data.note || saved.reference !== data.reference) conflict("This request ID was already used for a different payment.");
      return { id: ref.id, ...saved } as Payment;
    }
    const receipt = await tx.get(referenceRef);
    if (receipt.exists) conflict("This receipt reference has already been recorded for this shop.");
    const shopSnapshot = await tx.get(shopRef);
    if (!shopSnapshot.exists) throw new LedgerError(404, "Shop not found.");
    const shop = shopSnapshot.data() as Shop;
    if (data.amountCents > shop.outstandingCents) conflict("Payment exceeds the shop’s outstanding balance.");
    const payment = { ...data, createdAt: new Date().toISOString(), createdBy: uid };
    tx.create(ref, payment);
    tx.create(referenceRef, { paymentId: ref.id });
    tx.update(shopRef, {
      paidCents: checkedAdd(shop.paidCents, data.amountCents),
      outstandingCents: checkedAdd(shop.outstandingCents, -data.amountCents),
    });
    return { id: ref.id, ...payment };
  });
}
