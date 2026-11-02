import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure URL normalization logic mirroring frontend/src/services/api.ts
 */
function buildApiUrl(baseUrl, endpoint) {
  const base = (baseUrl || '').trim().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!base) {
    return cleanEndpoint.startsWith('/v1') ? cleanEndpoint : `/v1${cleanEndpoint}`;
  }

  // If base already contains /v1 at the end
  if (base.endsWith('/v1')) {
    if (cleanEndpoint.startsWith('/v1')) {
      return `${base}${cleanEndpoint.slice(3)}`;
    }
    return `${base}${cleanEndpoint}`;
  }

  // Base is the stage root (e.g. https://.../dev)
  if (cleanEndpoint.startsWith('/v1')) {
    return `${base}${cleanEndpoint}`;
  }
  return `${base}/v1${cleanEndpoint}`;
}

/**
 * Pure JWT decode logic mirroring frontend/src/services/auth.ts
 */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * MFA challenge payload validation mirroring authService.login and respondToMfaChallenge
 */
function parseInitiateAuthResponse(data, username) {
  if (data.ChallengeName) {
    if (data.ChallengeName === 'SOFTWARE_TOKEN_MFA' || data.ChallengeName === 'SMS_MFA') {
      return {
        mfaRequired: true,
        challengeName: data.ChallengeName,
        challengeSession: data.Session,
        username,
      };
    }
    throw new Error(`Cognito challenge '${data.ChallengeName}' is not currently supported in this client.`);
  }

  if (data.AuthenticationResult?.IdToken) {
    return {
      session: {
        idToken: data.AuthenticationResult.IdToken,
        username,
      },
    };
  }

  throw new Error('Missing authentication tokens or unknown challenge');
}

test('API URL Contract - stage URL without /v1 appends /v1 cleanly', () => {
  const base = 'https://xyz123.execute-api.us-east-1.amazonaws.com/dev';
  const url = buildApiUrl(base, '/batches');
  assert.equal(url, 'https://xyz123.execute-api.us-east-1.amazonaws.com/dev/v1/batches');
});

test('API URL Contract - base URL already containing /v1 does not produce /v1/v1', () => {
  const base = 'https://xyz123.execute-api.us-east-1.amazonaws.com/dev/v1';
  const url = buildApiUrl(base, '/batches');
  assert.equal(url, 'https://xyz123.execute-api.us-east-1.amazonaws.com/dev/v1/batches');
  assert.ok(!url.includes('/v1/v1'), 'Must not contain duplicate /v1/v1');
});

test('API URL Contract - endpoint starting with /v1 does not produce /v1/v1 with /v1 base', () => {
  const base = 'https://xyz123.execute-api.us-east-1.amazonaws.com/dev/v1';
  const url = buildApiUrl(base, '/v1/recalls');
  assert.equal(url, 'https://xyz123.execute-api.us-east-1.amazonaws.com/dev/v1/recalls');
});

test('API URL Contract - trailing slashes on base are handled gracefully', () => {
  const base = 'https://xyz123.execute-api.us-east-1.amazonaws.com/dev///';
  const url = buildApiUrl(base, 'suppliers');
  assert.equal(url, 'https://xyz123.execute-api.us-east-1.amazonaws.com/dev/v1/suppliers');
});

test('API URL Contract - empty base defaults to /v1 relative path', () => {
  const url = buildApiUrl('', '/audit/logs');
  assert.equal(url, '/v1/audit/logs');
});

test('Cognito JWT Payload Decoder - extracts claims correctly', () => {
  const payload = {
    sub: 'user-uuid-999',
    email: 'sarah.chen@apexnutrition.internal',
    'custom:org_id': 'ORG#apex-foods-north-america',
    'cognito:groups': ['COMPLIANCE_OFFICER', 'ADMIN'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const syntheticJwt = `header.${b64Payload}.signature`;

  const decoded = decodeJwtPayload(syntheticJwt);
  assert.equal(decoded.sub, 'user-uuid-999');
  assert.equal(decoded.email, 'sarah.chen@apexnutrition.internal');
  assert.equal(decoded['custom:org_id'], 'ORG#apex-foods-north-america');
  assert.deepEqual(decoded['cognito:groups'], ['COMPLIANCE_OFFICER', 'ADMIN']);
});

test('Cognito JWT Payload Decoder - handles invalid tokens safely', () => {
  assert.equal(decodeJwtPayload('invalid-token'), null);
  assert.equal(decodeJwtPayload('part1.part2'), null);
  assert.equal(decodeJwtPayload(''), null);
});

test('Cognito MFA Handling - detects SOFTWARE_TOKEN_MFA challenge and session', () => {
  const cognitoChallengeResponse = {
    ChallengeName: 'SOFTWARE_TOKEN_MFA',
    Session: 'MFA_SESSION_TOKEN_ABC123',
    ChallengeParameters: {
      USER_ID_FOR_SRP: 'sarah.chen',
    },
  };

  const result = parseInitiateAuthResponse(cognitoChallengeResponse, 'sarah.chen');
  assert.equal(result.mfaRequired, true);
  assert.equal(result.challengeName, 'SOFTWARE_TOKEN_MFA');
  assert.equal(result.challengeSession, 'MFA_SESSION_TOKEN_ABC123');
  assert.equal(result.username, 'sarah.chen');
});

test('Cognito MFA Handling - rejects unsupported challenges cleanly', () => {
  const unsupportedResponse = {
    ChallengeName: 'CUSTOM_CHALLENGE_UNKNOWN',
    Session: 'SESSION_XYZ',
  };

  assert.throws(
    () => parseInitiateAuthResponse(unsupportedResponse, 'test.user'),
    /Cognito challenge 'CUSTOM_CHALLENGE_UNKNOWN' is not currently supported/
  );
});

test('Cognito MFA Handling - handles direct authentication without MFA when not enrolled', () => {
  const directResponse = {
    AuthenticationResult: {
      IdToken: 'valid.id.token',
      AccessToken: 'valid.access.token',
      ExpiresIn: 3600,
    },
  };

  const result = parseInitiateAuthResponse(directResponse, 'compliance.officer');
  assert.equal(result.session.idToken, 'valid.id.token');
  assert.equal(result.session.username, 'compliance.officer');
});
