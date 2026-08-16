/**
 * Recorded because clinical reference ranges and some diagnoses depend on it, not for
 * demographics. `other` exists so the form never forces a wrong answer, and the field is
 * optional on the model so it can also be left unanswered.
 */
export type Gender = 'male' | 'female' | 'other';
