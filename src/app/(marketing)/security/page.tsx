import { redirect } from 'next/navigation';

// Security, Compliance and Trust Center are one page with sub-navigation
// in the approved mockup (design/aps-031-trust-security.html) — this route
// exists so nav links and bookmarks to /security keep working.
export default function SecurityRedirect() {
  redirect('/trust#security');
}
