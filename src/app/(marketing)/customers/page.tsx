import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

export const metadata: Metadata = {
  title: 'Customers',
  description: 'Who Auriva is built for, and how we work with early organizations.',
};

// APS-031 Part 2 — the approved mockup's brief called for testimonial-style
// customer proof cards. Auriva doesn't have real production customers yet,
// so this ships as an honest early-access state (Principle 3: never an
// empty screen without guidance) instead of fabricated quotes and company
// names — flagged the same way the homepage's stats were.
export default function CustomersPage() {
  return (
    <>
      <PageHero
        eyebrow="Customers"
        title="We're working with our first organizations now"
        description="Case studies go here as soon as we have real ones to share — not before. If you'd like to be among the first, we'd like to hear from you."
      />

      <Container className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Handshake className="size-6 text-primary" />
        </div>
        <h2 className="max-w-lg text-xl font-bold text-foreground">
          Become one of our first design partners
        </h2>
        <p className="max-w-lg text-muted-foreground">
          Early organizations get direct access to the product team, a say in what we build next, and
          pricing that reflects that partnership.
        </p>
        <Button size="lg" nativeButton={false} render={<Link href="/book-demo" />}>
          Book Demo
          <ArrowRight />
        </Button>
      </Container>
    </>
  );
}
