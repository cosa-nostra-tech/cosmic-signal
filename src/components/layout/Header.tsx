"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const pathname = usePathname();

  const isDark = pathname?.includes("/research") || pathname?.includes("/thematic/");

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

  const textColor = isDark ? "text-white" : "text-neutral-900";
  const borderColor = isDark ? "border-white/10" : "border-neutral-200";
  const subTextColor = isDark ? "text-neutral-400" : "text-neutral-500";

  return (
    <header className={`border-b ${borderColor} relative z-10`}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className={`text-lg font-semibold tracking-tight ${textColor}`}>
          Cosmic Signal
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className={`text-xs ${subTextColor}`}>{user.email}</span>
              <form action="/api/auth" method="POST">
                <Button variant="ghost" type="submit" name="action" value="logout" className={subTextColor}>
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
