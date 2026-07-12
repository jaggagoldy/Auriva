import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, HeartPulse, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

export const metadata: Metadata = {
  title: 'Get Started',
  description: 'Register as a user or build your own clinic — pick the one that’s yours.',
};

// Front door for new users. Two paths, each routed to a real, working flow:
//  • Register as a user  → /login?as=patient  (phone + OTP; a new number creates a profile)
//  • Build your clinic   → /start             (solo onboarding directly). The org-type chooser
//    (/register-org) is skipped for now — only Independent Clinic is live, so we go straight to
//    the working setup rather than a chooser with only one selectable option.
export default function GetStartedPage() {
  return (
    <>
      <PageHero
        eyebrow="Get Started"
        title="How would you like to use Auriva?"
        description="Two ways in — pick the one that's yours. You can always switch later."
      />

      <Container className="pb-16 pt-2">
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {/* ---- Register as a user (patient) ---- */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-7">
            <span className="mb-5 grid size-12 place-items-center rounded-xl bg-honey-soft text-honey-deep">
              <HeartPulse className="size-6" />
            </span>
            <h2 className="font-heading text-xl font-bold">Register as a user</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Book appointments, keep every prescription and report, and care for your family — all
              in one place. Always free.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {['Find & book doctors', 'Records, prescriptions & reports', 'Family health'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-honey-deep" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex-1" />
            <Button
              className="w-full bg-honey text-[#4A3413] hover:brightness-105"
              nativeButton={false}
              render={<Link href="/login?as=patient" />}
            >
              Continue as a user <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* ---- Build your own clinic (provider) ---- */}
          <div className="flex flex-col rounded-2xl border-2 border-primary bg-card p-7 shadow-lg">
            <span className="mb-5 grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Stethoscope className="size-6" />
            </span>
            <h2 className="font-heading text-xl font-bold">Build your own clinic</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up your practice on Auriva — an independent clinic today, and grow to multi-doctor,
              groups or a hospital on the same account.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {['Appointments, queue & prescriptions', 'Billing & UPI', 'Your own booking page'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex-1" />
            <div className="flex flex-col gap-2">
              <Button className="w-full" nativeButton={false} render={<Link href="/start" />}>
                Set up your clinic <ArrowRight className="size-4" />
              </Button>
              <Button variant="outline" className="w-full" nativeButton={false} render={<Link href="/book-demo" />}>
                Book a demo first
              </Button>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          Joining a team that already uses Auriva?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Accept an invitation or sign in →
          </Link>
        </p>
      </Container>
    </>
  );
}
