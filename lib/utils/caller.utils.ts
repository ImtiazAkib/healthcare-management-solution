const FORWARDED_FOR = 'x-forwarded-for';

/**
 * The original client from `x-forwarded-for`, when the deployment says the proxy can be trusted.
 *
 * `x-forwarded-for` is only as trustworthy as the proxy that sets it: on a platform that sets it the
 * client cannot override it, behind an nginx it is whatever the config says, and with no proxy at all
 * it is whatever the client typed. So the trust flag is **passed in** — read from the environment by
 * the caller, never here — which also keeps this helper free of any server-only import and safe in a
 * client bundle. The forwarding chain appends, so the leftmost entry is the original client.
 *
 * @param headers - The request headers.
 * @param trustForwardedFor - Whether the deployment's proxy is trusted to set the header.
 *
 * @returns The client's address, or null when it cannot be told.
 */
export function resolveCallerIp(headers: Headers, trustForwardedFor: boolean): string | null {
  const forwarded = trustForwardedFor ? headers.get(FORWARDED_FOR) : null;

  if (!forwarded) {
    return null;
  }

  const [client] = forwarded.split(',');

  return client.trim() || null;
}

/**
 * A rate-limit key for the caller.
 *
 * The same read as `resolveCallerIp`, but a caller that cannot be told apart shares one bucket
 * (`unknown-caller`) rather than each getting their own — so a per-caller limit does not quietly
 * become no limit behind a proxy that is not trusted.
 *
 * @param headers - The request headers.
 * @param trustForwardedFor - Whether the deployment's proxy is trusted to set the header.
 *
 * @returns The caller key.
 */
export function resolveCallerKey(headers: Headers, trustForwardedFor: boolean): string {
  return resolveCallerIp(headers, trustForwardedFor) ?? 'unknown-caller';
}
