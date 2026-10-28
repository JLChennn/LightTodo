const { _electron: electron } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs/promises');

(async () => {
  const executablePath =
    process.argv[2] ||
    path.join(process.env.LOCALAPPDATA, 'Programs', 'LightTodo', 'LightTodo.exe');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const desktop = await electron.launch({ executablePath, args: [], env });
  try {
    const page = await desktop.firstWindow();
    await page.locator('.period-nav').waitFor();
    const state = await page.evaluate(() => window.lighttodo.load());
    const runtime = await desktop.evaluate(({ app, BrowserWindow }) => ({
      packaged: app.isPackaged,
      version: app.getVersion(),
      windowTitle: BrowserWindow.getAllWindows()[0].getTitle(),
    }));
    if (
      !runtime.packaged ||
      runtime.version !== require('../package.json').version ||
      state.data.version !== 1
    )
      throw new Error('Invalid installed application');
    await fs.mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/installed.png' });
    console.log(
      JSON.stringify(
        {
          ...runtime,
          taskCount: state.data.todos.length,
          dataDir: state.dataDir,
          status: 'installed application opened successfully',
        },
        null,
        2,
      ),
    );
  } finally {
    await desktop.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
