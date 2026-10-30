const { app, BrowserWindow, ipcMain, dialog, shell, screen, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { atomicWrite, loadData, readData, validateData, cleanSettings } = require('./store.cjs');
const { createStartup } = require('./startup.cjs');

if (process.env.LIGHTTODO_TEST_HOME)
  app.setPath('userData', path.resolve(process.env.LIGHTTODO_TEST_HOME));
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
let win,
  config,
  data,
  recovered = false,
  closing = false,
  unsaved = false;
let queue = Promise.resolve();
let startup;
const configFile = () => path.join(app.getPath('userData'), 'settings.json');
const dataFile = () => path.join(config.dataDir, 'lighttodo.json');
const entry = path.join(__dirname, '../dist/index.html');
const zh = () => config.language !== 'en';
const run = (fn) => {
  const job = queue.then(fn);
  queue = job.catch(() => {});
  return job;
};
async function saveConfig() {
  await atomicWrite(configFile(), config);
}
function applySettings() {
  win.setAlwaysOnTop(config.alwaysOnTop);
  win.setOpacity(config.opacity);
  const glass = config.appearance === 'glass';
  win.setBackgroundColor(glass ? '#00000000' : '#faf9f6');
  if (process.platform === 'win32') win.setBackgroundMaterial(glass ? 'acrylic' : 'none');
  if (process.platform === 'darwin') win.setVibrancy(glass ? 'under-window' : null);
}
async function snapshot() {
  config.autoStart = await startup.get();
  return {
    data,
    settings: cleanSettings(config),
    dataDir: config.dataDir,
    recovered,
    platform: process.platform,
    version: app.getVersion(),
    startupSupported: startup.supported,
  };
}
function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (
      !win ||
      event.sender !== win.webContents ||
      event.senderFrame !== win.webContents.mainFrame ||
      event.senderFrame.url !== pathToFileURL(entry).href
    )
      throw new Error('Untrusted sender');
    return run(() => fn(...args));
  });
}
function register() {
  handle('data:load', () => snapshot());
  handle('data:save', async (input) => {
    const next = validateData(input);
    unsaved = true;
    await atomicWrite(dataFile(), next);
    data = next;
    unsaved = false;
    return true;
  });
  handle('settings:save', async (input) => {
    const previous = { ...config };
    config = { ...config, ...cleanSettings(input) };
    try {
      if (config.autoStart !== previous.autoStart) await startup.set(config.autoStart);
      applySettings();
      await saveConfig();
    } catch (e) {
      config = previous;
      if (startup.supported && (await startup.get()) !== previous.autoStart)
        await startup.set(previous.autoStart);
      applySettings();
      throw e;
    }
    return cleanSettings(config);
  });
  handle('data:open', async () => {
    const error = await shell.openPath(config.dataDir);
    if (error) throw new Error(error);
  });
  handle('data:folder', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: zh() ? '选择数据文件夹' : 'Choose data folder',
      defaultPath: config.dataDir,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled) return null;
    const targetDir = result.filePaths[0];
    if (path.resolve(targetDir) === path.resolve(config.dataDir)) return snapshot();
    const target = path.join(targetDir, 'lighttodo.json');
    let next;
    try {
      next = await readData(target);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (next) {
      const answer = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: zh() ? ['取消', '切换到已有清单'] : ['Cancel', 'Switch to existing list'],
        defaultId: 0,
        cancelId: 0,
        message: zh()
          ? '此文件夹已有 LightTodo 数据。切换后显示该清单，当前清单仍保留在原文件夹。'
          : 'This folder contains a list. Switch to it? Your current list stays in its original folder.',
      });
      if (answer.response !== 1) return null;
    } else {
      next = data;
      await atomicWrite(target, next, false);
    }
    const previous = config;
    config = { ...config, dataDir: targetDir };
    try {
      await saveConfig();
    } catch (e) {
      config = previous;
      throw e;
    }
    data = next;
    recovered = false;
    return snapshot();
  });
  handle('data:export', async () => {
    const result = await dialog.showSaveDialog(win, {
      title: zh() ? '导出备份' : 'Export backup',
      defaultPath: `LightTodo-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'LightTodo JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return false;
    if (path.resolve(result.filePath) === path.resolve(dataFile()))
      throw new Error(zh() ? '请另选文件，避免覆盖当前数据' : 'Choose a different file');
    await atomicWrite(result.filePath, data);
    return true;
  });
  handle('data:import', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: zh() ? '恢复备份' : 'Restore backup',
      properties: ['openFile'],
      filters: [{ name: 'LightTodo JSON', extensions: ['json'] }],
    });
    if (result.canceled) return null;
    const next = await readData(result.filePaths[0]);
    const answer = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: zh() ? ['取消', '恢复'] : ['Cancel', 'Restore'],
      cancelId: 0,
      defaultId: 0,
      message: zh()
        ? `用备份中的 ${next.todos.length} 条待办替换当前清单？`
        : `Replace your list with ${next.todos.length} backed-up tasks?`,
      detail: zh()
        ? '当前清单将另外保存在数据目录的 restore 前置备份文件中。'
        : 'A separate pre-restore backup will be saved in your data folder.',
    });
    if (answer.response !== 1) return null;
    await atomicWrite(
      path.join(config.dataDir, `lighttodo.pre-restore-${Date.now()}.json`),
      data,
      false,
    );
    await atomicWrite(dataFile(), next);
    data = next;
    return snapshot();
  });
  handle('window:minimize', () => win.minimize());
  handle('window:close', () => {
    setImmediate(() => win.close());
  });
}
async function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    width: 360,
    height: 460,
    x: area.x + 16,
    y: area.y + 16,
    minWidth: 360,
    minHeight: 460,
    show: false,
    frame: false,
    transparent: true,
    visualEffectState: 'active',
    resizable: true,
    backgroundColor: '#faf9f6',
    title: 'LightTodo',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  Menu.setApplicationMenu(
    process.platform === 'darwin'
      ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
      : null,
  );
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  applySettings();
  win.on('close', (e) => {
    if (closing) return;
    e.preventDefault();
    run(async () => {
      if (unsaved) {
        const answer = await dialog.showMessageBox(win, {
          type: 'warning',
          buttons: zh()
            ? ['返回重试', '放弃未保存的更改']
            : ['Go back and retry', 'Discard unsaved changes'],
          defaultId: 0,
          cancelId: 0,
          message: zh()
            ? '清单保存失败。返回应用后可点击“重试”。'
            : 'Your list could not be saved. Go back and click Retry.',
        });
        if (answer.response !== 1) return false;
      }
      await saveConfig();
      return true;
    })
      .then((allow) => {
        if (allow) {
          closing = true;
          win.close();
        }
      })
      .catch((error) => dialog.showErrorBox('LightTodo', error.message));
  });
  win.once('ready-to-show', () => win.show());
  await win.loadFile(entry);
}
if (single) {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      let saved = {};
      try {
        saved = JSON.parse(await fs.readFile(configFile(), 'utf8'));
      } catch (e) {
        if (e.code !== 'ENOENT')
          throw new Error(
            'Settings cannot be read; original files preserved. / 无法读取设置，原文件已保留。',
          );
      }
      config = {
        ...cleanSettings(saved),
        dataDir:
          typeof saved.dataDir === 'string'
            ? saved.dataDir
            : path.join(app.getPath('userData'), 'data'),
      };
      if (process.platform === 'win32') app.setAppUserModelId('io.github.jlchennn.lighttodo');
      startup = createStartup({ app, homeDir: app.getPath('home') });
      config.autoStart = await startup.get();
      const loaded = await loadData(dataFile(), !saved.dataDir);
      data = loaded.data;
      recovered = loaded.recovered;
      await saveConfig();
      register();
      await createWindow();
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          closing = false;
          createWindow();
        }
      });
    })
    .catch((error) => {
      dialog.showErrorBox('LightTodo', error.message);
      app.quit();
    });
  app.on('window-all-closed', () => app.quit());
}
