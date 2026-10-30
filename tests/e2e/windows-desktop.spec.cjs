const { test, expect, _electron: electron } = require('@playwright/test');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const path = require('node:path');
const fs = require('node:fs/promises');

test('Windows desktop widget survives Show Desktop and stays below normal windows', async () => {
  test.skip(process.platform !== 'win32', 'Windows shell integration');
  const shell = require('koffi').load('user32.dll').func('uintptr_t GetShellWindow()')();
  test.skip(!shell, 'Explorer desktop is unavailable in this session');
  const home = path.resolve('.test-data/windows-desktop');
  await fs.rm(home, { recursive: true, force: true });
  const env = { ...process.env, LIGHTTODO_TEST_HOME: home };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ['.'], env });
  let toggled = false;
  const toggleDesktop = () =>
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(New-Object -ComObject Shell.Application).ToggleDesktop()',
      ],
      { windowsHide: true },
    );
  try {
    const page = await app.firstWindow();
    await expect(page.locator('.period-nav')).toBeVisible();
    const handles = await app.evaluate(({ BrowserWindow }) => {
      const widget = BrowserWindow.getAllWindows()[0];
      const cover = new BrowserWindow({ ...widget.getBounds(), title: 'LightTodo test cover' });
      cover.show();
      widget.focus();
      return {
        widgetId: widget.id,
        coverId: cover.id,
        widget: widget.getNativeWindowHandle().readBigUInt64LE().toString(),
        cover: cover.getNativeWindowHandle().readBigUInt64LE().toString(),
      };
    });
    const k = require('koffi'),
      user = k.load('user32.dll');
    const getWindow = user.func('uintptr_t GetWindow(uintptr_t hwnd, uint32_t command)');
    const ancestor = user.func('uintptr_t GetAncestor(uintptr_t hwnd, uint32_t flags)');
    const isChild = user.func('bool IsChild(uintptr_t parent, uintptr_t child)');
    const coverAbove = () => {
      let handle = BigInt(ancestor(BigInt(handles.widget), 2));
      for (let i = 0; handle && i < 500; i++) {
        handle = BigInt(getWindow(handle, 3)); // GW_HWNDPREV
        if (handle === BigInt(handles.cover)) return true;
      }
      return false;
    };
    await expect.poll(coverAbove).toBe(true);
    // ToggleDesktop is stateful: wait until a normal app owns foreground focus so
    // this operation shows the desktop instead of undoing a previous transition.
    const foreground = user.func('uintptr_t GetForegroundWindow()');
    await app.evaluate(
      ({ BrowserWindow }, id) => BrowserWindow.fromId(id).focus(),
      handles.coverId,
    );
    await expect.poll(() => BigInt(foreground()).toString()).toBe(handles.cover);
    await toggleDesktop();
    toggled = true;
    const pointFromWindow = user.func('uintptr_t WindowFromPoint(int64_t point)');
    // Query and hit-test in the same native DPI context, including fractional scaling.
    const getRect = user.func('bool GetWindowRect(uintptr_t hwnd, _Out_ int32_t *rect)');
    const rect = Buffer.alloc(16);
    getRect(BigInt(handles.widget), rect);
    const point =
      (BigInt(rect.readInt32LE(4) + 100) << 32n) | BigInt((rect.readInt32LE(0) + 100) >>> 0);
    await expect
      .poll(
        () =>
          BigInt(pointFromWindow(point)).toString() === handles.widget ||
          isChild(BigInt(handles.widget), pointFromWindow(point)),
      )
      .toBe(true);
    await expect
      .poll(() =>
        app.evaluate(
          ({ BrowserWindow }, id) => BrowserWindow.fromId(id).isMinimized(),
          handles.widgetId,
        ),
      )
      .toBe(false);
    await toggleDesktop();
    toggled = false;
    await app.evaluate(
      ({ BrowserWindow }, id) => BrowserWindow.fromId(id).restore(),
      handles.coverId,
    );
    await expect.poll(coverAbove).toBe(true);
    // A user-requested minimize must still work and remain minimized.
    await page.evaluate(() => window.lighttodo.minimize());
    await expect
      .poll(() =>
        app.evaluate(
          ({ BrowserWindow }, id) => BrowserWindow.fromId(id).isMinimized(),
          handles.widgetId,
        ),
      )
      .toBe(true);
    await page.waitForTimeout(500);
    expect(
      await app.evaluate(
        ({ BrowserWindow }, id) => BrowserWindow.fromId(id).isMinimized(),
        handles.widgetId,
      ),
    ).toBe(true);
  } finally {
    if (toggled) await toggleDesktop();
    await app.close();
  }
});
