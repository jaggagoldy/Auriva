// India-first phone normalization. Auriva's default country is India (+91):
// staff and patients enter their 10-digit mobile and the country code is
// assumed, so "9876543210", "98765 43210" and "+91 98765 43210" all resolve to
// the same stored E.164 value "+919876543210". A number already given with an
// explicit "+<code>" is respected as-is (only formatting is stripped), so
// existing non-India numbers keep working.
export function normalizePhone(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  // Only transform genuinely phone-shaped input. Anything containing letters is
  // not a phone number (a username, an email, a test fixture) — return it as-is
  // so identity lookups on those values are unaffected.
  if (/[a-zA-Z]/.test(raw)) return raw;

  // Explicit international number — keep the country code, strip formatting.
  if (raw.startsWith("+")) return "+" + raw.slice(1).replace(/\D/g, "");

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`; // bare Indian mobile
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`; // 0XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`; // 91XXXXXXXXXX
  return `+${digits}`; // already carries a country code
}
