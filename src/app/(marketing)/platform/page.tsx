import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';
import { PILLARS } from '@/components/marketing/content';

export const metadata: Metadata = {
  title: 'Platform',
  description: 'One kernel, six configurations, zero forks — the architecture behind Auriva.',
};

const PRIMITIVES = [
  'Identity & registration',
  'Scheduling & queueing',
  'Clinical encounter',
  'Orders & fulfillment',
  'Cash-side money',
  'Payer-side money',
  'Inventory',
  'People & payouts',
  'Compliance',
];

export default function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow="Platform"
        title="One kernel. Six configurations. Zero forks."
        description="Every organization archetype Auriva serves runs the same nine operational primitives, activated differently — not six different products wearing the same logo."
      />

      <Container className="py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Six pillars</h2>
          <p className="mt-2 text-muted-foreground">
            Every feature we build strengthens one of these — or it doesn&apos;t ship.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <Card key={pillar.title} className="ring-border/60">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <pillar.icon className="size-4.5 text-primary" />
                </div>
                <CardTitle className="text-base">{pillar.title}</CardTitle>
                <CardDescription>{pillar.description}</CardDescription>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {pillar.examples.map((example) => (
                    <li
                      key={example}
                      className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {example}
                    </li>
                  ))}
                </ul>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Container>

      <section className="border-y border-border bg-muted/30 py-16">
        <Container>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Nine operational primitives
            </h2>
            <p className="mt-2 text-muted-foreground">
              The shared genome every archetype runs underneath — the ceiling this platform is built to,
              not a moving target.
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
            {PRIMITIVES.map((p) => (
              <div
                key={p}
                className="rounded-lg border border-border bg-card px-4 py-3 text-center text-sm font-medium text-foreground"
              >
                {p}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">See it running on your data</h2>
        <Button size="lg" nativeButton={false} render={<Link href="/book-demo" />}>
          Book Demo
          <ArrowRight />
        </Button>
      </Container>
    </>
  );
}
