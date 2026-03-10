"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Intercetta AuthApiError "Invalid Refresh Token" (token scaduto/revocato)
 * e fa signOut per pulire la sessione invalida.
 */
export function AuthErrorHandler() {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      if (!err) return;
      const msg = String(err?.message ?? "").toLowerCase();
      const isAuthRefreshError =
        err?.name === "AuthApiError" ||
        msg.includes("invalid refresh token") ||
        msg.includes("refresh token not found");

      if (isAuthRefreshError) {
        event.preventDefault();
        event.stopPropagation();
        supabase.auth.signOut().finally(() => {
          router.refresh();
        });
      }
    };

    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, [router]);

  return null;
}
