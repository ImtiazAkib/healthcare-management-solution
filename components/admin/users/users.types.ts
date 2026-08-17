/**
 * Who is looking at the screen, and therefore what it may offer them.
 *
 * The screen uses this to decide which roles the create form lists and which actions a row
 * carries. It is a courtesy, not a control — `UserService` refuses the same operations
 * whatever the browser sends, so a button that should not be there is a cosmetic bug rather
 * than a hole.
 */
export type UsersViewer = {
  userId: string;
  isSuperAdmin: boolean;
};
