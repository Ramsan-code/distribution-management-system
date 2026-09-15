"use client";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { shopSchema } from "@/lib/validations";
import type { Shop } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export default function ShopForm({ shop, onSaved }: { shop?: Shop; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const parsed = shopSchema.safeParse(values);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    submitting.current = true; setBusy(true); setError("");
    try {
      await api(shop ? `/api/shops/${shop.id}` : "/api/shops", { method: shop ? "PATCH" : "POST", body: JSON.stringify(parsed.data) });
      toast.success(shop ? "Shop updated" : "Shop added");
      if (!shop) form.reset();
      onSaved();
    } catch (error) { setError(errorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
    <label className="field">Shop name<Input name="name" defaultValue={shop?.name} required maxLength={120} autoComplete="organization" /></label>
    <label className="field">Phone<Input name="phone" type="tel" defaultValue={shop?.phone} maxLength={30} autoComplete="tel" /></label>
    <label className="field">Address<Input name="address" defaultValue={shop?.address} maxLength={500} autoComplete="street-address" /></label>
    {error && <p role="alert" className="error">{error}</p>}
    <Button type="submit">{busy ? "Saving…" : shop ? "Save changes" : "Add shop"}</Button>
  </fieldset></form>;
}
