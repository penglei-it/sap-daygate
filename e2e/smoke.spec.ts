import { expect, test } from '@playwright/test';

/** Completes the 3-step onboarding wizard. */
async function finishOnboarding(page: import('@playwright/test').Page) {
  await expect(page.getByText('你是谁')).toBeVisible();
  await page.getByLabel('怎么称呼你').fill('E2E学习者');
  await page.getByRole('button', { name: '下一步：选课程' }).click();
  await page.getByRole('button', { name: '下一步：监护设置' }).click();
  await page.getByTestId('start-day-1').click();
}

test.describe('DayGate smoke', () => {
  test('onboarding to today task entry', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/');
    await finishOnboarding(page);

    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
    await expect(page.getByTestId('enter-task')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('enter-task').click();
    await page.getByRole('button', { name: '跳过计时，直接验收' }).click();
    await expect(page.getByText('学习路径')).toBeVisible();
    await expect(page.getByText('成果验收测试')).toBeVisible();
  });

  test('settings exposes backup hub and browser-copy restore', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await finishOnboarding(page);
    await page.getByRole('link', { name: '设置' }).click();
    await expect(page.getByTestId('backup-hub')).toBeVisible();
    await expect(page.getByText('保护学习进度')).toBeVisible();
    await expect(page.getByRole('button', { name: '下载备份文件' })).toBeVisible();
    await page.getByText(/展开急救选项/).click();
    await expect(
      page.getByRole('button', { name: '尝试从浏览器副本找回' }),
    ).toBeVisible();
  });
});
