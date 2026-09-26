/** Mirrors the API rule: 3-20 lowercase letters, digits, `.` or `_`. */
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}
