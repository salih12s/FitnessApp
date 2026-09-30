/**
 * Text from outside the app (a public food database, a model's answer):
 * control characters become spaces, whitespace is collapsed, and the result
 * is cut to `max` characters. Anything that is not a string becomes ''.
 */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';

  let text = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    text += code < 32 || code === 127 ? ' ' : character;
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}
