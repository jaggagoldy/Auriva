import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';
import { ARCHETYPES } from '@/components/marketing/content';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Pricing that matches how your organization actually runs.',
};

// APS-031 Part 2 — packaging (per-module vs. per-seat vs. volume) is still
// product-side unresolved (APS-030 §11). This page sells the conversation,
// not a settled table, per the approved mockup's own instruction — not a
// deviation, this is what was designed.
export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Pricing that matches how you actually run"
        description="A one-doctor clinic and a 200-bed hospital shouldn't pay the same way. We price to your organization type and the modules you actually turn on — not a one-size list price."
      />

      <Container className="py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-foreground">Tell us what you run</h2>
          <p className="mt-2 text-muted-foreground">
            Pick the closest fit and we&apos;ll bring real numbers to the conversation, not a generic
            quote.
          </p>
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
          {ARCHETYPES.map((a) => (
            <Link
              key={a.name}
              href={`/contact-sales?archetype=${encodeURIComponent(a.name)}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <a.icon className="size-4" />
              {a.name}
            </Link>
          ))}
        </div>
      </Container>

      <section className="border-y border-border bg-muted/30 py-16">
        <Container className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-foreground">What&apos;s true today</h2>
          <ul className="mt-4 flex flex-col gap-2 text-muted-foreground">
            <li>You only pay for the modules your organization activates.</li>
            <li>Enterprise SSO and multi-location rollups are available on request.</li>
            <li>No commission on referrals, ever — that&apos;s a constitutional guardrail, not a plan tier.</li>
          </ul>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" nativeButton={false} render={<Link href="/contact-sales" />}>
              Contact Sales
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/book-demo" />}>
              Book Demo
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
