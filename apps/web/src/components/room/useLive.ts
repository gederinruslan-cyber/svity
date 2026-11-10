"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";

/**
 * A room view kept live over WebSocket. The server sends a full snapshot for our role on connect
 * and after every change; we reconnect with backoff. `refresh` re-reads over REST (after an action
 * while the socket is down).
 */
export function useLive<T>(livePath: string | null, viewPath: string) {
  const [view, setView] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const refresh = useCallback(() => api<T>(viewPath).then(setView), [viewPath]);

  useEffect(() => {
    if (!livePath) return;
    let stopped = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      const socket = new WebSocket(API_URL.replace(/^http/, "ws") + livePath);
      ws.current = socket;
      socket.onopen = () => {
        retry = 0;
        setConnected(true);
      };
      socket.onmessage = (e) => setView(JSON.parse(e.data as string) as T);
      socket.onclose = () => {
        setConnected(false);
        if (!stopped) timer = setTimeout(connect, Math.min(10_000, 500 * 2 ** retry++));
      };
    };
    api<T>(viewPath)
      .then((v) => setView((cur) => cur ?? v))
      .catch(() => {});
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      ws.current?.close();
    };
  }, [livePath, viewPath]);

  return { view, connected, refresh };
}

/** True while the shared pause (60 s) is running. */
export function usePause(pauseAt: string | null) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!pauseAt) return setActive(false);
    const left = Date.parse(pauseAt) + 60_000 - Date.now();
    setActive(left > 0);
    if (left <= 0) return;
    const id = setTimeout(() => setActive(false), left);
    return () => clearTimeout(id);
  }, [pauseAt]);
  return active;
}
