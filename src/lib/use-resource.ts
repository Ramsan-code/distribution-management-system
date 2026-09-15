"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api-client";
export function useResource<T>(path: string) {
  const [state, setState] = useState<{ path: string; data: T | null; error: string; loading: boolean }>({ path, data: null, error: "", loading: true });
  const request = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const data = await api<T>(path, { signal: controller.signal });
      if (!controller.signal.aborted) setState({ path, data, error: "", loading: false });
    } catch (error) {
      if (!controller.signal.aborted) setState(previous => ({ path, data: previous.path === path ? previous.data : null, error: errorMessage(error), loading: false }));
    }
  }, [path]);
  useEffect(() => {
    const timer = setTimeout(() => { void reload(); }, 0);
    const activeRequest = request;
    return () => { clearTimeout(timer); activeRequest.current?.abort(); };
  }, [reload]);
  return { data: state.path === path ? state.data : null, error: state.path === path ? state.error : "", loading: state.path !== path || state.loading, reload };
}
