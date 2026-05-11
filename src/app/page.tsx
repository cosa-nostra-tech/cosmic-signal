import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import { DemoThematic } from "@/components/demo/DemoThematic";

export default function Home() {
  // TODO: Wire real auth with Supabase server client
  const isAuthenticated = false;

  return (
    <>
      <Header />
      <Container className="py-20">
        {isAuthenticated ? (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-8">
              Your thematics
            </h1>
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-12 text-center">
              <p className="text-neutral-500 mb-4">
                You haven&apos;t built a thematic yet.
              </p>
              <Link href="/thematic/new/research">
                <Button>Start researching</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
              Turn your worldview into investment theses
            </h1>
            <p className="text-lg text-neutral-500 leading-relaxed mb-8">
              Cosmic Signal helps you decompose what you believe about the
              world into causal chains, find the right positions to express
              those beliefs, and then monitors the news for signals that
              confirm or challenge your thesis — so your strategy evolves
              as the world changes.
            </p>
            <Link href="/auth/login">
              <Button>Get started</Button>
            </Link>

            <div className="mt-20">
              <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-6">
                Sample thematic
              </h2>
              <DemoThematic />
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
