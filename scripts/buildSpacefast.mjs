// Build a static SPA plus a same-origin ESPN Function for Spacefast.
import { spawnSync } from 'node:child_process';
import { mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const build = spawnSync('npm', ['run', 'build'], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, VITE_ESPN_PROXY_URL: '/api/espn-proxy', VITE_YAHOO_API_URL: '' },
});
if (build.status !== 0) process.exit(build.status || 1);
const output = resolve(root, 'dist');
// These inherited Pages files must not configure the new Space's domain or routing.
for (const file of ['CNAME', '404.html', 'sitemap.xml']) await rm(resolve(output, file), { force: true });
await mkdir(resolve(output, 'functions/api'), { recursive: true });
await mkdir(resolve(output, 'functions/_legacy'), { recursive: true });
for (const file of ['espn-proxy.js', '_cors.js', 'spacefastAdapter.js']) {
  await copyFile(resolve(root, 'api', file), resolve(output, 'functions/_legacy', file));
}
await writeFile(resolve(output, 'functions/api/espn-proxy.js'), `import handler from '../_legacy/espn-proxy.js';
import { serveEspn } from '../_legacy/spacefastAdapter.js';
export default request => serveEspn(request, handler);
`);
// Yahoo needs a separately configured developer app. Fail clearly until it exists.
for (const route of ['yahoo-auth', 'yahoo-callback', 'yahoo-refresh', 'yahoo-api']) {
  await writeFile(resolve(output, 'functions/api', route + '.js'), `export default () => Response.json({ error: 'Yahoo is not configured on this hosted install. Set up a Yahoo developer app and hosted login service first.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
`);
}
console.log('Spacefast output ready: SPA and same-origin ESPN proxy. Yahoo requires hosted setup.');
