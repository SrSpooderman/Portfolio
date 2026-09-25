import { expect, test } from '@playwright/test';

test('loads lazy backoffice tools without failed stylesheets or CSP violations', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { access_token: 'e2e-token' } }));
  await page.route('**/api/v1/admin/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/analytics/overview')) return route.fulfill({ json: { visitors: 1, page_views: 2, project_views: 0, external_clicks: 0, total: 2, by_type: { page_view: 2 }, by_device: { desktop: 2 }, by_browser: { Chrome: 2 } } });
    if (path.endsWith('/analytics/timeseries')) return route.fulfill({ json: [{ date: '2026-09-25', count: 2 }] });
    if (path.endsWith('/analytics/funnels')) return route.fulfill({ json: [{ event_type: 'page_view', visitors: 1, conversion: 100 }] });
    return route.fulfill({ json: [] });
  });
  await page.goto('/backoffice/');
  await expect(page.getByTitle('assets')).toBeVisible();
  await page.getByTitle('assets').click();
  await expect(page.getByText(/Imágenes, MP4 o PDF/)).toBeVisible();
  await page.getByTitle('analytics').click();
  await expect(page.getByText('Actualizar analytics')).toBeVisible();
  await page.getByText('Actualizar analytics').click();
  await expect(page.getByRole('heading', { name: 'Actividad diaria' })).toBeVisible();
  expect(browserErrors.filter(error => /stylesheet|content security policy|preload css/i.test(error))).toEqual([]);
});
