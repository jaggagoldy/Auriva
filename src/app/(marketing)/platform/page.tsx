import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  RefreshCw,
  Layers,
  IndianRupee,
  Stethoscope,
  Users,
  Building2,
  Hospital,
  FlaskConical,
  Pill,
  ShieldCheck,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'One platform for every kind of practice. Start solo today, grow to a network — you never migrate.',
};

const LIVE = {
  icon: Stethoscope,
  name: 'Auriva Solo Practice',
  desc: 'Everything an independent doctor needs to run a full clinic — appointments, a live queue, consultation notes, prescriptions, billing and a patient portal. Set up in an afternoon.',
};

const ROADMAP = [
  { icon: Users, name: 'Auriva Multi-Doctor', desc: 'Shared schedules, cross-functional queues and multi-tier billing.' },
  { icon: Building2, name: 'Auriva Clinic Groups', desc: 'Centralized operations, reporting and revenue across locations.' },
  { icon: Hospital, name: 'Auriva Hospital', desc: 'Departments, admissions, room scheduling and enterprise operations.' },
  { icon: FlaskConical, name: 'Auriva Labs', desc: 'Diagnostic orders, sample tracking and reports on the record.' },
  { icon: Pill, name: 'Auriva Pharmacy', desc: 'E-prescriptions, dispensing and inventory that talks to the doctor.' },
  { icon: ShieldCheck, name: 'Auriva Insurance', desc: 'Real-time claims routing and cashless authorizations.' },
  { icon: Network, name: 'Auriva Networks', desc: 'Cross-system referrals that carry the full record with them.' },
];

const WHY = [
  {
    icon: RefreshCw,
    title: 'Never migrate again',
    desc: 'Add a second doctor, a location, a lab — your patients, history and settings come with you. No export, no re-training.',
  },
  {
    icon: Layers,
    title: 'One patient record',
    desc: 'The prescription a doctor writes is the one the pharmacy fills and the record the patient sees. One truth, everywhere.',
  },
  {
    icon: IndianRupee,
    title: 'Built for India',
    desc: '₹ billing, UPI, WhatsApp reminders and workflows shaped around how Indian clinics actually run.',
  },
];

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Products"
        title="One platform. Every kind of practice."
        description="Auriva grows from a single practitioner to an entire connected network — on the same account, the same data, the same login. Start where you are today. Never migrate again."
      />

      {/* Live today */}
      <Container className="py-14">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Live today</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <LIVE.icon className="size-7" />
          </span>
          <div className="flex-1">
            <h3 className="flex items-center gap-2.5 font-heading text-lg font-bold">
              {LIVE.name}
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                Live
              </span>
            </h3>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{LIVE.desc}</p>
          </div>
          <Button nativeButton={false} render={<Link href="/start" />}>
            Start free <ArrowRight className="size-4" />
          </Button>
        </div>
      </Container>

      {/* Roadmap */}
      <section className="border-y border-border bg-secondary py-14">
        <Container>
          <div className="mb-6 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              On the roadmap
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="mb-6 max-w-2xl text-muted-foreground">
            The same platform expands outward — every edition shares one patient record, one identity,
            one operational spine. Nothing to re-buy, nothing to re-migrate.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ROADMAP.map(({ icon: Icon, name, desc }) => (
              <div
                key={name}
                className="flex gap-4 rounded-2xl border border-dashed border-border bg-card/60 p-5"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-6" />
                </span>
                <div>
                  <h3 className="flex items-center gap-2.5 font-heading text-base font-bold">
                    {name}
                    <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                      Soon
                    </span>
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Why one platform */}
      <Container className="py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Why one platform
          </span>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">
            Buy once. Grow forever.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {WHY.map(({ icon: Icon, title, desc }) => (
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

      {/* CTA */}
      <section className="border-t border-border bg-secondary">
        <Container className="flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Start with an Independent Clinic today.
          </h2>
          <p className="max-w-md text-muted-foreground">
            Free forever for solo practitioners. The rest of the platform is waiting when you&apos;re
            ready.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/start" />}>
              Start free <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/pricing" />}>
              See pricing
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="size-3.5 text-primary" /> No card required · set up in minutes
          </p>
        </Container>
      </section>
    </>
  );
}
