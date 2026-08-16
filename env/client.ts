import { createEnv } from '@t3-oss/env-nextjs';

/*
  Browser-visible environment. Deliberately empty — the app has no `NEXT_PUBLIC_*` variable
  yet. The file exists so the first one is declared here and validated, rather than read
  straight off `process.env` somewhere in a component.
*/
export const env = createEnv({
  client: {},
  experimental__runtimeEnv: {},
});
