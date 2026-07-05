import { cn } from '@/lib/utils';
import { Container } from '@/components/marketing/container';

export function PageHero({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn('border-b border-border bg-muted/30 py-16 md:py-20', className)}>
      <Container className="flex flex-col items-center gap-4 text-center">
        {eyebrow && (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </span>
        )}
        <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight text-balance text-foreground md:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-lg text-muted-foreground">{description}</p>
        )}
        {children}
      </Container>
    </section>
  );
}
