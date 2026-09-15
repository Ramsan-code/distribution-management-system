"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, errorMessage, RequestError } from "@/lib/api-client";
import { money, parseMoney } from "@/lib/money";
import { paymentSchema } from "@/lib/validations";
import type { z } from "zod";
import type { Shop } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
type Pending = z.infer<typeof paymentSchema>;
export default function PaymentForm({ shop, onSaved }: { shop: Shop; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const submitting = useRef(false);
  const storageKey = `routebook-payment-${shop.id}`;
  useEffect(() => {
    // Keep uncertain requests across a reload so retry uses the same payment ID.
    void Promise.resolve().then(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) { const parsed = paymentSchema.safeParse(JSON.parse(raw)); if (parsed.success && parsed.data.shopId === shop.id) setPending(parsed.data); }
      } catch { /* Storage may be unavailable; receipt uniqueness still protects retries. */ }
    });
  }, [storageKey, shop.id]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const form = event.currentTarget;
    try {
      const values = new FormData(form);
      const data = pending || paymentSchema.parse({ shopId: shop.id, amountCents: parseMoney(String(values.get("amount"))), note: String(values.get("note")), reference: String(values.get("reference")), idempotencyKey: crypto.randomUUID() });
      submitting.current = true; setBusy(true); setError(""); setPending(data);
      try { sessionStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* Retry ID stays in memory. */ }
      await api("/api/payments", { method: "POST", body: JSON.stringify(data) });
      setPending(null); try { sessionStorage.removeItem(storageKey); } catch {}
      form.reset(); toast.success("Payment recorded"); onSaved();
    } catch (error) {
      setError(errorMessage(error));
      if (error instanceof RequestError && [400, 403, 404, 409, 413].includes(error.status)) {
        setPending(null); try { sessionStorage.removeItem(storageKey); } catch {}
      }
    } finally { submitting.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4"><p className="text-sm text-slate-500">Outstanding: <strong className="text-slate-900">{money(shop.outstandingCents)}</strong></p>
    {pending && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Confirm payment {pending.reference} for {money(pending.amountCents)} by retrying. The same payment will only be recorded once.</p>}
    <fieldset disabled={busy || !!pending || shop.outstandingCents === 0} className="space-y-4">
      <label className="field">Payment amount (LKR)<Input name="amount" inputMode="decimal" required={!pending} placeholder="0.00" /></label>
      <label className="field">Receipt reference<Input name="reference" required={!pending} maxLength={100} placeholder="Unique receipt or bank reference" /></label>
      <label className="field">Note (optional)<Input name="note" maxLength={500} /></label>
    </fieldset>
    {error && <p role="alert" className="error">{error}</p>}
    <Button type="submit" disabled={busy || (!pending && shop.outstandingCents === 0)}>{busy ? "Recording…" : pending ? "Retry same payment" : "Record payment"}</Button>
  </form>;
}
