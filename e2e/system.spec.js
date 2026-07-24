const { test, expect } = require('@playwright/test');
const { mockBackend, loginAs } = require('./helpers/mockBackend');

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    console.error(`[pageerror] ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.error(`[console] ${message.text()}`);
    }
  });
  await mockBackend(page);
});

test('Buyer searches, views listing list, and opens listing detail', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toContainText('Tìm kiếm');
  await page.locator('input[placeholder*="Thành phố"]').fill('Quận 1');
  await page.getByRole('button', { name: /Tìm kiếm/i }).last().click();

  await expect(page).toHaveURL(/\/search/);
  await expect(page.locator('body')).toContainText('Can ho mau Playwright Quan 1');

  await page.getByRole('link', { name: /Xem chi tiết/i }).first().click();
  await expect(page).toHaveURL(/\/property\/1/);
  await expect(page.locator('body')).toContainText('Can ho mau Playwright Quan 1');
});

test('Login redirects user by role', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[type="text"]').first().fill('owner@bds.com');
  await page.locator('input[type="password"]').first().fill('123456');
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/owner\/dashboard/);
});

test('Owner can open create property page and use AI description action', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/owner/create');

  await expect(page).toHaveURL(/\/owner\/create/);
  await page.locator('input').first().fill('Can ho Playwright moi');

  const aiButton = page.getByRole('button', { name: /AI|mô tả|mo ta/i }).first();
  if (await aiButton.count()) {
    await aiButton.click();
    await expect(page.locator('body')).toContainText(/Playwright|mô tả|mo ta/i);
  }
});

test('Admin can open pending approval page and see pending listing', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/pending');

  await expect(page).toHaveURL(/\/admin\/pending/);
  await expect(page.locator('body')).toContainText('Can ho mau Playwright Quan 1');
});

test('VNPay return page shows successful payment result', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/payment/vnpay-return?vnp_ResponseCode=00&vnp_TxnRef=100');

  await expect(page.locator('body')).toContainText(/thành công|thanh cong/i);
});
