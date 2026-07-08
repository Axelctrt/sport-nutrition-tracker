import { describe, expect, it } from 'vitest';

import { onRequest } from './reconcile.js';

describe('social identity reconciliation Pages Function adapter', () => {
  it('passes the Cloudflare Pages request to the shared handler', async () => {
    const response = await onRequest({
      request: new Request('https://example.test/api/social-identity/reconcile', {
        method: 'OPTIONS',
      }),
      env: {},
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toBe('POST,OPTIONS');
  });
});
