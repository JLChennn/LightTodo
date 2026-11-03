const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path');
const { recoverMissingData } = require('../electron/startup-recovery.cjs');
test('cancelling startup recovery does not create or replace any list', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lighttodo-cancel-'));
  try {
    const result = await recoverMissingData({
      dialog: { showMessageBox: async () => ({ response: 2 }) },
      userData: dir,
      missingFile: path.join(dir, 'missing.json'),
      language: 'en',
    });
    assert.equal(result, null);
    assert.deepEqual(await fs.readdir(dir), []);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test('invalid recovery files are preserved and never turned into empty lists', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lighttodo-invalid-'));
  try {
    const bad = path.join(dir, 'bad.json');
    await fs.writeFile(bad, 'broken');
    let choices = [0, 2],
      errors = 0;
    const result = await recoverMissingData({
      dialog: {
        showMessageBox: async (options) => {
          if (options.type === 'error') {
            errors++;
            return { response: 0 };
          }
          return { response: choices.shift() };
        },
        showOpenDialog: async () => ({ canceled: false, filePaths: [bad] }),
      },
      userData: dir,
      missingFile: path.join(dir, 'missing.json'),
      language: 'zh',
    });
    assert.equal(result, null);
    assert.equal(errors, 1);
    assert.equal(await fs.readFile(bad, 'utf8'), 'broken');
    assert.deepEqual(await fs.readdir(dir), ['bad.json']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
