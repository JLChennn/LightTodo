const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(+d) &&
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` ===
      value
  );
}
function validateData(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.todos) || data.todos.length > 100000)
    throw new Error('Invalid LightTodo file / 无效的 LightTodo 数据文件');
  const ids = new Set();
  const todos = data.todos.map((t) => {
    if (
      !t ||
      typeof t.id !== 'string' ||
      t.id.length > 100 ||
      ids.has(t.id) ||
      typeof t.title !== 'string' ||
      !t.title.trim() ||
      t.title.length > 200 ||
      typeof t.notes !== 'string' ||
      t.notes.length > 5000 ||
      !validDate(t.date) ||
      typeof t.done !== 'boolean' ||
      !['mint', 'blue', 'peach', 'lavender'].includes(t.color) ||
      typeof t.createdAt !== 'string' ||
      Number.isNaN(Date.parse(t.createdAt))
    )
      throw new Error('Invalid todo / 待办数据格式错误');
    ids.add(t.id);
    return {
      id: t.id,
      title: t.title.trim(),
      notes: t.notes,
      date: t.date,
      done: t.done,
      color: t.color,
      createdAt: t.createdAt,
    };
  });
  return { version: 1, todos };
}
async function readData(file) {
  const stat = await fs.stat(file);
  if (stat.size > 30 * 1024 * 1024) throw new Error('File too large / 文件过大');
  return validateData(JSON.parse(await fs.readFile(file, 'utf8')));
}
async function atomicWrite(file, data, backup = true) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temp, JSON.stringify(data, null, 2), { encoding: 'utf8', flag: 'wx' });
    if (backup) {
      try {
        await fs.copyFile(file, `${file}.bak`);
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
    }
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true }).catch(() => {});
  }
}
async function loadData(file, initialize = true) {
  try {
    return { data: await readData(file), recovered: false };
  } catch (e) {
    if (e.code === 'ENOENT') {
      // A missing primary may be recoverable from the last write.
      try {
        const data = await readData(`${file}.bak`);
        await atomicWrite(file, data, false);
        return { data, recovered: true };
      } catch (backupError) {
        if (backupError.code !== 'ENOENT') throw backupError;
      }
      if (!initialize)
        throw new Error(
          'Data file is missing. Check your folder or restore lighttodo.json from a backup. / 数据文件缺失，请检查原目录或从备份恢复 lighttodo.json。',
        );
      const data = { version: 1, todos: [] };
      await atomicWrite(file, data, false);
      return { data, recovered: false };
    }
    // Never replace a corrupt primary silently. Preserve the original for recovery.
    const data = await readData(`${file}.bak`).catch(() => {
      throw new Error(
        'Cannot read data. Original files preserved. / 无法读取数据，原文件已保留。请检查数据目录及备份。',
      );
    });
    await fs.copyFile(file, `${file}.corrupt-${Date.now()}`);
    await atomicWrite(file, data, false);
    return { data, recovered: true };
  }
}
function cleanSettings(input = {}) {
  return {
    language: input.language === 'en' ? 'en' : 'zh',
    alwaysOnTop: input.alwaysOnTop === true,
    autoStart: input.autoStart === true,
    fontSize:
      typeof input.fontSize === 'number' && Number.isFinite(input.fontSize)
        ? Math.round(Math.max(12, Math.min(20, input.fontSize)))
        : 13,
    theme: ['mint', 'blue', 'peach', 'lavender'].includes(input.theme) ? input.theme : 'mint',
    appearance: input.appearance === 'glass' ? 'glass' : 'solid',
    opacity:
      typeof input.opacity === 'number' && Number.isFinite(input.opacity)
        ? Math.max(0.35, Math.min(1, input.opacity))
        : 1,
  };
}
module.exports = { validDate, validateData, readData, atomicWrite, loadData, cleanSettings };
