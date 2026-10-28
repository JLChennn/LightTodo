const fs = require('node:fs/promises');
const path = require('node:path');
const APP_ID = 'io.github.jlchennn.lighttodo';
const escapeXml = (s) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c],
  );

function createStartup({ app, platform = process.platform, execPath = process.execPath, homeDir }) {
  const supported = app.isPackaged && ['win32', 'darwin'].includes(platform);
  const options = { path: execPath, args: ['--autostart'] };
  const agentFile = path.join(homeDir, 'Library', 'LaunchAgents', `${APP_ID}.plist`);
  const bundle = path.posix.resolve(path.posix.dirname(execPath), '../..');
  // Run once at user login. No shell interpolation, polling or persistent daemon.
  const plist = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${APP_ID}</string><key>ProgramArguments</key><array><string>/usr/bin/open</string><string>-a</string><string>${escapeXml(bundle)}</string><string>--args</string><string>--autostart</string></array><key>RunAtLoad</key><true/></dict></plist>\n`;
  async function get() {
    if (!supported) return false;
    if (platform === 'win32') {
      const state = app.getLoginItemSettings(options);
      return state.openAtLogin && state.executableWillLaunchAtLogin !== false;
    }
    try {
      return (await fs.readFile(agentFile, 'utf8')) === plist;
    } catch (e) {
      if (e.code === 'ENOENT') return false;
      throw e;
    }
  }
  async function set(enabled) {
    if (!supported) throw new Error('Install LightTodo first / 请先安装 LightTodo');
    if (platform === 'win32') {
      app.setLoginItemSettings({ ...options, name: APP_ID, openAtLogin: enabled, enabled });
    } else if (enabled) {
      await fs.mkdir(path.dirname(agentFile), { recursive: true });
      const temp = `${agentFile}.tmp`;
      try {
        await fs.writeFile(temp, plist, { encoding: 'utf8', mode: 0o600 });
        await fs.rename(temp, agentFile);
      } finally {
        await fs.rm(temp, { force: true }).catch(() => {});
      }
    } else {
      await fs.rm(agentFile, { force: true });
    }
    if ((await get()) !== enabled)
      throw new Error(
        'Startup setting did not take effect / 自启动设置未生效，请检查系统启动项权限',
      );
  }
  return { supported, get, set };
}
module.exports = { createStartup };
