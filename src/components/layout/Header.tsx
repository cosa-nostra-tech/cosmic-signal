import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Header() {
  // TODO: Replace with real auth check via Supabase server client
  const isAuthenticated = false;

  return (
    <header className="border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Cosmic Signal
        </Link>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <form action="/api/auth" method="POST">
              <Button variant="ghost" type="submit" name="action" value="logout">
                Sign out
              </Button>
            </form>
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