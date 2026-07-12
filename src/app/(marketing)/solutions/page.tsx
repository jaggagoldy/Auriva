import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Activity,
  Smile,
  Apple,
  Brain,
  Sparkles,
  MessageCircle,
  Bone,
  Plus,
  LayoutList,
  RefreshCw,
  IndianRupee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

export const metadata: Metadata = {
  title: 'Solutions',
  description: 'Auriva adapts to your specialty — configured to the way you practise, not customised.',
};

const PROFESSIONS = [
  { icon: Activity, name: 'Physiotherapists', desc: 'Session plans, exercise notes and recurring follow-ups.' },
  { icon: Smile, name: 'Dentists', desc: 'Tooth charts, treatment plans and staged billing.' },
  { icon: Apple, name: 'Dietitians', desc: 'Diet plans, progress tracking and check-in reminders.' },
  { icon: Brain, name: 'Psychologists', desc: 'Private notes, session cadence and gentle reminders.' },
  { icon: Sparkles, name: 'Dermatologists', desc: 'Photo records, procedure notes and package billing.' },
  { icon: MessageCircle, name: 'Speech Therapists', desc: 'Goal tracking, session logs and parent updates.' },
  { icon: Bone, name: 'Orthopedics', desc: 'Imaging references, procedure notes and recovery plans.' },
  { icon: Plus, name: 'More every month', desc: 'New specialties are added continuously. Yours next.' },
];

const WHY = [
  {
    icon: LayoutList,
    title: 'Specialty templates',
    desc: 'Consultation and prescription templates tuned to how your field charts.',
  },
  {
    icon: RefreshCw,
    title: 'Follow-up rhythms',
    desc: 'Recurring visits and check-ins that match your treatment cycles.',
  },
  {
    icon: IndianRupee,
    title: 'Billing that suits you',
    desc: 'Single visits, packages or staged plans — priced the way your work is.',
  },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Solutions"
        title="Software that fits the way you practise."
        description="Auriva Solo Practice adapts to your profession — the fields you chart, the way you prescribe, the follow-ups you run. One platform, shaped to your specialty."
      />

      {/* Professions */}
      <Container className="py-14">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Live today</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROFESSIONS.map(({ icon: Icon, name, desc }) => (
            <Link
              key={name}
              href="/start"
              className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
            >
              <span className="mb-3.5 grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="font-heading text-[15px] font-bold">{name}</h3>
              <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </Container>

      {/* Why it fits */}
      <section className="border-y border-border bg-secondary py-16">
        <Container>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Why it fits
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">
              One product. Configured, not customised.
            </h2>
            <p className="mt-3 text-muted-foreground">
              You don&apos;t buy a different system for your specialty — you switch on the parts that
              matter to you. Everything else stays out of your way.
            </p>
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
      </section>

      {/* CTA */}
      <Container className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Set up your practice today.
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/start" />}>
            Start free <ArrowRight className="size-4" />
          </Button>
          <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/pricing" />}>
            See pricing
          </Button>
        </div>
      </Container>
    </>
  );
}
