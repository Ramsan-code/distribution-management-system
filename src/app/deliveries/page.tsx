"use client";
import { useState } from "react";
import { useResource } from "@/lib/use-resource";
import type { Delivery, Shop } from "@/types";
import DeliveryForm from "@/components/delivery-form";
import DeliveryList from "@/components/delivery-list";
import { DataState } from "@/components/data-state";
export default function DeliveriesPage() {
  const deliveries = useResource<{ deliveries: Delivery[] }>("/api/deliveries");
  const shops = useResource<{ shops: Shop[] }>("/api/shops");
  const [filter, setFilter] = useState("pending");
  const reload = () => { void deliveries.reload(); void shops.reload(); };
  const rows = (deliveries.data?.deliveries || []).filter(row => filter === "all" || row.status === filter);
  return <main className="shell"><div className="page-heading"><div><p className="eyebrow">DISTRIBUTION</p><h1>Deliveries</h1><p className="subtitle">Plan deliveries, then mark them complete when goods reach the shop.</p></div></div>
    <DataState loading={deliveries.loading || shops.loading} error={deliveries.error || shops.error} retry={reload} />
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]"><section className="panel"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2>Delivery register</h2><select aria-label="Filter delivery status" className="select w-auto" value={filter} onChange={e => setFilter(e.target.value)}><option value="pending">Pending</option><option value="delivered">Delivered</option><option value="all">All deliveries</option></select></div>
      {deliveries.data && <DeliveryList deliveries={rows} shops={shops.data?.shops || []} onChanged={reload} />}
    </section><section className="panel"><h2 className="mb-5">New delivery</h2><DeliveryForm shops={shops.data?.shops || []} onSaved={reload} /></section></div>
  </main>;
}
