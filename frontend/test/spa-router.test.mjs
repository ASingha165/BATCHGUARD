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

test('CloudFront SPA Router - rewrites top-level SPA routes to /index.html', () => {
  const routes = ['/dashboard', '/batches', '/recalls', '/suppliers', '/distribution', '/vault', '/audit', '/settings'];
  for (const route of routes) {
    const event = createEvent(route);
    const result = handler(event);
    assert.equal(result.uri, '/index.html', `Route ${route} should rewrite to /index.html`);
  }
});

test('CloudFront SPA Router - rewrites deep nested SPA routes to /index.html', () => {
  const deepRoutes = [
    '/batches/BG-2024-8891-ORG',
    '/recalls/REC-2024-9910',
    '/distribution/nodes/US-EAST-DC-1',
    '/suppliers/SUP-1092/certifications'
  ];
  for (const route of deepRoutes) {
    const event = createEvent(route);
    const result = handler(event);
    assert.equal(result.uri, '/index.html', `Deep route ${route} should rewrite to /index.html`);
  }
});

test('CloudFront SPA Router - handles trailing slashes for SPA routes', () => {
  const event = createEvent('/dashboard/');
  const result = handler(event);
  assert.equal(result.uri, '/index.html');
});

test('CloudFront SPA Router - leaves assets directory paths untouched', () => {
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

test('CloudFront SPA Router - leaves files with extensions untouched to preserve S3 404s', () => {
  const filePaths = [
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/images/banner.png',
    '/missing-chunk.js'
  ];
  for (const filePath of filePaths) {
    const event = createEvent(filePath);
    const result = handler(event);
    assert.equal(result.uri, filePath, `File ${filePath} must not be rewritten`);
  }
});
