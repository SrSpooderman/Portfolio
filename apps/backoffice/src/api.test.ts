// @vitest-environment happy-dom
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { api, login, setAccessToken } from './api';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); setAccessToken(''); });
afterAll(() => server.close());

describe('typed authenticated API client', () => {
  it('uses the OpenAPI login body and carries the access token', async () => {
    server.use(
      http.post('*/api/v1/auth/login', async ({ request }) => {
        expect(await request.json()).toEqual({ email: 'editor@example.com', password: 'secret123' });
        return HttpResponse.json({ access_token: 'test-token' });
      }),
      http.get('*/api/v1/auth/me', ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer test-token');
        return HttpResponse.json({ email: 'editor@example.com' });
      }),
    );
    await login('editor@example.com', 'secret123');
    await expect(api<{ email: string }>('auth/me')).resolves.toEqual({ email: 'editor@example.com' });
  });
});
