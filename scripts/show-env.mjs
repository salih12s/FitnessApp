// Prints which environment apps/api/.env currently matches, without secrets.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const api = join(import.meta.dirname, '../apps/api');
const read = (name) =>
  existsSync(join(api, name)) ? readFileSync(join(api, name), 'utf8') : null;

const active = read('.env');
const mode =
  active === null
    ? 'NONE (no .env)'
    : active === read('.env.local')
      ? 'LOCAL'
      : active === read('.env.hostinger')
        ? 'PRODUCTION (Hostinger)'
        : 'CUSTOM (matches neither .env.local nor .env.hostinger)';

console.log(`  Active environment : ${mode}`);

const databaseUrl = active
  ?.split(/\r?\n/)
  .find((line) => line.startsWith('DATABASE_URL='));
if (databaseUrl) {
  try {
    const url = new URL(databaseUrl.slice('DATABASE_URL='.length).trim());
    console.log(
      `  Database           : ${decodeURIComponent(url.username)}@${url.hostname}:${url.port || 3306}${url.pathname}`,
    );
  } catch {
    console.log('  Database           : DATABASE_URL is not a valid URL');
  }
}
const value = (key) =>
  active
    ?.split(/\r?\n/)
    .find((line) => line.startsWith(`${key}=`))
    ?.split('=')[1];
console.log(`  FRONTEND_URL       : ${value('FRONTEND_URL') ?? '-'}`);
console.log(`  Secure cookies     : ${value('REFRESH_COOKIE_SECURE') ?? '-'}`);
