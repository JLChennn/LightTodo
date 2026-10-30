const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const execFile = require('node:util').promisify(require('node:child_process').execFile);

test('ordinary window pinning, appearance controls, large text and restart persistence', async () => {
  const home = path.resolve('.test-data/appearance');
  await fs.rm(home, { recursive: true, force: true });
  const env = { ...process.env, LIGHTTODO_TEST_HOME: home };
  delete env.ELECTRON_RUN_AS_NODE;
  let app;
  const launch = async () => {
    app = await electron.launch({ args: ['.'], env });
    const page = await app.firstWindow();
    await expect(page.locator('.period-nav')).toBeVisible();
    return page;
  };
  try {
    let page = await launch();
    const nativeWindow = async () => {
      const handle = await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].getNativeWindowHandle().readBigUInt64LE().toString(),
      );
      const { stdout } = await execFile(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          path.resolve('tests/window-state.ps1'),
          '-WindowHandle',
          handle,
        ],
        { windowsHide: true },
      );
      return JSON.parse(stdout);
    };
    await expect(page.locator('.brand-dot')).toHaveCount(0);
    expect(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()),
    ).toBe(false);
    if (process.platform === 'win32')
      expect(await nativeWindow()).toEqual({
        parent: '0',
        child: false,
        toolWindow: false,
        topmost: false,
      });
    if (process.platform === 'darwin')
      expect(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isVisibleOnAllWorkspaces(),
        ),
      ).toBe(false);
    await page.getByRole('button', { name: '偏好设置', exact: true }).click();
    await page
      .getByRole('group', { name: '界面配色' })
      .getByRole('button', { name: '淡紫' })
      .click();
    await page.getByRole('button', { name: '透明玻璃', exact: true }).click();
    await page.locator('#font-size').fill('20');
    await expect(page.locator('html')).toHaveAttribute('data-appearance', 'glass');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'lavender');
    expect(await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize)).toBe('20px');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Preferences' })).toBeVisible();
    // Settings must remain scrollable and usable at the largest text size.
    await page.getByRole('switch', { name: 'Keep on top', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()),
      )
      .toBe(true);
    if (process.platform === 'win32') expect((await nativeWindow()).topmost).toBe(true);
    await page.getByRole('switch', { name: 'Keep on top', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()),
      )
      .toBe(false);
    if (process.platform === 'win32')
      expect(await nativeWindow()).toEqual({
        parent: '0',
        child: false,
        toolWindow: false,
        topmost: false,
      });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Minimize', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized()),
      )
      .toBe(true);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].restore());
    expect(await page.locator('.titlebar').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Add a task', exact: true }).first().click();
    await page.getByRole('textbox', { name: 'Task title' }).fill('Large text remains usable');
    await page.getByRole('button', { name: 'Add to list', exact: true }).click();
    await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
    const settingsFile = path.join(home, 'settings.json');
    await expect
      .poll(async () => JSON.parse(await fs.readFile(settingsFile, 'utf8')).fontSize)
      .toBe(20);
    await app.close();
    page = await launch();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'lavender');
    await expect(page.locator('html')).toHaveAttribute('data-appearance', 'glass');
    expect(
      await page.locator('.task-title').evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThan(18);
    await page
      .getByRole('button', { name: 'Edit: Large text remains usable', exact: true })
      .first()
      .click();
    await page.getByRole('textbox', { name: 'Task title' }).fill('阅读');
    await page.getByRole('textbox', { name: 'Notes (optional)' }).fill('第 3 章');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await page.locator('#font-size').fill('13');
    await page.getByRole('button', { name: '中文', exact: true }).click();
    await page.keyboard.press('Escape');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(420, 580));
    await page.locator('.list-summary').click();
    await page.screenshot({ animations: 'disabled', path: 'test-results/app-glass.png' });
    await page.getByRole('button', { name: '偏好设置', exact: true }).click();
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await page.getByRole('button', { name: 'Solid', exact: true }).click();
    await page
      .getByRole('group', { name: 'Interface color' })
      .getByRole('button', { name: 'Blue' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-appearance', 'solid');
    await page.keyboard.press('Escape');
    await page.screenshot({ animations: 'disabled', path: 'test-results/large-blue.png' });
  } finally {
    await app?.close();
  }
});
