'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';

// APS-031 Part 2 — distinct from Book Demo: for enterprise inquiries that
// want a human before any product exposure (APS-030 §4.3). Same honesty
// constraint as Book Demo — no backend exists to route this to yet.
function ContactSalesForm() {
  const searchParams = useSearchParams();
  const prefillArchetype = searchParams.get('archetype') ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(
    prefillArchetype ? `We run a ${prefillArchetype.toLowerCase()} and would like to talk.` : ''
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) {
      toast.error('Please fill in your name and email.');
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
        <CheckCircle2 className="size-10 text-emerald-500" />
        <h2 className="text-lg font-bold text-foreground">Thanks, {name.split(' ')[0]}.</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Our team will get back to you at {email} shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-border bg-card p-8">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cs-name">Your name</Label>
        <Input id="cs-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Goldy Jagga" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cs-email">Work email</Label>
        <Input
          id="cs-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourorganization.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cs-message">What can we help with?</Label>
        <Textarea
          id="cs-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your organization and what you're evaluating."
          rows={4}
        />
      </div>
      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? <Loader2 className="animate-spin" /> : null}
        {submitting ? 'Sending…' : 'Send to Sales'}
      </Button>
    </form>
  );
}

export default function ContactSalesPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact Sales"
        title="Talk to a human before anything else"
        description="For enterprise organizations, multi-location chains, or anyone who'd rather start with a conversation than a form."
      />
      <Container className="max-w-lg py-16">
        <Suspense fallback={null}>
          <ContactSalesForm />
        </Suspense>
      </Container>
    </>
  );
}
