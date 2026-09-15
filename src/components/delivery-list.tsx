"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { money } from "@/lib/money";
import type { Delivery, Shop } from "@/types";
import { Button } from "./ui/button";
export default function DeliveryList({ deliveries, shops, onChanged }: { deliveries: Delivery[]; shops: Shop[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const lock = useRef(false);
  async function complete(delivery: Delivery) {
    if (lock.current) return;
    if (!window.confirm(`Mark this delivery as delivered? ${money(delivery.amountCents)} will be added to the shop’s balance. This cannot be undone.`)) return;
    lock.current = true; setBusy(delivery.id);
    try { await api(`/api/deliveries/${delivery.id}`, { method: "PATCH", body: JSON.stringify({ status: "delivered" }) }); toast.success("Delivery completed"); onChanged(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { lock.current = false; setBusy(null); }
  }
  if (!deliveries.length) return <p className="empty">No deliveries to show.</p>;
  return <div className="table-wrap"><table><thead><tr><th>Delivery / shop</th><th>Date</th><th>Amount</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{deliveries.map(delivery => <tr key={delivery.id}>
    <td><p className="max-w-xs whitespace-normal font-medium">{delivery.description}</p><Link href={`/shops/${delivery.shopId}`} className="text-xs text-emerald-800">{shops.find(shop => shop.id === delivery.shopId)?.name || delivery.shopId}</Link></td>
    <td>{delivery.deliveryDate}</td><td>{money(delivery.amountCents)}</td><td><span className={delivery.status === "delivered" ? "badge bg-emerald-50 text-emerald-800" : "badge bg-amber-50 text-amber-800"}>{delivery.status}</span></td>
    <td>{delivery.status === "pending" && <Button variant="outline" disabled={!!busy} onClick={() => complete(delivery)}>{busy === delivery.id ? "Saving…" : "Mark delivered"}</Button>}</td>
  </tr>)}</tbody></table></div>;
}
