import { env } from '@/env/server';

import { buildAbsoluteUrl, buildLlmsTxt } from '@/lib/utils';

/*
  The llmstxt.org convention: a short index for crawlers that read markdown rather than
  render pages. Built from the same lists the landing page renders, so the two cannot
  disagree about what this system does.
*/
export async function GET() {
  const body = buildLlmsTxt({ homeUrl: buildAbsoluteUrl(env.APP_BASE_URL) });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
