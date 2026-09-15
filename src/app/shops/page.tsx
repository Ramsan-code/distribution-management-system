"use client";
import Link from "next/link";
import { useState } from "react";
import { useResource } from "@/lib/use-resource";
import { money } from "@/lib/money";
import type { Shop } from "@/types";
import ShopForm from "@/components/shop-form";
import { DataState } from "@/components/data-state";
import { Input } from "@/components/ui/input";
export default function ShopsPage() {
  const { data, loading, error, reload } = useResource<{ shops: Shop[] }>("/api/shops");
  const [search, setSearch] = useState("");
  const shops = (data?.shops || []).filter(shop => `${shop.name} ${shop.phone} ${shop.address}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="shell"><div className="page-heading"><div><p className="eyebrow">CUSTOMERS</p><h1>Shops</h1><p className="subtitle">Manage shop details and keep track of every balance.</p></div></div>
    <DataState loading={loading} error={error} retry={reload} />
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]"><section className="panel"><label className="field mb-5">Find a shop<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, or address" /></label>
    {data && (shops.length ? <div className="divide-y divide-slate-100">{shops.map(shop => <Link key={shop.id} href={`/shops/${shop.id}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-slate-50"><div><h2 className="text-base">{shop.name} {!shop.active && <span className="badge">Archived</span>}</h2><p className="mt-1 text-sm text-slate-500">{shop.phone || "No phone"} · {shop.address || "No address"}</p></div><div className="text-right"><p className="font-semibold">{money(shop.outstandingCents)}</p><p className="text-xs text-slate-500">outstanding →</p></div></Link>)}</div> : <p className="empty">{search ? "No shops match your search." : "No shops yet. Add your first shop using the form."}</p>)}
    </section><section className="panel"><h2 className="mb-5">Add a shop</h2><ShopForm onSaved={reload} /></section></div>
  </main>;
}
