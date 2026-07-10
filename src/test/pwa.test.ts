import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('PWA assets', () => {
  it('manifest exists with correct name/short_name/theme_color', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(m.name).toBe('MYSTIC 命理探索');
    expect(m.short_name).toBe('MYSTIC');
    expect(m.theme_color).toBe('#050508');
    expect(m.display).toBe('standalone');
  });

  it('required icons + apple-touch-icon exist', () => {
    for (const f of [
      'public/icons/icon-192.png',
      'public/icons/icon-512.png',
      'public/icons/maskable-192.png',
      'public/icons/maskable-512.png',
      'public/apple-touch-icon.png',
    ]) {
      expect(existsSync(f), `${f} should exist`).toBe(true);
    }
  });

  it('offline.html exists', () => {
    expect(existsSync('public/offline.html')).toBe(true);
    expect(existsSync('public/guide.webp')).toBe(true);
  });

  it('index.html has iOS + PWA meta tags', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('apple-mobile-web-app-title');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('manifest.webmanifest');
    expect(html).toContain('theme-color');
  });
});

describe('vercel.json SPA config', () => {
  it('rewrites non-api routes to index.html but excludes /api', () => {
    const v = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const rewrite = v.rewrites[0];
    expect(rewrite.destination).toBe('/index.html');
    expect(rewrite.source).toContain('api');
  });
});

describe('service worker never caches private routes', () => {
  it('vite config marks api/auth/admin/payments/paypal as NetworkOnly / denylist', () => {
    const cfg = readFileSync('vite.config.ts', 'utf8');
    expect(cfg).toContain('NetworkOnly');
    for (const p of ['api', 'auth', 'admin', 'payments', 'paypal']) {
      expect(cfg).toContain(p);
    }
    expect(cfg).toContain('DashboardScreen-*.js');
    expect(cfg).toContain('mystic-route-scripts');
  });
});

describe('PayPal links are exactly the required NCP URLs', () => {
  it('99 and 299 links match', () => {
    const env = readFileSync('.env.example', 'utf8');
    expect(env).toContain('https://www.paypal.com/ncp/payment/WXRQLYEH8TSFJ');
    expect(env).toContain('https://www.paypal.com/ncp/payment/NSQVJ9TZC3C88');
  });
});
