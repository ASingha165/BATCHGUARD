/**
 * CloudFront Function: BatchGuard SPA Router
 * Runtime: cloudfront-js-1.0 / cloudfront-js-2.0
 * Event Type: viewer-request
 *
 * Rewrites only valid React Router application paths to /index.html.
 * Preserves static assets and file extensions.
 * Unknown or unmapped paths are passed through unmodified to preserve native 404 responses from S3.
 */
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Check whether the URI is root or empty
    if (!uri || uri === '' || uri === '/') {
        request.uri = '/index.html';
        return request;
    }

    // Check if the URI is requesting a static asset or contains a file extension
    var segments = uri.split('/');
    var lastSegment = segments[segments.length - 1];

    if (uri.indexOf('/assets/') === 0 || lastSegment.indexOf('.') !== -1) {
        // Return request unmodified so S3 serves the actual asset or returns 404 if missing
        return request;
    }

    // Normalize path by removing trailing slash (unless root)
    var normalized = uri.replace(/\/+$/, '');
    if (normalized === '') {
        normalized = '/';
    }

    // Valid top-level static application routes defined in App.tsx
    var exactRoutes = [
        '/dashboard',
        '/batches',
        '/supply-chain',
        '/recalls',
        '/suppliers',
        '/evidence',
        '/audit-logs',
        '/settings'
    ];

    for (var i = 0; i < exactRoutes.length; i++) {
        if (normalized === exactRoutes[i]) {
            request.uri = '/index.html';
            return request;
        }
    }

    // Dynamic application routes:
    // 1. /batches/:batchId (e.g. /batches/BG-2024-8891-ORG)
    // 2. /recalls/:recallId (e.g. /recalls/REC-2024-9910)
    var batchMatch = /^\/batches\/[a-zA-Z0-9_\-\:\%]+$/;
    var recallMatch = /^\/recalls\/[a-zA-Z0-9_\-\:\%]+$/;

    if (batchMatch.test(normalized) || recallMatch.test(normalized)) {
        request.uri = '/index.html';
        return request;
    }

    // Unknown or unmapped routes:
    // Do NOT silently rewrite to /index.html. Return unmodified so S3 returns true 404.
    return request;
}

// Support CommonJS export for local automated testing in Node.js test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handler: handler };
}
