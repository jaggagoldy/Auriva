import type { NextConfig } from "next";

// Release 1.2 Hardening (H2 / security): baseline HTTP security headers applied
// to every response. These are the high-value, framework-safe directives that do
// not risk breaking the app un-testably:
//   - clickjacking:      X-Frame-Options DENY + CSP frame-ancestors 'none'
//   - MIME sniffing:     X-Content-Type-Options nosniff
//   - referrer leakage:  Referrer-Policy strict-origin-when-cross-origin
//   - transport:         HSTS (2y, subdomains, preload) — active only over HTTPS
//   - feature surface:   Permissions-Policy disables camera/microphone/payment
//   - injection floor:   object-src 'none', base-uri 'self', form-action 'self'
//
// script-src/style-src validated in a real (headless Chrome) browser 2026-07-12.
// A bare `default-src 'self'` breaks the app: script/style fall back to it, which
// blocks Next.js's inline hydration bootstrap (self.__next_r) — the page renders
// server-side but never becomes interactive (buttons/forms/effects all dead).
// We allow inline script/style (Next injects both; framer-motion + Tailwind emit
// inline styles) plus 'unsafe-eval' for dev HMR, while keeping the injection
// protections (object/base/form/frame-ancestors). A nonce-based CSP is the
// hardening follow-up (H7); this is correct-and-functional now.
const isDev = process.env.NODE_ENV !== "production";
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
