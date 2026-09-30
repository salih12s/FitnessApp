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

  const isLoopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    // Shared hosting limits concurrent connections per database user.
    connectionLimit: Number(url.searchParams.get('connection_limit') ?? 5),
    // MySQL 8+ (caching_sha2_password) needs the server's RSA key on a plain
    // TCP login; that is safe on the loopback interface, so local dev works.
    allowPublicKeyRetrieval: isLoopback,
  };
}
