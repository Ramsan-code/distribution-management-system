"use client";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { parseMoney } from "@/lib/money";
import { deliverySchema } from "@/lib/validations";
import type { Shop } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export default function DeliveryForm({ shops, shopId, onSaved }: { shops: Shop[]; shopId?: string; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef({ signature: "", key: "" });
  const submitting = useRef(false);
  const active = shops.filter(shop => shop.active);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const form = event.currentTarget; const values = new FormData(form);
    try {
      const data = { shopId: String(values.get("shopId")), description: String(values.get("description")), amountCents: parseMoney(String(values.get("amount"))), deliveryDate: String(values.get("deliveryDate")) };
      const signature = JSON.stringify(data);
      if (request.current.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
      const parsed = deliverySchema.parse({ ...data, idempotencyKey: request.current.key });
      submitting.current = true; setBusy(true); setError("");
      await api("/api/deliveries", { method: "POST", body: JSON.stringify(parsed) });
      request.current = { signature: "", key: "" }; form.reset(); toast.success("Pending delivery added"); onSaved();
    } catch (error) { setError(errorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <form onSubmit={submit}><fieldset disabled={busy || !active.length} className="space-y-4">
    <label className="field">Shop<select name="shopId" defaultValue={shopId || ""} required className="select"><option value="" disabled>Select a shop</option>{active.map(shop => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></label>
    <label className="field">Delivery description<Input name="description" required maxLength={500} placeholder="Products or invoice details" /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="field">Amount (LKR)<Input name="amount" inputMode="decimal" required placeholder="0.00" /></label><label className="field">Delivery date<Input name="deliveryDate" type="date" required /></label></div>
    {error && <p role="alert" className="error">{error}</p>}
    <Button type="submit">{busy ? "Saving…" : "Add pending delivery"}</Button>
  </fieldset>{!active.length && <p className="mt-3 text-sm text-slate-500">Add or reactivate a shop to create deliveries.</p>}</form>;
}
