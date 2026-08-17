import { CODES } from '@/constants/codes.const';

const AUTH = CODES.AUTH.USERS;

export type SignInErrorLabels = {
  invalidCredentials: string;
  notVerified: string;
  notApproved: string;
  deactivated: string;
  unexpected: string;
};

/**
 * Turn a refusal code from the sign-in action into a sentence the visitor reads.
 *
 * The action returns a **code**, not a message. The sentence is chosen here, on the client,
 * from labels the form holds — which keeps the copy next to the form that shows it and keeps
 * the action free of presentation.
 *
 * @param code - Error code from the failed sign-in.
 * @param labels - The messages, one per refusal.
 *
 * @returns The message to show.
 */
export function resolveSignInErrorMessage(code: number, labels: SignInErrorLabels): string {
  if (code === AUTH.INVALID_CREDENTIALS.CODE) {
    return labels.invalidCredentials;
  }

  /*
    Kept distinct from "not approved". One is the visitor's to fix — the link is in their
    inbox — and the other is the hospital's. A single message for both would leave half of
    them with nothing to do.
  */
  if (code === AUTH.EMAIL_NOT_VERIFIED.CODE) {
    return labels.notVerified;
  }

  if (code === AUTH.ACCOUNT_NOT_APPROVED.CODE) {
    return labels.notApproved;
  }

  if (code === AUTH.ACCOUNT_DEACTIVATED.CODE) {
    return labels.deactivated;
  }

  return labels.unexpected;
}
