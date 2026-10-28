const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
test('native folder switch, export and restore preserve independent local lists', async () => {
  const home = path.resolve('.test-data/storage');
  await fs.rm(home, { recursive: true, force: true });
  const env = { ...process.env, LIGHTTODO_TEST_HOME: home };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ['.'], env }),
    page = await app.firstWindow();
  try {
    await expect(page.locator('.period-nav')).toBeVisible();
    const row = {
      id: 'storage',
      title: '本地存储测试',
      notes: '',
      date: '2026-10-28',
      done: false,
      color: 'mint',
      createdAt: '2026-10-28T00:00:00Z',
    };
    await page.evaluate(async (row) => window.lighttodo.save({ version: 1, todos: [row] }), row);
    const target = path.join(home, '自选文件夹');
    await fs.mkdir(target, { recursive: true });
    await app.evaluate(({ dialog }, target) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] });
    }, target);
    const snapshot = await page.evaluate(() => window.lighttodo.chooseFolder());
    expect(snapshot.dataDir).toBe(target);
    expect(
      JSON.parse(await fs.readFile(path.join(target, 'lighttodo.json'), 'utf8')).todos,
    ).toHaveLength(1);
    expect(
      JSON.parse(await fs.readFile(path.join(home, 'data/lighttodo.json'), 'utf8')).todos,
    ).toHaveLength(1);
    const backup = path.join(home, 'backup.json');
    await app.evaluate(({ dialog }, backup) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: backup });
    }, backup);
    expect(await page.evaluate(() => window.lighttodo.exportBackup())).toBe(true);
    await page.evaluate(() => window.lighttodo.save({ version: 1, todos: [] }));
    await app.evaluate(({ dialog }, backup) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [backup] });
      dialog.showMessageBox = async () => ({ response: 1 });
    }, backup);
    expect((await page.evaluate(() => window.lighttodo.importBackup())).data.todos).toHaveLength(1);
    const preRestore = (await fs.readdir(target)).find((x) =>
      x.startsWith('lighttodo.pre-restore-'),
    );
    expect(JSON.parse(await fs.readFile(path.join(target, preRestore), 'utf8')).todos).toHaveLength(
      0,
    );
    // Existing destination is selected, never silently overwritten.
    const existing = path.join(home, '已有清单');
    await fs.mkdir(existing, { recursive: true });
    await fs.writeFile(
      path.join(existing, 'lighttodo.json'),
      JSON.stringify({ version: 1, todos: [{ ...row, id: 'other', title: '另一份清单' }] }),
    );
    await app.evaluate(({ dialog }, existing) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [existing] });
      dialog.showMessageBox = async () => ({ response: 0 });
    }, existing);
    expect(await page.evaluate(() => window.lighttodo.chooseFolder())).toBe(null);
    await app.evaluate(({ dialog }) => {
      dialog.showMessageBox = async () => ({ response: 1 });
    });
    expect((await page.evaluate(() => window.lighttodo.chooseFolder())).data.todos[0].title).toBe(
      '另一份清单',
    );
    expect((await page.evaluate(() => window.lighttodo.load())).data.todos[0].title).toBe(
      '另一份清单',
    );
    // The bridge rejects malformed data without changing the stored list.
    await expect(
      page.evaluate(() => window.lighttodo.save({ version: 1, todos: [{}] })),
    ).rejects.toThrow();
    expect((await page.evaluate(() => window.lighttodo.load())).data.todos[0].id).toBe('other');
  } finally {
    await app.close();
  }
});
