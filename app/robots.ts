import type { MetadataRoute } from 'next';

import { SEO } from '@/constants';
import { env } from '@/env/server';

import { buildAbsoluteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const sitemap = buildAbsoluteUrl(env.APP_BASE_URL, '/sitemap.xml');

  /*
    Block everything on any deployment that has not explicitly opted into indexing. Getting
    a staging site out of the index afterwards is far more work than setting one variable —
    and a staging copy of a hospital system is the kind of thing that must never be found.
  */
  if (!env.ROBOTS_ENABLED) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...SEO.DISALLOWED_PATHS],
    },
    sitemap,
  };
}
