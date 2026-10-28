const { _electron: electron } = require('@playwright/test');

(async () => {
  const executablePath = process.argv[2];
  if (!executablePath) throw new Error('Pass the installed application executable path');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath, args: [], env });
  let page, original;
  try {
    page = await app.firstWindow();
    await page.locator('.period-nav').waitFor();
    const state = await page.evaluate(() => window.lighttodo.load());
    original = state.settings;
    if (!state.startupSupported) throw new Error('Startup is not supported by this build');
    await page.evaluate(
      (settings) => window.lighttodo.settings({ ...settings, autoStart: true }),
      original,
    );
    if (!(await page.evaluate(() => window.lighttodo.load())).settings.autoStart)
      throw new Error('Startup enable did not persist');
    const osState = await app.evaluate(({ app }) =>
      process.platform === 'win32'
        ? app.getLoginItemSettings({ path: process.execPath, args: ['--autostart'] })
        : { platform: process.platform },
    );
    if (process.platform === 'win32' && !osState.openAtLogin)
      throw new Error('Windows did not register startup');
    await page.evaluate(
      (settings) => window.lighttodo.settings({ ...settings, autoStart: false }),
      original,
    );
    if ((await page.evaluate(() => window.lighttodo.load())).settings.autoStart)
      throw new Error('Startup disable failed');
    console.log(
      JSON.stringify(
        {
          version: state.version,
          startupEnable: true,
          startupDisable: true,
          osRegistered: osState.openAtLogin ?? 'launch-agent',
          note: 'Registration verified; no reboot/login cycle performed',
        },
        null,
        2,
      ),
    );
  } finally {
    if (page && original)
      await page
        .evaluate((settings) => window.lighttodo.settings(settings), original)
        .catch(() => {});
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
