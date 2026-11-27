import { readFile, writeFile, mkdir, cp, rm, lstat, readdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const config = JSON.parse(await readFile('.deployment/site.json', 'utf8'));
const output = resolve(root, 'dist');
const previous = await lstat(output).catch(() => null);
if (previous?.isSymbolicLink()) throw new Error('dist no puede ser un enlace simbólico');
if (previous && !await lstat(resolve(output, '.generated-site')).catch(() => null)) {
  throw new Error('No se sobrescribe un dist ajeno: falta .generated-site');
}
if (previous) await rm(output, { recursive: true });
await mkdir(output, { recursive: true });
await writeFile(resolve(output, '.generated-site'), 'Salida regenerable de scripts/build.mjs\n');

async function copySafe(path) {
  const source = resolve(root, path);
  if (!relative(root, source) || relative(root, source).startsWith('..')) throw new Error('Ruta de publicación inválida');
  const stat = await lstat(source);
  if (stat.isSymbolicLink()) throw new Error('No se publican enlaces simbólicos');
  if (stat.isDirectory()) {
    for (const child of await readdir(source)) {
      if (child.startsWith('.') || /\.(?:env|db|sqlite|pem|key|py|bat|ps1|bundle)$/i.test(child)) {
        throw new Error('Archivo no publicable: ' + child);
      }
      await copySafe(path + '/' + child);
    }
  } else {
    if (stat.size > 25 * 1024 * 1024) throw new Error('Archivo mayor de 25 MiB: ' + path);
    await mkdir(dirname(resolve(output, path)), { recursive: true });
    await cp(source, resolve(output, path));
  }
}
for (const path of [...config.pages, ...config.assets, ...config.directories]) await copySafe(path);

const hashes = new Set();
async function inspect(path = output) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = resolve(path, entry.name);
    if (entry.isDirectory()) await inspect(file);
    else if (entry.name.endsWith('.html')) {
      let html = await readFile(file, 'utf8');
      if (!config.legalReady) {
        html = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');
        html = html.replace(/<head>/i, '<head>\n<meta name="robots" content="noindex, nofollow">');
        await writeFile(file, html);
      }
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (!/\bsrc\s*=/i.test(match[1])) hashes.add("'sha256-" + createHash('sha256').update(match[2]).digest('base64') + "'");
      }
    }
  }
}
await inspect();
const csp = [
  "default-src 'self'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'",
  "script-src 'self' https://challenges.cloudflare.com " + [...hashes].join(' '),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data:",
  "media-src 'self' blob:", "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com", "form-action 'self' https://www.paypal.com",
  'upgrade-insecure-requests',
].join('; ');
await writeFile(resolve(output, '_headers'), `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n  Strict-Transport-Security: max-age=31536000\n`);
await writeFile(resolve(output, 'robots.txt'), config.legalReady ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');
// Only contact calls reach Functions; static pages do not consume the daily request quota.
await writeFile(resolve(output, '_routes.json'), JSON.stringify({version: 1, include: ['/*'], exclude: ['/*']}));
console.log(`Preparado ${config.name}: dist/ (publicación comercial ${config.legalReady ? 'habilitada' : 'pendiente de datos legales'})`);
