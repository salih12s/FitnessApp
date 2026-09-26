// Builds a single Node.js package for Hostinger: the NestJS API in `dist`
// serves the built web app from `dist/public` on the same domain.
// Usage: npm run package:hostinger  ->  deploy/fitness-app-hostinger.zip
import { execSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const deployDir = join(root, 'deploy');
const packageDir = join(deployDir, 'hostinger');
const archive = join(deployDir, 'fitness-app-hostinger.zip');

function run(command, env = {}) {
  console.log(`> ${command}`);
  execSync(command, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

// Only replace this script's output; other files in deploy/ are kept.
rmSync(packageDir, { recursive: true, force: true });
rmSync(archive, { force: true });
mkdirSync(packageDir, { recursive: true });

// The site and the API share an origin, so the web app calls a relative path.
run('npm run build --workspace @fitness-app/web', { VITE_API_URL: '/api' });
run('npm run build --workspace @fitness-app/api');

cpSync(join(root, 'apps/api/dist'), join(packageDir, 'dist'), {
  recursive: true,
});
cpSync(join(root, 'apps/web/dist'), join(packageDir, 'dist/public'), {
  recursive: true,
});

// CommonJS entry for hosts that load the app with require(): it works on every
// Node.js version and logs startup failures before exiting.
writeFileSync(
  join(packageDir, 'dist/main.cjs'),
  `import('./main.js').catch((error) => {
  console.error('FitnessApp could not start:', error);
  process.exit(1);
});
`,
);

const apiPackage = JSON.parse(
  readFileSync(join(root, 'apps/api/package.json'), 'utf8'),
);
writeFileSync(
  join(packageDir, 'package.json'),
  `${JSON.stringify(
    {
      name: 'fitness-app',
      version: apiPackage.version,
      private: true,
      type: 'module',
      main: 'dist/main.cjs',
      engines: { node: '>=22' },
      scripts: {
        // Everything is prebuilt locally; the host only installs dependencies.
        build: 'node -e "console.log(\'Prebuilt package\')"',
        start: 'node dist/main.cjs',
      },
      dependencies: apiPackage.dependencies,
    },
    null,
    2,
  )}\n`,
);
// Hostinger deploys only the output directory for NestJS apps, so `dist` must
// carry its own module type and dependency list.
writeFileSync(
  join(packageDir, 'dist/package.json'),
  `${JSON.stringify(
    {
      name: 'fitness-app',
      version: apiPackage.version,
      private: true,
      type: 'module',
      main: 'main.cjs',
      engines: { node: '>=22' },
      scripts: { start: 'node main.cjs' },
      dependencies: apiPackage.dependencies,
    },
    null,
    2,
  )}\n`,
);

// Pin the exact dependency versions the host installs.
execSync(
  'npm install --package-lock-only --ignore-scripts --no-audit --no-fund',
  {
    cwd: packageDir,
    stdio: 'inherit',
  },
);

cpSync(
  join(packageDir, 'package-lock.json'),
  join(packageDir, 'dist/package-lock.json'),
);

// Windows ships bsdtar, which writes zip archives with portable paths. Call it
// explicitly: Git Bash puts GNU tar first on PATH, which cannot write zip files.
const tar =
  process.platform === 'win32'
    ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
    : 'bsdtar';
execSync(
  `"${tar}" -a -c -f ../fitness-app-hostinger.zip package.json package-lock.json dist`,
  { cwd: packageDir, stdio: 'inherit' },
);
console.log(`\nHazır: ${archive}`);
