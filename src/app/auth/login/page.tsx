"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { Globe } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Container className="max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Cosmic Signal
            </h1>
            <p className="text-neutral-500 text-sm">
              Thematic investment research
            </p>
          </div>

          <div className="space-y-4">
            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-3"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <Globe size={18} />
              Continue with Google
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-neutral-400">
                  or
                </span>
              </div>
            </div>

            {sent ? (
              <div className="text-center py-4">
                <p className="text-sm text-neutral-600">
                  Check your email for a sign-in link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  required
                />
                <Button className="w-full" disabled={loading}>
                  Send magic link
                </Button>
              </form>
            )}
          </div>
        </Container>
      </div>
    </>
  );
}
