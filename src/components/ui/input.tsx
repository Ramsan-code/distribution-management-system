import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn("w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base shadow-xs outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:opacity-60", className)} {...props} />;
}
