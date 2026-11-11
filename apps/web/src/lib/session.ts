"use client";

import { useEffect, useState } from "react";
import type { Me } from "@svity/contracts";
import { ApiError, getMe } from "./api";

// The landing is static and the session cookie is httpOnly on the API, so the page asks /v1/me.
// A hint in localStorage paints the right buttons at once; the API call then confirms it.
const HINT = "svity-session";

type Hint = { role: Me["role"] };
export type SessionState = { status: "unknown" } | { status: "out" } | { status: "in"; role: Me["role"] };

export function rememberSession(me: Pick<Me, "role"> | null) {
  try {
    if (me) localStorage.setItem(HINT, JSON.stringify({ role: me.role } satisfies Hint));
    else localStorage.removeItem(HINT);
  } catch {}
}

function readHint(): SessionState {
  try {
    const h = JSON.parse(localStorage.getItem(HINT) ?? "null") as Hint | null;
    return h ? { status: "in", role: h.role } : { status: "out" };
  } catch {
    return { status: "out" };
  }
}

/** Signed in or not, for the landing. Starts "unknown" (static HTML), then hint, then the API. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "unknown" });
  useEffect(() => {
    setState(readHint());
    getMe()
      .then((me) => setState({ status: "in", role: me.role }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setState({ status: "out" });
        // Network errors keep the hint.
      });
  }, []);
  return state;
}
