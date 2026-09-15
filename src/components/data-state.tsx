import { Button } from "./ui/button";
export function DataState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (error) return <div role="alert" className="panel mb-5 border-red-200"><p className="error mb-3">{error}</p><Button variant="outline" onClick={retry}>Retry</Button></div>;
  if (loading) return <p role="status" className="py-8 text-slate-500">Loading records…</p>;
  return null;
}
