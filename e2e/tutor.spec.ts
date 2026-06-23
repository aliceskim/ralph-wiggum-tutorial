import { test, expect } from '@playwright/test';

test.describe('Socratic Tutor Page', () => {
  test('user message persists across reloads', async ({ page }) => {
    await page.goto('/tutor');

    const input = page.locator('input[placeholder="Your reply to the tutor..."]');
    await expect(input).toBeVisible();

    await input.fill('persist-test');
    await input.press('Enter');

    const msg = page.locator('text=persist-test');
    await expect(msg).toBeVisible();

    // reload and assert message still visible (persistence)
    await page.reload();
    const msgAfter = page.locator('text=persist-test');
    await expect(msgAfter).toBeVisible();
  });
});
