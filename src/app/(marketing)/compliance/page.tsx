import { redirect } from 'next/navigation';

// See src/app/(marketing)/security/page.tsx for why this redirects.
export default function ComplianceRedirect() {
  redirect('/trust#compliance');
}
