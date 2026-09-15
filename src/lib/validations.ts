import { z } from "zod";
import { MAX_AMOUNT_CENTS } from "./money";
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "Invalid record ID");
const amount = z.number().int().positive().max(MAX_AMOUNT_CENTS);
const date = z.iso.date();
export const shopSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, "Invalid phone number"),
  address: z.string().trim().max(500),
}).strict();
export const shopUpdateSchema = shopSchema.extend({ active: z.boolean() }).partial().refine(v => Object.keys(v).length > 0, "No changes supplied");
export const deliverySchema = z.object({
  shopId: idSchema, description: z.string().trim().min(1).max(500),
  amountCents: amount, deliveryDate: date, idempotencyKey: z.uuid(),
}).strict();
export const deliveryStatusSchema = z.object({ status: z.enum(["pending", "delivered"]) }).strict();
export const paymentSchema = z.object({
  shopId: idSchema, amountCents: amount, note: z.string().trim().max(500),
  reference: z.string().trim().min(1).max(100).transform(v => v.toUpperCase()),
  idempotencyKey: z.uuid(),
}).strict();
