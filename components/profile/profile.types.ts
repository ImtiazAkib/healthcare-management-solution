import type { ProfileDto } from '@/types';

/*
  Every profile piece — the summary, the read-only identity card, and the three edit forms — is
  handed the same assembled profile. Naming the prop shape once keeps them from drifting apart, and
  makes it obvious that these components read one record rather than a scatter of loose fields.
*/
export type ProfileProps = {
  profile: ProfileDto;
};
