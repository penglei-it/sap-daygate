import { expect, test } from '@playwright/test';

test.describe('DayGate smoke', () => {
  test('onboarding to today task entry', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/');
    await expect(page.getByText('先选「你是谁」')).toBeVisible();

    await page.getByLabel('怎么称呼你').fill('E2E学习者');
    await page.getByTestId('start-day-1').click();

    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
    await expect(page.getByTestId('enter-task')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('enter-task').click();
    await expect(page.getByText('学习路径')).toBeVisible();
    await expect(page.getByText('成果验收测试')).toBeVisible();
  });

  test('settings exposes local-only risk copy', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await page.getByTestId('start-day-1').click();
    await page.getByRole('link', { name: '设置' }).click();
    await expect(page.getByText('Local-only')).toBeVisible();
    await expect(page.getByRole('button', { name: '从镜像恢复' })).toBeVisible();
  });
});
