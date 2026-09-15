import assert from "node:assert/strict";
import { test } from "node:test";
import { Firestore } from "@google-cloud/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, doc, getDoc, setDoc, terminate } from "firebase/firestore";
import { createDelivery, recordPayment, setDeliveryStatus } from "../src/lib/ledger";

test("Firestore emulator: concurrent ledger transactions and deny-all client rules", { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST!;
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/, "Integration tests must use a local emulator");
  const projectId = "demo-routebook";
  const db = new Firestore({ projectId });
  const shopId = `test-${crypto.randomUUID()}`;
  const deliveryId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const shopRef = db.collection("shops").doc(shopId);
  const app = initializeApp({ projectId, apiKey: "demo-key", appId: "demo-app" }, shopId);
  const clientDb = getFirestore(app);
  const [hostname, port] = host.split(":");
  connectFirestoreEmulator(clientDb, hostname, Number(port));
  try {
    await shopRef.set({ name: "Emulator test", active: true, deliveredCents: 0, paidCents: 0, outstandingCents: 0 });
    const delivery = { shopId, description: "Test delivery", amountCents: 10000, deliveryDate: "2026-09-15", idempotencyKey: deliveryId };
    await createDelivery(db, delivery, "test-admin");
    await Promise.all(Array.from({ length: 4 }, () => setDeliveryStatus(db, deliveryId, "delivered", "test-admin")));
    assert.equal((await shopRef.get()).data()!.outstandingCents, 10000);
    const payment = { shopId, reference: "TEST-1", note: "", amountCents: 7000, idempotencyKey: paymentId };
    await Promise.all(Array.from({ length: 4 }, () => recordPayment(db, payment, "test-admin")));
    assert.equal((await shopRef.get()).data()!.outstandingCents, 3000);
    await assert.rejects(recordPayment(db, { ...payment, idempotencyKey: crypto.randomUUID() }, "test-admin"), /already been recorded/);
    await assert.rejects(recordPayment(db, { ...payment, idempotencyKey: crypto.randomUUID(), reference: "TEST-2" }, "test-admin"), /exceeds/);
    await assert.rejects(getDoc(doc(clientDb, "shops", shopId)), { code: "permission-denied" });
    await assert.rejects(setDoc(doc(clientDb, "shops", shopId), { outstandingCents: 0 }), { code: "permission-denied" });
  } finally {
    const references = await db.collection("paymentReferences").where("paymentId", "==", paymentId).get();
    const batch = db.batch();
    batch.delete(shopRef); batch.delete(db.collection("deliveries").doc(deliveryId)); batch.delete(db.collection("payments").doc(paymentId));
    references.docs.forEach(snapshot => batch.delete(snapshot.ref));
    await batch.commit(); await db.terminate(); await terminate(clientDb); await deleteApp(app);
  }
});
