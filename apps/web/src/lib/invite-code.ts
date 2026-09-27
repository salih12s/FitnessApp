// Mirrors the API alphabet: no 0/O or 1/I.
const INVITE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

/**
 * Reads an invite code from what the user typed or pasted: the code itself
 * in any case, with spaces or dashes, or a whole `/app/join/<code>` link.
 * Returns null when no valid code is found.
 */
export function parseInviteInput(input: string): string | null {
  const trimmed = input.trim();
  const fromLink = /\/join\/([^/?#\s]+)/.exec(trimmed)?.[1];
  const code = (fromLink ?? trimmed).replace(/[\s-]/g, '').toUpperCase();
  return INVITE_PATTERN.test(code) ? code : null;
}

/** Shows a code in two groups of four for reading aloud: "ABCD 2345". */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

export function inviteLink(code: string, origin: string): string {
  return `${origin}/app/join/${code}`;
}
