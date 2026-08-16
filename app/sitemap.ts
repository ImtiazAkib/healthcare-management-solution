import type { MetadataRoute } from 'next';

import { SEO } from '@/constants';
import { env } from '@/env/server';

import { buildAbsoluteUrl } from '@/lib/utils';

/*
  One entry per public route, enumerated explicitly rather than derived from the filesystem.
  This app will grow routes that name a patient, and a sitemap that discovers its own
  entries would publish one the first time somebody forgot to think about it.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return SEO.PUBLIC_ROUTES.map(path => ({
    url: buildAbsoluteUrl(env.APP_BASE_URL, path),
    lastModified,
    changeFrequency: SEO.SITEMAP.CHANGE_FREQUENCY,
    priority: SEO.SITEMAP.HOME_PRIORITY,
  }));
}
