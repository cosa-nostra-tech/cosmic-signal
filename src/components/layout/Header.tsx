"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function Header() {
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user as { email: string } | null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user as { email: string } | null ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Cosmic Signal
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-neutral-500">{user.email}</span>
              <form action="/api/auth" method="POST">
                <Button variant="ghost" type="submit" name="action" value="logout">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/auth/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
