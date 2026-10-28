const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  atomicWrite,
  readData,
  loadData,
  validateData,
  cleanSettings,
  validDate,
} = require('../electron/store.cjs');
const row = {
  id: 'a',
  title: '测试任务',
  notes: '备注',
  date: '2026-10-28',
  done: false,
  color: 'mint',
  createdAt: '2026-10-28T00:00:00Z',
};
test('validation rejects malformed files, duplicate ids and impossible dates', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  for (const data of [
    { todos: [] },
    { version: 1, todos: [row, row] },
    { version: 1, todos: [{ ...row, date: '2026-02-30' }] },
    { version: 1, todos: [{ ...row, title: '  ' }] },
    { version: 1, todos: [{ ...row, done: 'true' }] },
  ])
    assert.throws(() => validateData(data));
  assert.deepEqual(cleanSettings({ opacity: NaN, language: 'xx', alwaysOnTop: 'true' }), {
    language: 'zh',
    opacity: 1,
    alwaysOnTop: false,
  });
  assert.equal(cleanSettings({ opacity: 0 }).opacity, 0.35);
});
test('atomic save in Chinese path, backup recovery and original preservation', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lighttodo-中文-'));
  try {
    const file = path.join(dir, '清单', 'lighttodo.json');
    assert.deepEqual((await loadData(file)).data, { version: 1, todos: [] });
    await atomicWrite(file, { version: 1, todos: [row] });
    await atomicWrite(file, { version: 1, todos: [{ ...row, done: true }] });
    assert.equal((await readData(file)).todos[0].done, true);
    await fs.writeFile(file, 'broken');
    const restored = await loadData(file);
    assert.equal(restored.recovered, true);
    assert.equal(restored.data.todos[0].done, false);
    assert.ok((await fs.readdir(path.dirname(file))).some((x) => x.includes('.corrupt-')));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test('unrecoverable files are left untouched', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lighttodo-bad-'));
  try {
    const file = path.join(dir, 'lighttodo.json');
    await fs.writeFile(file, 'bad');
    await assert.rejects(loadData(file));
    assert.equal(await fs.readFile(file, 'utf8'), 'bad');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test('a previously configured missing file does not silently become a new empty list', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lighttodo-missing-'));
  try {
    const file = path.join(dir, 'lighttodo.json');
    await assert.rejects(loadData(file, false));
    await assert.rejects(fs.stat(file));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
