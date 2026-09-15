"use client";
import Link from "next/link";
import { useResource } from "@/lib/use-resource";
import { money } from "@/lib/money";
import type { Shop } from "@/types";
import { DataState } from "@/components/data-state";
import { Button } from "@/components/ui/button";
export default function DashboardPage() {
  const { data, loading, error, reload } = useResource<{ shops: Shop[] }>("/api/shops");
  const shops = data?.shops || [];
  const totals = shops.reduce((sum, shop) => ({ delivered: sum.delivered + shop.deliveredCents, paid: sum.paid + shop.paidCents, outstanding: sum.outstanding + shop.outstandingCents }), { delivered: 0, paid: 0, outstanding: 0 });
  return <main className="shell"><div className="page-heading"><div><p className="eyebrow">YOUR DISTRIBUTION BUSINESS</p><h1>Overview</h1><p className="subtitle">A clear view of deliveries billed and payments collected.</p></div><Button asChild><Link href="/deliveries">Manage deliveries</Link></Button></div>
    <DataState loading={loading} error={error} retry={reload} />
    {data && <><div className="grid gap-4 sm:grid-cols-3">{[["Total outstanding", totals.outstanding], ["Delivered value", totals.delivered], ["Payments collected", totals.paid]].map(([label, value], index) => <section key={label} className={index === 0 ? "rounded-xl bg-emerald-900 p-6 text-white" : "panel"}><p className={index === 0 ? "text-sm text-emerald-100" : "text-sm text-slate-500"}>{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{money(Number(value))}</p></section>)}</div>
    <section className="panel mt-7"><div className="mb-5 flex items-center justify-between"><h2>Outstanding by shop</h2><Link className="text-sm font-medium text-emerald-800" href="/shops">View all shops →</Link></div>
      {!shops.length ? <p className="empty">No shops yet. <Link href="/shops" className="text-emerald-800 underline">Add your first shop</Link> to get started.</p> : <div className="table-wrap"><table><thead><tr><th>Shop</th><th>Delivered</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>{[...shops].sort((a,b) => b.outstandingCents-a.outstandingCents).map(shop => <tr key={shop.id}><td><Link className="font-medium text-emerald-800" href={`/shops/${shop.id}`}>{shop.name}</Link>{!shop.active && <span className="ml-2 badge">Archived</span>}</td><td>{money(shop.deliveredCents)}</td><td>{money(shop.paidCents)}</td><td className="font-semibold">{money(shop.outstandingCents)}</td></tr>)}</tbody></table></div>}
    </section><p className="mt-4 text-xs text-slate-500">All amounts in LKR. Pending deliveries are excluded. Archived shop balances remain included.</p></>}
  </main>;
}
