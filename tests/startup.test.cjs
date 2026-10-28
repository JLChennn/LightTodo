const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createStartup } = require('../electron/startup.cjs');

test('Windows startup uses the installed executable path and verifies effective state', async () => {
  let state = { openAtLogin: false, executableWillLaunchAtLogin: false },
    last;
  const app = {
    isPackaged: true,
    getLoginItemSettings: (options) => {
      assert.equal(options.path, 'D:\\My Apps\\LightTodo.exe');
      assert.deepEqual(options.args, ['--autostart']);
      return state;
    },
    setLoginItemSettings: (options) => {
      last = options;
      state = { openAtLogin: options.openAtLogin, executableWillLaunchAtLogin: options.enabled };
    },
  };
  const startup = createStartup({
    app,
    platform: 'win32',
    execPath: 'D:\\My Apps\\LightTodo.exe',
    homeDir: os.tmpdir(),
  });
  assert.equal(await startup.get(), false);
  await startup.set(true);
  assert.equal(await startup.get(), true);
  assert.equal(last.name, 'io.github.jlchennn.lighttodo');
  await startup.set(false);
  assert.equal(await startup.get(), false);
});
test('development mode never registers the Electron development binary', async () => {
  const startup = createStartup({
    app: { isPackaged: false },
    platform: 'win32',
    homeDir: os.tmpdir(),
  });
  assert.equal(startup.supported, false);
  assert.equal(await startup.get(), false);
  await assert.rejects(startup.set(true));
});
test('Mac startup writes a bounded per-user launch agent and removes it on disable', async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'lighttodo-startup-'));
  try {
    const startup = createStartup({
      app: { isPackaged: true },
      platform: 'darwin',
      execPath: '/Applications/Test & Apps/LightTodo.app/Contents/MacOS/LightTodo',
      homeDir: home,
    });
    assert.equal(await startup.get(), false);
    await startup.set(true);
    const file = path.join(home, 'Library/LaunchAgents/io.github.jlchennn.lighttodo.plist'),
      text = await fs.readFile(file, 'utf8');
    assert.ok(text.includes('Test &amp; Apps'));
    assert.ok(text.includes('<key>RunAtLoad</key><true/>'));
    assert.ok(!text.includes('KeepAlive'));
    assert.equal(await startup.get(), true);
    await startup.set(false);
    assert.equal(await startup.get(), false);
    await assert.rejects(fs.stat(file));
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});
