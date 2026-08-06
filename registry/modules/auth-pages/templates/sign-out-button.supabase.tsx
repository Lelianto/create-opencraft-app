"use client";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sign-out for Supabase.
 *
 * Clears the session in the browser and refreshes the route tree so server
 * components re-resolve `getCurrentUser()`. No server round-trip is needed for
 * the sign-out itself — the access token simply stops being usable.
 */
export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={signOut}>
      <LogOut className="size-4" aria-hidden />
      Sign out
    </Button>
  );
}
