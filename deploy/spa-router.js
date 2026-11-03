/**
 * CloudFront Function: BatchGuard SPA Router
 * Runtime: cloudfront-js-1.0 / cloudfront-js-2.0
 * Event Type: viewer-request
 *
 * Rewrites extensionless client-side SPA routes to /index.html while preserving
 * static assets, images, chunks, and files with extensions.
 * This avoids distribution-wide 403/404 error responses that mask missing chunks.
 */
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Check whether the URI is missing or root
    if (!uri || uri === '' || uri === '/') {
        request.uri = '/index.html';
        return request;
    }

    // Check if the URI is requesting a specific file or asset
    // Any URI starting with /assets/ or containing a dot in the final path segment is considered a file
    var segments = uri.split('/');
    var lastSegment = segments[segments.length - 1];

    if (uri.indexOf('/assets/') === 0 || lastSegment.indexOf('.') !== -1) {
        // Return request unmodified so S3 serves the actual asset or returns 404 if missing
        return request;
    }

    // For extensionless client-side SPA routes (e.g. /dashboard, /batches/BG-2024-8891-ORG)
    // rewrite request URI to /index.html
    request.uri = '/index.html';
    return request;
}

// Support CommonJS export for local automated testing in Node.js test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handler: handler };
}
