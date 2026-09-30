import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { raw } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module.js';

// A production package places the built web app in `dist/public` so a single
// Node.js process serves both the site and the API.
const webRoot = fileURLToPath(new URL('./public', import.meta.url));

function serveWebApp(app: NestExpressApplication): void {
  const indexFile = join(webRoot, 'index.html');
  if (!existsSync(indexFile)) return;

  app.useStaticAssets(webRoot, { index: false });
  // Client-side routes such as /app/reports resolve to the single-page app.
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'GET' || request.path.startsWith('/api')) {
      next();
      return;
    }
    response.sendFile(indexFile);
  });
}

/**
 * How many reverse proxies sit in front of the app. Behind a proxy every
 * request would otherwise appear to come from the proxy's IP, which would put
 * all visitors in one rate-limit bucket. Trusting more hops than exist lets
 * clients forge their IP through X-Forwarded-For, so it defaults to none.
 */
function readTrustProxyHops(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 0;
  const hops = Number(value);
  if (!Number.isSafeInteger(hops) || hops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
  }
  return hops;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);
  const frontendUrl = config.get<string>(
    'FRONTEND_URL',
    'http://localhost:3005',
  );

  const trustProxyHops = readTrustProxyHops(
    config.get<string>('TRUST_PROXY_HOPS'),
  );
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  app.setGlobalPrefix('api');
  // Meal photos arrive as raw image bytes, so they skip the JSON body parser.
  app.use(
    '/api/nutrition/photo-analysis',
    raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '4mb' }),
  );
  serveWebApp(app);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  await app.listen(port, '0.0.0.0');
}

// No top-level await: hosts such as Hostinger load the entry file with
// require(), which rejects ES modules that use it.
void bootstrap();
