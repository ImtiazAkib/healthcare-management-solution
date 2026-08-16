import { Graph } from 'schema-dts';

type JsonLdProps = {
  data: Graph;
};

/*
  Structured data is a script tag, not markup React can render as children — hence
  `dangerouslySetInnerHTML`, which is Next's documented approach. The `Graph` type comes
  from schema-dts, so a node that does not exist in the schema.org vocabulary is a compile
  error rather than something a validator finds after deployment.

  Ships no client JavaScript.
*/
export function JsonLd({ data }: JsonLdProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
