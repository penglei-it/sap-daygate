import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../src/App';
import { useDayGate } from '../src/hooks/useDayGate';

function Root() {
  const api = useDayGate();
  return (
    <MemoryRouter>
      <App api={api} />
    </MemoryRouter>
  );
}

/** Walks the 3-step onboarding wizard to the finish button. */
async function completeOnboardingWizard(
  user: ReturnType<typeof userEvent.setup>,
) {
  expect(await screen.findByText('你是谁')).toBeTruthy();
  const nameInput = screen.getByLabelText('怎么称呼你');
  await user.clear(nameInput);
  await user.type(nameInput, '组件测试用户');
  await user.click(screen.getByRole('button', { name: '下一步：选课程' }));
  await user.click(screen.getByRole('button', { name: '下一步：监护设置' }));
  await user.click(screen.getByTestId('start-day-1'));
}

describe('app smoke (jsdom)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('completes onboarding and reaches today surface', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<Root />);
    await completeOnboardingWizard(user);

    expect(await screen.findByTestId('enter-task')).toBeTruthy();
    await user.click(screen.getByTestId('enter-task'));
    expect(await screen.findByText('学习路径')).toBeTruthy();
    expect(screen.getByText('成果验收测试')).toBeTruthy();
  });

  it('settings shows backup hub and browser-copy restore', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<Root />);
    await completeOnboardingWizard(user);
    await user.click(await screen.findByRole('link', { name: '设置' }));
    expect(await screen.findByTestId('backup-hub')).toBeTruthy();
    expect(screen.getByText(/保护学习进度/)).toBeTruthy();
    expect(screen.getByText('下载备份文件')).toBeTruthy();
    expect(screen.getByText('从备份文件恢复')).toBeTruthy();
    await user.click(screen.getByText(/展开急救选项/));
    expect(screen.getByTestId('restore-browser-copy')).toBeTruthy();
    expect(screen.getByText('尝试从浏览器副本找回')).toBeTruthy();
  });
});
