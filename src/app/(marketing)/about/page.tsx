import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Layers, IndianRupee, ShieldCheck, Check, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

const PRINCIPLES = [
  { icon: Heart, title: 'Care comes first', desc: 'Every feature has to make care better or a practice calmer. If it doesn’t, we don’t build it.' },
  { icon: Layers, title: 'One platform, not many tools', desc: 'Grow from solo doctor to hospital on the same foundation. Never migrate, never re-buy.' },
  { icon: IndianRupee, title: 'Built for India', desc: 'UPI, WhatsApp, rupee billing and real Indian workflows — designed here, not translated later.' },
  { icon: ShieldCheck, title: 'Trust is the product', desc: 'People own their data. Every change is logged. Privacy is the default, not a setting.' },
  { icon: Check, title: 'Simple beats clever', desc: 'Every screen answers one question. Calm software helps busy clinics more than powerful software.' },
  { icon: Network, title: 'Connected by design', desc: 'A prescription written once is understood everywhere — doctor, lab, pharmacy, insurer.' },
];

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
            This is a mission about removing friction, not adding features. Auriva is one platform that
            grows with a practice — the same system for a solo doctor today and a connected clinic,
            hospital or network tomorrow. Not different products wearing the same logo, but one product
            that unlocks more as you grow, so you never migrate.
          </p>
          <p className="text-muted-foreground">
            The people inside a healthcare organization should spend more of their day on care, and less
            of it on software. Every feature we build is judged against that — and against whether it
            makes care better or a practice calmer. If it doesn&apos;t, we don&apos;t build it, no
            matter how many people ask.
          </p>
        </div>
      </Container>

      {/* What we believe */}
      <section className="border-y border-border bg-secondary py-16">
        <Container>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              What we believe
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">
              The principles behind the product.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6">
                <span className="mb-4 grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-heading text-base font-bold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="mx-auto max-w-2xl">
          <h2 className="mb-4 font-heading text-xl font-bold text-foreground">What Auriva is not</h2>
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
