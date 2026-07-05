import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';
import { ARCHETYPES } from '@/components/marketing/content';

export const metadata: Metadata = {
  title: 'Industries',
  description: 'Six healthcare organization archetypes, one platform underneath each of them.',
};

export default function IndustriesPage() {
  return (
    <>
      <PageHero
        eyebrow="Industries"
        title="Built for every kind of healthcare organization"
        description="Six archetypes, sharing the same modules and the same operational primitives — not six different products."
      />

      <Container className="py-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {ARCHETYPES.map((a) => (
            <div key={a.name} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <a.icon className="size-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">{a.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{a.description}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{a.economics}</p>
              <Link
                href={`/book-demo?archetype=${encodeURIComponent(a.name)}`}
                className="mt-1 text-sm font-medium text-primary hover:underline"
              >
                Book a demo for this &rarr;
              </Link>
            </div>
          ))}
        </div>
      </Container>

      <Container className="flex flex-col items-center gap-4 border-t border-border py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Don&apos;t see your exact setup?
        </h2>
        <p className="max-w-lg text-muted-foreground">
          Most organizations are a mix. Tell us how you actually run, and we&apos;ll show you the
          configuration that fits.
        </p>
        <Button size="lg" nativeButton={false} render={<Link href="/contact-sales" />}>
          Contact Sales
          <ArrowRight />
        </Button>
      </Container>
    </>
  );
}
