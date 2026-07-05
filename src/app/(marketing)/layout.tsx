import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

// APS-031 Part 2/9 — shared chrome for every Customer Acquisition Platform
// page (Phase 1). Product workspaces (Patient/Doctor/Organization) keep
// their own shells and are not wrapped by this layout.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
