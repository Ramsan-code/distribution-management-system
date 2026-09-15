"use client";
import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useResource } from "@/lib/use-resource";
import { api, errorMessage } from "@/lib/api-client";
import { money } from "@/lib/money";
import type { ShopDetail } from "@/types";
import ShopForm from "@/components/shop-form";
import DeliveryForm from "@/components/delivery-form";
import PaymentForm from "@/components/payment-form";
import DeliveryList from "@/components/delivery-list";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
export default function ShopPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params);
  const { data, loading, error, reload } = useResource<ShopDetail>(`/api/shops/${encodeURIComponent(shopId)}`);
  const [busy, setBusy] = useState(false);
  async function toggleActive() {
    if (!data || busy) return;
    setBusy(true);
    try { await api(`/api/shops/${shopId}`, { method: "PATCH", body: JSON.stringify({ active: !data.shop.active }) }); toast.success(data.shop.active ? "Shop archived" : "Shop reactivated"); await reload(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <main className="shell"><Link className="text-sm text-emerald-800" href="/shops">← All shops</Link><DataState loading={loading} error={error} retry={reload} />
    {data && <><div className="page-heading mt-5"><div><p className="eyebrow">SHOP ACCOUNT</p><h1>{data.shop.name}</h1><p className="subtitle">{data.shop.phone || "No phone"} · {data.shop.address || "No address"}</p></div><Button variant="outline" disabled={busy} onClick={toggleActive}>{busy ? "Saving…" : data.shop.active ? "Archive shop" : "Reactivate shop"}</Button></div>
    {!data.shop.active && <p className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">This shop is archived. Existing deliveries can still be completed and payments collected.</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3">{[["Outstanding", data.shop.outstandingCents], ["Delivered", data.shop.deliveredCents], ["Paid", data.shop.paidCents]].map(([label, value]) => <section key={label} className="panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{money(Number(value))}</p></section>)}</div>
    <div className="grid items-start gap-6 lg:grid-cols-2"><section className="panel"><h2 className="mb-5">Record a payment</h2><PaymentForm key={shopId} shop={data.shop} onSaved={reload} /></section><section className="panel"><h2 className="mb-5">New delivery</h2><DeliveryForm shops={[data.shop]} shopId={shopId} onSaved={reload} /></section></div>
    <section className="panel mt-6"><h2 className="mb-5">Delivery history</h2><DeliveryList deliveries={data.deliveries} shops={[data.shop]} onChanged={reload} /></section>
    <section className="panel mt-6"><h2 className="mb-5">Payment history</h2>{!data.payments.length ? <p className="empty">No payments recorded yet.</p> : <div className="table-wrap"><table><thead><tr><th>Recorded</th><th>Receipt</th><th>Note</th><th>Amount</th></tr></thead><tbody>{data.payments.map(payment => <tr key={payment.id}><td>{new Date(payment.createdAt).toLocaleString("en-LK")}</td><td>{payment.reference}</td><td className="max-w-xs whitespace-normal">{payment.note || "—"}</td><td>{money(payment.amountCents)}</td></tr>)}</tbody></table></div>}</section>
    <details className="panel mt-6"><summary className="cursor-pointer font-semibold">Edit shop details</summary><div className="mt-5 max-w-lg"><ShopForm key={JSON.stringify([data.shop.name, data.shop.phone, data.shop.address])} shop={data.shop} onSaved={reload} /></div></details>
    </>}
  </main>;
}
