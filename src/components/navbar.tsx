"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { logout, useAuth } from "./auth-provider";
import { Button } from "./ui/button";
export default function Navbar() {
  const { user } = useAuth();
  const path = usePathname();
  if (!user || path === "/login") return null;
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-5 py-4">
    <Link href="/dashboard" className="mr-auto text-lg font-bold tracking-tight text-emerald-900">Routebook<span className="ml-2 text-xs font-normal text-slate-500">Distribution</span></Link>
    <nav aria-label="Main navigation" className="flex gap-4 text-sm font-medium">{[["/dashboard", "Overview"], ["/shops", "Shops"], ["/deliveries", "Deliveries"]].map(([href, label]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined} className={path.startsWith(href) ? "text-emerald-800 underline underline-offset-8" : "text-slate-500 hover:text-slate-900"}>{label}</Link>)}</nav>
    <Button variant="outline" onClick={() => logout().catch(() => toast.error("Could not sign out. Please retry."))}>Sign out</Button>
  </div></header>;
}
