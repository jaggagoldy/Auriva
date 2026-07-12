import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Free forever for solo practitioners. Pay only when you add a team. Patients are always free.',
};

const SOLO = [
  'Unlimited patients & appointments',
  'Your own online booking page',
  'Consults, prescriptions & UPI billing',
  'Patient portal, records & timeline',
  'WhatsApp & SMS reminders',
];

const GROW = [
  'Everything in Solo Practice',
  'Add doctors & reception staff',
  'Shared clinic calendar & queue',
  'Practice insights & reports',
];

const FAQ = [
  {
    q: 'Is Solo Practice really free?',
    a: 'Yes — free forever for one practitioner, with the complete product and no feature locks. No card, no trial clock. You only pay when you add a team.',
  },
  {
    q: 'Do I pay per patient or per appointment?',
    a: 'Never. Unlimited patients and appointments are included. There are no usage meters and no per-feature upsells.',
  },
  {
    q: 'What does the ₹999/mo plan add?',
    a: 'Everything in Solo Practice, plus a team — additional doctors and reception staff, a shared clinic calendar and queue, and practice insights. It kicks in only when you grow beyond a solo practice.',
  },
  {
    q: 'What happens when I add a second doctor?',
    a: 'You move onto the team plan on the same account — same login, same patients, same history. Nothing to export, nothing to re-learn.',
  },
  {
    q: 'Can I leave and take my data?',
    a: 'Anytime. Export your records whenever you like — zero lock-in. It is your practice and your patients’ data.',
  },
  {
    q: 'Is Auriva free for patients too?',
    a: 'Always. Booking, reminders, records, prescriptions and family health are free for patients, forever.',
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Free to start. Pay only when you grow."
        description="Auriva Solo Practice is free forever for independent practitioners — the whole product, no feature locks. You only pay when you add a team. And for patients, Auriva is always free."
      />

      {/* Plans */}
      <Container className="pb-6 pt-2">
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-[#0B4A41] p-6 text-white shadow-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 size-[260px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(232,162,76,.18), transparent 62%)' }}
            />
            <div className="relative">
              <div className="text-sm font-bold uppercase tracking-wide text-honey">
                Auriva Solo Practice
              </div>
              <div className="mt-2 font-heading text-4xl font-bold">
                Free<span className="text-base font-medium text-white/70"> forever</span>
              </div>
              <p className="mt-2 text-sm text-white/80">
                Everything one practitioner needs to run a calm, full clinic — today.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {SOLO.map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-honey" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button
                  className="w-full bg-white text-[#083F37] hover:bg-white/90"
                  nativeButton={false}
                  render={<Link href="/start" />}
                >
                  Start free — 2 minutes <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-sm font-bold uppercase tracking-wide text-accent-foreground">
              As you grow
            </div>
            <div className="mt-2 font-heading text-4xl font-bold">
              ₹999<span className="text-base font-medium text-muted-foreground">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              When you add a second doctor or a front desk — everything in Solo, plus your team.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {GROW.map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-primary" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<Link href="/contact-sales" />}
              >
                Talk to us
              </Button>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-muted-foreground">
          Multi-doctor, clinic groups and hospital plans arrive as those editions go live — on the
          same account, at the same login. You never migrate.
        </p>
      </Container>

      {/* FAQ */}
      <section className="border-t border-border bg-secondary py-16">
        <Container className="max-w-3xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Questions</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Pricing, answered.
          </h2>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-[15px] font-semibold">
                  {q}
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
