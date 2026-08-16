import { env } from '@/env/server';

import { buildAbsoluteUrl, buildLlmsFullTxt } from '@/lib/utils';

/** The long form of `/llms.txt` — every landing section as markdown. */
export async function GET() {
  const body = buildLlmsFullTxt({ homeUrl: buildAbsoluteUrl(env.APP_BASE_URL) });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
