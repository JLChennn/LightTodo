const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises'),
  path = require('node:path');
for (const choice of [0, 1])
  test('missing configured data opens recovery instead of exiting, choice ' + choice, async () => {
    const home = path.resolve('.test-data/startup-recovery-' + choice);
    await fs.rm(home, { recursive: true, force: true });
    await fs.mkdir(home, { recursive: true });
    const missing = path.join(home, 'missing-original');
    await fs.writeFile(path.join(home, 'settings.json'), JSON.stringify({ dataDir: missing }));
    const source = path.join(home, 'source-backup.json'),
      data = {
        version: 1,
        todos: [
          {
            id: 'original',
            title: '保留原清单',
            list: 'today',
            notes: '正文',
            date: '2026-11-03',
            done: false,
            createdAt: '2026-11-03T00:00:00Z',
          },
        ],
      };
    const original = JSON.stringify(data);
    await fs.writeFile(source, original);
    const env = {
      ...process.env,
      LIGHTTODO_TEST_HOME: home,
      LIGHTTODO_RECOVERY_CHOICE: String(choice),
      LIGHTTODO_RECOVERY_FILE: source,
    };
    delete env.ELECTRON_RUN_AS_NODE;
    let app;
    try {
      app = await electron.launch({ args: ['tests/e2e/startup-fixture.cjs'], env });
      const p = await app.firstWindow({ timeout: 8000 });
      await expect(p.locator('.period-nav')).toBeVisible();
      const s = await p.evaluate(() => window.lighttodo.load());
      expect(s.data.todos).toHaveLength(choice === 0 ? 1 : 0);
      expect(s.dataDir).not.toBe(missing);
      await expect(fs.stat(path.join(missing, 'lighttodo.json'))).rejects.toThrow();
      expect(await fs.readFile(source, 'utf8')).toBe(original);
      await app.close();
      app = await electron.launch({ args: ['.'], env });
      const q = await app.firstWindow();
      await expect(q.locator('.period-nav')).toBeVisible();
      expect((await q.evaluate(() => window.lighttodo.load())).data.todos).toHaveLength(
        choice === 0 ? 1 : 0,
      );
    } finally {
      await app?.close();
    }
  });
