import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

export const metadata: Metadata = {
  title: 'About',
  description: 'Why Auriva exists, and what we refuse to become.',
};

const NOT_LIST = [
  'An HRMS',
  'A generic ERP',
  'A hospital management system trying to do everything',
  'A payroll system',
  'A recruitment platform',
  'An accounting system',
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Healthcare, running on one coherent system"
        description="Auriva exists to remove operational friction from healthcare delivery — so a single clinic, a diagnostic lab, a pharmacy chain, or a hospital network can run on one system instead of five disconnected ones."
      />

      <Container className="py-16">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <p className="text-muted-foreground">
            This is a mission about removing friction, not about adding features. We think of Auriva as
            the Shopify of healthcare — one platform, six configurations, zero forks. Not six products
            wearing the same logo, but six presets of the same underlying modules and the same
            operational primitives, running on one codebase.
          </p>
          <p className="text-muted-foreground">
            The people inside a healthcare organization should spend more of their day on care, and less
            of it on software. Every feature we build is judged against that — and against whether it
            strengthens one of our six product pillars. If it doesn&apos;t, we don&apos;t build it, no
            matter how many people ask.
          </p>
        </div>
      </Container>

      <section className="border-y border-border bg-muted/30 py-16">
        <Container className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-xl font-bold text-foreground">What Auriva is not</h2>
          <p className="mb-4 text-muted-foreground">
            Some of our most important decisions are about what we refuse to build:
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {NOT_LIST.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Want to talk to us?</h2>
        <Button size="lg" nativeButton={false} render={<Link href="/contact-sales" />}>
          Get in Touch
          <ArrowRight />
        </Button>
      </Container>
    </>
  );
}
