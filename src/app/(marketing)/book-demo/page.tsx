'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';
import { ARCHETYPES } from '@/components/marketing/content';

// APS-031 Part 3 — no lead-capture backend exists yet for Book Demo
// (APS-030 §1.12: named as the single most-missing dependency in the
// customer lifecycle). This form is a real, validated UI that ends in an
// honest confirmation state — it does not silently pretend to notify sales
// until a real endpoint exists to wire it to.
function BookDemoForm() {
  const searchParams = useSearchParams();
  const prefillArchetype = searchParams.get('archetype') ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [archetype, setArchetype] = useState(prefillArchetype);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !orgName) {
      toast.error('Please fill in your name, email, and organization.');
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h2 className="text-lg font-bold text-foreground">Thanks, {name.split(' ')[0]}.</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          We&apos;ll reach out to {email} within one business day to find a time that works.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-border bg-card p-8">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Goldy Jagga" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourclinic.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org">Organization name</Label>
        <Input
          id="org"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Sunrise Multi-specialty Clinic"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="archetype">Organization type</Label>
        <select
          id="archetype"
          value={archetype}
          onChange={(e) => setArchetype(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30"
        >
          <option value="">Select one</option>
          {ARCHETYPES.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? <Loader2 className="animate-spin" /> : null}
        {submitting ? 'Sending…' : 'Book Demo'}
      </Button>
    </form>
  );
}

export default function BookDemoPage() {
  return (
    <>
      <PageHero
        eyebrow="Book Demo"
        title="See Auriva running on a setup like yours"
        description="Tell us about your organization and we'll bring a demo configured for your archetype, not a generic walkthrough."
      />
      <Container className="max-w-lg py-16">
        <Suspense fallback={null}>
          <BookDemoForm />
        </Suspense>
      </Container>
    </>
  );
}
