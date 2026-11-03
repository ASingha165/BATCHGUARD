import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spaRouterPath = path.resolve(__dirname, '../../deploy/spa-router.js');

const { handler } = require(spaRouterPath);

function createEvent(uri) {
  return {
    version: '1.0',
    context: {
      eventType: 'viewer-request'
    },
    viewer: {
      ip: '198.51.100.1'
    },
    request: {
      method: 'GET',
      uri: uri,
      headers: {},
      cookies: {},
      querystring: {}
    }
  };
}

test('CloudFront SPA Router - rewrites root / to /index.html', () => {
  const event = createEvent('/');
  const result = handler(event);
  assert.equal(result.uri, '/index.html');
});

test('CloudFront SPA Router - rewrites empty URI to /index.html', () => {
  const event = createEvent('');
  const result = handler(event);
  assert.equal(result.uri, '/index.html');
});

test('CloudFront SPA Router - rewrites all valid exact application routes to /index.html', () => {
  const validRoutes = [
    '/dashboard',
    '/batches',
    '/supply-chain',
    '/recalls',
    '/suppliers',
    '/evidence',
    '/audit-logs',
    '/settings'
  ];
  for (const route of validRoutes) {
    const event = createEvent(route);
    const result = handler(event);
    assert.equal(result.uri, '/index.html', `Valid route ${route} should rewrite to /index.html`);
  }
});

test('CloudFront SPA Router - rewrites dynamic routes with parameters to /index.html', () => {
  const dynamicRoutes = [
    '/batches/BG-2024-8891-ORG',
    '/batches/LOT-2024-001',
    '/batches/batch_123',
    '/recalls/REC-2024-9910',
    '/recalls/REC-001'
  ];
  for (const route of dynamicRoutes) {
    const event = createEvent(route);
    const result = handler(event);
    assert.equal(result.uri, '/index.html', `Dynamic route ${route} should rewrite to /index.html`);
  }
});

test('CloudFront SPA Router - handles trailing slashes for valid application routes', () => {
  const trailingSlashRoutes = [
    '/dashboard/',
    '/batches/',
    '/batches/BG-2024-8891-ORG/',
    '/recalls/REC-2024-9910/'
  ];
  for (const route of trailingSlashRoutes) {
    const event = createEvent(route);
    const result = handler(event);
    assert.equal(result.uri, '/index.html', `Route with trailing slash ${route} should rewrite to /index.html`);
  }
});

test('CloudFront SPA Router - preserves static assets directory paths without rewriting', () => {
  const assetPaths = [
    '/assets/index-8u6H-HHB.css',
    '/assets/index-Du-zKfaP.js',
    '/assets/vendor-chunk.js'
  ];
  for (const asset of assetPaths) {
    const event = createEvent(asset);
    const result = handler(event);
    assert.equal(result.uri, asset, `Asset ${asset} must not be rewritten`);
  }
});

test('CloudFront SPA Router - preserves requests containing file extensions to maintain native S3 404s', () => {
  const filePaths = [
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/images/banner.png',
    '/missing-chunk.js',
    '/styles.css'
  ];
  for (const filePath of filePaths) {
    const event = createEvent(filePath);
    const result = handler(event);
    assert.equal(result.uri, filePath, `File ${filePath} must not be rewritten`);
  }
});

test('CloudFront SPA Router - DOES NOT rewrite unknown or unmapped routes to /index.html', () => {
  const unknownRoutes = [
    '/unknown-path',
    '/admin/login',
    '/api/v1/batches',
    '/test-page',
    '/batches/too/many/nested/levels',
    '/recalls/REC-1/extra'
  ];
  for (const route of unknownRoutes) {
    const event = createEvent(route);
    const result = handler(event);
    assert.equal(
      result.uri,
      route,
      `Unknown route ${route} must NOT be rewritten to /index.html so S3 returns native 404`
    );
  }
});
