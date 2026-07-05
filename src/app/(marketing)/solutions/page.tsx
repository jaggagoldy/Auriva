import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  FileText,
  Workflow,
  BellRing,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

export const metadata: Metadata = {
  title: 'Solutions',
  description: 'What Auriva actually fixes — organized by the problem, not the module name.',
};

const SOLUTIONS = [
  {
    icon: Clock,
    problem: 'Stop the waiting-room guesswork',
    solution:
      'A live queue and real operational calendar so a "10:30 appointment" means something — for the person waiting and the doctor running behind.',
    pillar: 'Practice Operations',
  },
  {
    icon: Workflow,
    problem: 'Get out of the human-API business',
    solution:
      'Front desk, doctor, lab, and billing work off the same record — nobody re-keys the same information into three different systems.',
    pillar: 'Platform Foundation',
  },
  {
    icon: FileText,
    problem: 'Make discharge take minutes, not forms',
    solution:
      'A clinical timeline that builds itself as care happens, instead of a stack of paperwork assembled after the fact.',
    pillar: 'Clinical Excellence',
  },
  {
    icon: BellRing,
    problem: 'Never lose a follow-up to memory',
    solution:
      'Follow-ups are tracked as real, dated records — not a note on a doctor’s desk that depends on someone remembering.',
    pillar: 'Patient Engagement',
  },
  {
    icon: Receipt,
    problem: 'Reconcile money the day it moves',
    solution:
      'Cash and payer ledgers with attribution at transaction time — not a monthly dispute over what happened three weeks ago.',
    pillar: 'Financial Operations',
  },
  {
    icon: BarChart3,
    problem: 'See performance without asking anyone',
    solution:
      'A live Command Center where every number is a link to the record that proves it — not a report someone compiles on Fridays.',
    pillar: 'Organization Intelligence',
  },
] as const;

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Solutions"
        title="What Auriva actually fixes"
        description="Organized by the problem you have, not the name of a module."
      />

      <Container className="py-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {SOLUTIONS.map((s) => (
            <div key={s.problem} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="size-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{s.problem}</h2>
              <p className="text-sm text-muted-foreground">{s.solution}</p>
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">{s.pillar}</span>
            </div>
          ))}
        </div>
      </Container>

      <Container className="flex flex-col items-center gap-4 border-t border-border py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Have a problem that isn&apos;t listed here?
        </h2>
        <Button size="lg" nativeButton={false} render={<Link href="/book-demo" />}>
          Book Demo
          <ArrowRight />
        </Button>
      </Container>
    </>
  );
}
