#!/usr/bin/env node
// Ensures the client (src/) never references server secrets, and that the built
// client bundle contains no model/provider names. Run in CI + pre-commit.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

let failed = false;
const fail = (msg) => {
  console.error('✗ ' + msg);
  failed = true;
};

// 1) src/ must not reference server-only env or secret keys.
const forbiddenInSrc = [
  'process.env.ANTHROPIC_API_KEY',
  'process.env.GEMINI_API_KEY',
  'process.env.PAYPAL_CLIENT_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'PAYPAL_CLIENT_SECRET',
];

const clientSourceExts = new Set(['.ts', '.tsx', '.js', '.jsx']);
const srcFiles = existsSync('src')
  ? walk('src').filter((file) => clientSourceExts.has(extname(file)))
  : [];
for (const file of srcFiles) {
  const content = readFileSync(file, 'utf8');
  for (const token of forbiddenInSrc) {
    if (content.includes(token)) fail(`${file} references server-only token: ${token}`);
  }
  // VITE_ vars must not carry secret-like names.
  const viteMatches = content.match(/VITE_[A-Z0-9_]+/g) ?? [];
  for (const v of viteMatches) {
    if (/(SECRET|SERVICE_ROLE|PRIVATE|CLIENT_SECRET|TOKEN)/.test(v)) {
      fail(`${file} uses a forbidden VITE_ env name: ${v}`);
    }
  }
}

// 2) If a client bundle exists (dist/assets), it must not leak model names.
const bannedInBundle = [
  'Claude',
  'claude-sonnet',
  // Do not ban bare "Gemini"; astrology libraries may emit it as zodiac copy.
  'Gemini API',
  'GEMINI_API_KEY',
  'gemini-3.1',
  'Anthropic',
  'model_name',
  'internal_provider',
];
const distAssets = 'dist/assets';
if (existsSync(distAssets)) {
  for (const f of walk(distAssets)) {
    if (!/\.(js|css)$/.test(f)) continue;
    const content = readFileSync(f, 'utf8');
    for (const term of bannedInBundle) {
      if (content.includes(term)) fail(`client bundle ${f} contains banned term: ${term}`);
    }
  }
} else {
  console.log('· dist/assets not found - skipping bundle scan (run after build for full check)');
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (failed) {
  console.error('\nClient env check FAILED.');
  process.exit(1);
}
console.log('✓ check:client-env passed');
