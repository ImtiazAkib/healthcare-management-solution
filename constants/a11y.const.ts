/**
 * The id the skip link points at, and the one every `<main>` carries.
 *
 * A constant rather than the string written in five places, because a skip link whose
 * target was renamed in one layout and not the others is a link that silently does
 * nothing — and it does nothing only for the people who use it, which is the group least
 * likely to be the one testing it.
 */
export const MAIN_CONTENT_ID = 'main-content';
