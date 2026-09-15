import assert from "node:assert/strict";
import { test } from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { createDelivery, recordPayment, setDeliveryStatus } from "../src/lib/ledger";
import { deliverySchema, paymentSchema, shopSchema, shopUpdateSchema, idSchema } from "../src/lib/validations";
import { checkedAdd, parseMoney } from "../src/lib/money";

// A serialized, rollback-capable transaction double exercises application invariants.
// This does not substitute for testing the deployed Firestore service and rules.
function database() {
  let records = new Map<string, Record<string, unknown>>();
  let queue = Promise.resolve();
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ({ id, path: `${name}/${id}` }) }),
    runTransaction: <T>(action: (tx: unknown) => Promise<T>): Promise<T> => {
      const result = queue.then(async () => {
        const working = structuredClone(records);
        let writing = false;
        const tx = {
          get: async (ref: { path: string }) => {
            assert.equal(writing, false, "Firestore requires reads before writes");
            return { exists: working.has(ref.path), data: () => structuredClone(working.get(ref.path)) };
          },
          create: (ref: { path: string }, data: Record<string, unknown>) => {
            writing = true; assert.equal(working.has(ref.path), false); working.set(ref.path, structuredClone(data));
          },
          update: (ref: { path: string }, data: Record<string, unknown>) => {
            writing = true; assert.equal(working.has(ref.path), true); working.set(ref.path, { ...working.get(ref.path), ...data });
          },
        };
        const value = await action(tx); records = working; return value;
      });
      queue = result.then(() => {}, () => {});
      return result;
    },
  };
  records.set("shops/shop1", { name: "Test shop", active: true, deliveredCents: 0, paidCents: 0, outstandingCents: 0 });
  return {
    db: db as unknown as Firestore,
    get: (path: string) => records.get(path)!,
    set: (path: string, values: Record<string, unknown>) => records.set(path, { ...records.get(path), ...values }),
    count: (collection: string) => [...records.keys()].filter(key => key.startsWith(`${collection}/`)).length,
  };
}
const delivery = { shopId: "shop1", description: "Invoice 1", amountCents: 10000, deliveryDate: "2026-09-15", idempotencyKey: "b07b70ef-8b1b-4cd0-b5c5-5415fcf63841" };
const payment = { shopId: "shop1", amountCents: 2500, note: "Cash", reference: "RCPT-1", idempotencyKey: "bc1f11c7-bc65-4f19-a6a5-24f274d75ba1" };
async function delivered() {
  const state = database();
  await createDelivery(state.db, delivery, "admin");
  await setDeliveryStatus(state.db, delivery.idempotencyKey, "delivered", "admin");
  return state;
}
test("money conversion uses exact minor units and rejects invalid inputs", () => {
  assert.equal(parseMoney("0.29"), 29);
  assert.equal(parseMoney("1000000"), 100000000);
  for (const invalid of ["", "0", "-1", "0.001", "1e3", "NaN", "Infinity", "1,000", "1000000.01"]) assert.throws(() => parseMoney(invalid));
  assert.throws(() => checkedAdd(Number.MAX_SAFE_INTEGER, 1));
  assert.throws(() => checkedAdd(0, -1));
});
test("validation rejects extra fields, invalid IDs, dates and payment amounts", () => {
  assert.equal(shopSchema.safeParse({ name: " ", phone: "", address: "" }).success, false);
  assert.equal(shopUpdateSchema.safeParse({ outstandingCents: 0 }).success, false);
  assert.equal(shopUpdateSchema.safeParse({}).success, false);
  assert.equal(idSchema.safeParse("../shops").success, false);
  assert.equal(deliverySchema.safeParse({ ...delivery, deliveryDate: "2026-02-30" }).success, false);
  for (const amountCents of [0, -1, 0.5, "100", 100000001]) assert.equal(paymentSchema.safeParse({ ...payment, amountCents }).success, false);
  assert.equal(paymentSchema.parse({ ...payment, reference: " rcpt-1 " }).reference, "RCPT-1");
  assert.equal(paymentSchema.safeParse({ ...payment, createdBy: "spoofed" }).success, false);
});
test("pending deliveries leave balances unchanged and duplicate creates are idempotent", async () => {
  const state = database();
  await Promise.all([createDelivery(state.db, delivery, "admin"), createDelivery(state.db, delivery, "admin")]);
  assert.equal(state.count("deliveries"), 1);
  assert.equal(state.get("shops/shop1").outstandingCents, 0);
  await assert.rejects(createDelivery(state.db, { ...delivery, amountCents: 9000 }, "admin"), /different delivery/);
});
test("delivery completion adds debt once under repeated calls and cannot be reversed", async () => {
  const state = database(); await createDelivery(state.db, delivery, "admin");
  await Promise.all(Array.from({ length: 5 }, () => setDeliveryStatus(state.db, delivery.idempotencyKey, "delivered", "admin")));
  assert.equal(state.get("shops/shop1").outstandingCents, 10000);
  assert.equal(state.get("shops/shop1").deliveredCents, 10000);
  await assert.rejects(setDeliveryStatus(state.db, delivery.idempotencyKey, "pending", "admin"), /cannot be reverted/);
});
test("payments reduce debt atomically and retries return the original record", async () => {
  const state = await delivered();
  const results = await Promise.all(Array.from({ length: 5 }, () => recordPayment(state.db, payment, "admin")));
  assert.ok(results.every(row => row.id === payment.idempotencyKey));
  assert.equal(state.count("payments"), 1);
  assert.equal(state.count("paymentReferences"), 1);
  assert.equal(state.get("shops/shop1").paidCents, 2500);
  assert.equal(state.get("shops/shop1").outstandingCents, 7500);
});
test("duplicate receipt with a new request ID and changed payload retries are rejected", async () => {
  const state = await delivered(); await recordPayment(state.db, payment, "admin");
  await assert.rejects(recordPayment(state.db, { ...payment, idempotencyKey: crypto.randomUUID() }, "admin"), /already been recorded/);
  await assert.rejects(recordPayment(state.db, { ...payment, amountCents: 5000 }, "admin"), /different payment/);
  assert.equal(state.get("shops/shop1").outstandingCents, 7500);
});
test("concurrent payments cannot overdraw a balance; rejected transactions leave no receipt", async () => {
  const state = await delivered();
  const results = await Promise.allSettled([
    recordPayment(state.db, { ...payment, amountCents: 7500 }, "admin"),
    recordPayment(state.db, { ...payment, amountCents: 7500, reference: "RCPT-2", idempotencyKey: crypto.randomUUID() }, "admin"),
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(state.count("payments"), 1); assert.equal(state.count("paymentReferences"), 1);
  assert.equal(state.get("shops/shop1").outstandingCents, 2500);
});
test("a fully paid shop accepts idempotent replay but rejects another payment", async () => {
  const state = await delivered();
  const full = { ...payment, amountCents: 10000 };
  await recordPayment(state.db, full, "admin"); await recordPayment(state.db, full, "admin");
  assert.equal(state.get("shops/shop1").outstandingCents, 0);
  await assert.rejects(recordPayment(state.db, { ...payment, reference: "RCPT-2", idempotencyKey: crypto.randomUUID() }, "admin"), /exceeds/);
});
test("archived shops reject new deliveries but can collect their remaining balance", async () => {
  const state = await delivered(); state.set("shops/shop1", { active: false });
  await assert.rejects(createDelivery(state.db, { ...delivery, idempotencyKey: crypto.randomUUID() }, "admin"), /Reactivate/);
  await recordPayment(state.db, payment, "admin");
  assert.equal(state.get("shops/shop1").outstandingCents, 7500);
});
test("missing records fail without writing any ledger entries", async () => {
  const state = database();
  await assert.rejects(createDelivery(state.db, { ...delivery, shopId: "missing" }, "admin"), /not found/);
  await assert.rejects(recordPayment(state.db, { ...payment, shopId: "missing" }, "admin"), /not found/);
  await assert.rejects(setDeliveryStatus(state.db, "missing", "delivered", "admin"), /not found/);
  assert.equal(state.count("payments"), 0); assert.equal(state.count("deliveries"), 0);
});
