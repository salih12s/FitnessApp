import { describe, expect, it } from 'vitest';

import { formatInviteCode, inviteLink, parseInviteInput } from './invite-code';

describe('invite code input', () => {
  it('accepts codes in any case with spaces or dashes', () => {
    expect(parseInviteInput('abcd2345')).toBe('ABCD2345');
    expect(parseInviteInput(' ABCD 2345 ')).toBe('ABCD2345');
    expect(parseInviteInput('abcd-2345')).toBe('ABCD2345');
  });

  it('reads the code from a pasted join link', () => {
    expect(
      parseInviteInput('https://fitness.example.com/app/join/ABCD2345?x=1'),
    ).toBe('ABCD2345');
  });

  it('rejects wrong lengths and ambiguous characters', () => {
    expect(parseInviteInput('ABC2345')).toBeNull();
    expect(parseInviteInput('ABCD2340')).toBeNull();
    expect(parseInviteInput('ABCDI345')).toBeNull();
    expect(parseInviteInput('')).toBeNull();
  });

  it('formats codes and links for sharing', () => {
    expect(formatInviteCode('ABCD2345')).toBe('ABCD 2345');
    expect(inviteLink('ABCD2345', 'https://x.dev')).toBe(
      'https://x.dev/app/join/ABCD2345',
    );
  });
});
