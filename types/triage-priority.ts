/**
 * How urgently somebody needs to be seen, set by a nurse at check-in in step 14.
 *
 * It reorders the queue ahead of token order, which is the only reason it exists: a token
 * number is fair, and fairness is not the right rule when somebody is having a cardiac
 * event in the waiting room.
 */
export type TriagePriority = 'routine' | 'urgent' | 'emergency';
