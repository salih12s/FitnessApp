import { Transform } from 'class-transformer';

/** Usernames are case-insensitive: 3-20 lowercase letters, digits, `.` or `_`. */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

export const NormalizeUsername = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
