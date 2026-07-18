// Batch A (APS-044 §9 · SAD-043 §11): the mandatory-password-change flow.
//
// A staff account provisioned by an Organization is created with a TEMPORARY
// password and `must_change_password = true` (the owner relays the temp
// password out-of-band — no SMS, per ERA-001 C5). On first sign-in the member
// authenticates with that temp password and is then forced to set their own
// before any workspace is usable — UXS-043 Package 1, "Mandatory Password
// Change". This service is the server half of that screen; the flag is enforced
// at the request boundary in requireStaffContext.
//
// Voluntary changes (from Settings, no mandatory reset pending) still prove the
// current password; a mandatory reset skips that check because the member has
// just authenticated with the temp password this session and the whole point is
// to replace it.

import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isPatient } from "@/domain/authorization";

export class PasswordChangeError extends Error {}

// Matches the staff-password floor already enforced at account creation
// (onboarding-service: createOrganization / acceptInvitation).
export const MIN_PASSWORD_LENGTH = 8;

export async function changePassword(input: {
  userId: string;
  currentPassword?: string | null;
  newPassword: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new PasswordChangeError("Account not found.");

  // Patients authenticate via OTP and hold no password here.
  if (isPatient(user.role)) {
    throw new PasswordChangeError("This account does not use a password.");
  }

  if (!input.newPassword || input.newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordChangeError(
      `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }

  if (!user.must_change_password) {
    // Voluntary change — prove the current password.
    if (
      !input.currentPassword ||
      !(await verifyPassword(input.currentPassword, user.password_hash))
    ) {
      throw new PasswordChangeError("Your current password is incorrect.");
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: await hashPassword(input.newPassword),
      must_change_password: false,
      password_set_at: new Date(),
    },
  });
}
