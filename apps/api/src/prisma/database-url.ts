import type { PoolConfig } from 'mariadb';

/**
 * Converts a `mysql://user:password@host:port/database` URL, the format the
 * Prisma CLI uses, into a MariaDB/MySQL driver pool configuration.
 */
export function toMariaDbConfig(databaseUrl: string): PoolConfig {
  const url = new URL(databaseUrl);

  if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
    throw new Error('DATABASE_URL must start with mysql://');
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    // Shared hosting limits concurrent connections per database user.
    connectionLimit: Number(url.searchParams.get('connection_limit') ?? 5),
  };
}
