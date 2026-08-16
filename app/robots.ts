import type { MetadataRoute } from 'next';

/*
  Everything is blocked until a deployment opts into indexing. Step 2 puts this behind the
  validated `ROBOTS_ENABLED` flag and adds the sitemap reference; the default it gates on
  stays exactly what is written here, because getting a staging site back out of the index
  is far more work than setting one variable.
*/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
