import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api';
import { getAuthErrorMessage } from './auth-api';

describe('getAuthErrorMessage', () => {
  it('explains wrong credentials for 401', () => {
    expect(getAuthErrorMessage(new ApiError('x', 401))).toBe(
      'Kullanıcı adı veya şifre hatalı.',
    );
  });

  it('asks the user to wait when rate limited (429)', () => {
    expect(getAuthErrorMessage(new ApiError('ThrottlerException', 429))).toBe(
      'Çok fazla deneme yaptın. Birkaç dakika bekleyip tekrar dene.',
    );
  });

  it('tells the visitor the demo is busy (503)', () => {
    expect(getAuthErrorMessage(new ApiError('busy', 503))).toBe(
      'Demo şu an yoğun. Birkaç saniye sonra tekrar dene.',
    );
  });

  it('reports an unreachable server for non-API errors', () => {
    expect(getAuthErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Sunucuya ulaşılamadı. Lütfen tekrar dene.',
    );
  });
});
