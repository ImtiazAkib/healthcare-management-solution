import { APP_DATA } from '@/constants/app-data.const';

import type { MailMessage } from './mail.types';

/**
 * Wrap a body in the one piece of chrome every message shares.
 *
 * Inline styles and a table-free layout on purpose: an email client is not a browser, and a
 * stylesheet it strips leaves the link unreadable. Plain enough to survive one.
 *
 * @param heading - The message's own title.
 * @param body - Paragraphs, already escaped.
 *
 * @returns The full HTML document.
 */
function wrap(heading: string, body: string): string {
  return [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#191c2b;max-width:34rem">',
    `<h1 style="font-size:1.25rem;margin:0 0 1rem">${heading}</h1>`,
    body,
    `<p style="margin:2rem 0 0;font-size:0.8rem;color:#666c85">${APP_DATA.NAME}</p>`,
    '</div>',
  ].join('');
}

/**
 * Escape text destined for an HTML body.
 *
 * Every value interpolated below is applicant-supplied — a name typed into a public registration
 * form — so it is escaped rather than trusted. "It is only an email" is how injection gets a
 * foothold, and the name also reaches the message an administrator may read.
 *
 * @param value - Untrusted text.
 *
 * @returns The same text, safe to interpolate.
 */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Confirm the address a patient registered with.
 *
 * It carries the link and a plain statement of what happens next: signing in waits on both this
 * confirmation and the hospital's approval, so the closing line is aimed at the person who did not
 * register — nothing was created in their name that can be used.
 *
 * @param to - The address being confirmed.
 * @param name - The applicant's name, as typed.
 * @param verifyUrl - Absolute URL carrying the token.
 *
 * @returns The rendered message.
 */
export function buildVerifyAddressMail(to: string, name: string, verifyUrl: string): MailMessage {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verifyUrl);

  return {
    to,
    subject: `Confirm your email address — ${APP_DATA.SHORT_NAME}`,
    text: [
      `Hello ${name},`,
      '',
      'Confirm this address to finish registering. It works once and expires in a day.',
      '',
      verifyUrl,
      '',
      'If you did not register, ignore this message — nothing was created in your name that can be used.',
    ].join('\n'),
    html: wrap(
      'Confirm your email address',
      [
        `<p>Hello ${safeName},</p>`,
        '<p>Confirm this address to finish registering. It works once and expires in a day.</p>',
        `<p><a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:0.6rem 1.1rem;border-radius:6px;text-decoration:none">Confirm my address</a></p>`,
        `<p style="font-size:0.85rem;color:#666c85">Or paste this into your browser:<br>${safeUrl}</p>`,
        '<p style="font-size:0.85rem;color:#666c85">If you did not register, ignore this message — nothing was created in your name that can be used.</p>',
      ].join('')
    ),
  };
}

/**
 * Set a new password from a link.
 *
 * Sent only to an address that already belongs to an account, so it speaks plainly. The closing
 * line is for somebody who did not ask — nothing changes until this link is followed, so an
 * unexpected message is safe to ignore and the current password still works.
 *
 * @param to - The account's address.
 * @param name - The account holder's name.
 * @param resetUrl - Absolute URL carrying the token.
 *
 * @returns The rendered message.
 */
export function buildPasswordResetMail(to: string, name: string, resetUrl: string): MailMessage {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  return {
    to,
    subject: `Reset your password — ${APP_DATA.SHORT_NAME}`,
    text: [
      `Hello ${name},`,
      '',
      'Use this link to set a new password. It works once and expires in a day:',
      '',
      resetUrl,
      '',
      'If you did not ask to reset your password, ignore this message — nothing changes and your current password still works.',
    ].join('\n'),
    html: wrap(
      'Reset your password',
      [
        `<p>Hello ${safeName},</p>`,
        '<p>Use this link to set a new password. It works once and expires in a day.</p>',
        `<p><a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:0.6rem 1.1rem;border-radius:6px;text-decoration:none">Set a new password</a></p>`,
        `<p style="font-size:0.85rem;color:#666c85">Or paste this into your browser:<br>${safeUrl}</p>`,
        '<p style="font-size:0.85rem;color:#666c85">If you did not ask to reset your password, ignore this message — nothing changes and your current password still works.</p>',
      ].join('')
    ),
  };
}
