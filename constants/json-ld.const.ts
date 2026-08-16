import { Graph } from 'schema-dts';

import { APP_DATA } from './app-data.const';

type JsonLdGraphInput = {
  baseUrl: string;
  description: string;
};

/**
 * Build the structured-data graph for a public page.
 *
 * A builder rather than a static object, because the base URL is server-only environment
 * and `constants/index.ts` is imported by client components — a static object would drag
 * `env/server` into the client bundle.
 *
 * Nodes are cross-linked by `@id` fragments rather than repeated inline, so `publisher`
 * resolves to the organization node inside the same document.
 *
 * The organization is the project itself. Once a real facility's identity is known this
 * becomes a `MedicalOrganization` with its address, contact details and accreditation —
 * inventing those now would put false clinical credentials in front of crawlers, which is
 * a worse thing to publish than a vague one.
 *
 * @param input - Absolute origin and the page description.
 *
 * @returns A schema.org graph, typed against the vocabulary.
 */
export function buildJsonLdGraph({ baseUrl, description }: JsonLdGraphInput): Graph {
  const organizationId = `${baseUrl}/#organization`;
  const homeUrl = `${baseUrl}/`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: APP_DATA.NAME,
        alternateName: APP_DATA.SHORT_NAME,
        url: homeUrl,
        description,
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        name: APP_DATA.NAME,
        url: homeUrl,
        description,
        inLanguage: 'en',
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#application`,
        name: APP_DATA.SHORT_NAME,
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web',
        url: homeUrl,
        description,
        inLanguage: 'en',
        publisher: { '@id': organizationId },
      },
    ],
  };
}
