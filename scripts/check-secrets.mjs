#!/usr/bin/env node
// Fails if secrets are committed or hardcoded. Run in CI + pre-commit.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

let failed = false;
const fail = (msg) => {
  console.error('✗ ' + msg);
  failed = true;
};

// 1) .env must not be tracked by git.
try {
  const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
  const bad = tracked.filter((f) => /^\.env($|\.)/.test(f) && f !== '.env.example');
  if (bad.length) fail(`.env files are tracked by git: ${bad.join(', ')}`);
} catch {
  // not a git repo in this context - skip
}

// 2) Scan source for hardcoded secret patterns.
const patterns = [
  { re: /sk-[A-Za-z0-9]{16,}/, name: 'sk- style API key' },
  { re: /ANTHROPIC_API_KEY\s*[:=]\s*["'][^"'\s]{12,}["']/, name: 'hardcoded ANTHROPIC_API_KEY' },
  { re: /GEMINI_API_KEY\s*[:=]\s*["'][^"'\s]{12,}["']/, name: 'hardcoded GEMINI_API_KEY' },
  { re: /PAYPAL_CLIENT_SECRET\s*[:=]\s*["'][^"'\s]{12,}["']/, name: 'hardcoded PAYPAL_CLIENT_SECRET' },
  { re: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"'\s]{12,}["']/, name: 'hardcoded service role key' },
  { re: /password\s*[:=]\s*["']superadmin["']/i, name: 'hardcoded admin password' },
  { re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/, name: 'embedded JWT service key' },
];

const files = listSourceFiles(['src', 'api', 'shared', 'scripts'])
  // The checker scripts themselves contain the detection patterns as literals,
  // so exclude them to avoid self-matching false positives.
  .filter((f) => !/check-(secrets|client-env)\.mjs$/.test(f));

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const { re, name } of patterns) {
    if (re.test(content)) fail(`${name} found in ${file}`);
  }
}

function listSourceFiles(roots) {
  const exts = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
  const out = [];

  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['.git', 'dist', 'node_modules'].includes(entry.name)) walk(path);
        continue;
      }
      if (entry.isFile() && exts.has(extname(entry.name))) {
        out.push(path.replaceAll('\\', '/'));
      }
    }
  };

  for (const root of roots) walk(root);
  return out;
}

if (!existsSync('.env.example')) fail('.env.example is missing');

if (failed) {
  console.error('\nSecret check FAILED.');
  process.exit(1);
}
console.log('✓ check:secrets passed');
