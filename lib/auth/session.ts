import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

import { env } from '@/env/server';
import { SessionUser } from '@/types';

import { SESSION } from '@/constants/auth.const';
import { USER_ROLES } from '@/constants/roles.const';

/*
  `jose` runs in the middleware runtime as well as on the server, which is what lets
  `proxy.ts` verify a session without pulling Mongoose or bcrypt into the edge bundle.
*/
const secret = new TextEncoder().encode(env.AUTH_SECRET);

/*
  A signature proves the token was minted here, not that its shape still matches the current
  code. A token issued before a field was renamed verifies perfectly and then hands back
  nonsense — so the payload is parsed, not trusted.
*/
const SessionPayloadSchema = z.object({
  userId: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(Object.values(USER_ROLES)),
  isApproved: z.boolean(),
});

/**
 * Mint a signed session token.
 *
 * @param user - Who the session belongs to.
 *
 * @returns The signed JWT.
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: SESSION.ALGORITHM })
    .setIssuedAt()
    .setIssuer(SESSION.ISSUER)
    .setAudience(SESSION.AUDIENCE)
    .setExpirationTime(`${SESSION.COOKIE.MAX_AGE}s`)
    .sign(secret);
}

/**
 * Verify a session token and read who it belongs to.
 *
 * Returns `null` for every failure — expired, tampered, wrong issuer, or a payload that no
 * longer matches the current shape. A caller only needs to know whether there is a valid
 * session, and an invalid one is not an exceptional event.
 *
 * @param token - Raw token from the session cookie.
 *
 * @returns The session user, or null.
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: SESSION.ISSUER,
      audience: SESSION.AUDIENCE,
      algorithms: [SESSION.ALGORITHM],
    });

    const parsed = SessionPayloadSchema.safeParse(payload);

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
