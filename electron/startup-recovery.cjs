const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { readData, atomicWrite } = require('./store.cjs');

async function recoverMissingData({ dialog, userData, missingFile, language }) {
  const zh = language !== 'en';
  while (true) {
    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'LightTodo',
      message: zh ? '找不到原来的清单文件' : 'Your previous list file could not be found',
      detail:
        (zh ? '原路径：' : 'Previous path: ') +
        missingFile +
        '\n\n' +
        (zh
          ? '可选择原清单或 JSON 备份恢复，也可明确新建独立空清单。原文件不会被覆盖或删除。'
          : 'Select your list or a JSON backup to recover it, or explicitly start a separate empty list. Original files will not be overwritten or deleted.'),
      buttons: zh
        ? ['选择清单或备份', '新建独立空清单', '退出']
        : ['Find list or backup', 'Start a separate empty list', 'Quit'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (![0, 1].includes(choice.response)) return null;
    let data = { version: 1, todos: [] };
    if (choice.response === 0) {
      const file = await dialog.showOpenDialog({
        title: zh ? '选择原清单或备份文件' : 'Select your list or backup',
        properties: ['openFile'],
        filters: [{ name: 'LightTodo JSON / backup', extensions: ['json', 'bak'] }],
      });
      if (file.canceled || !file.filePaths.length) continue;
      try {
        data = await readData(file.filePaths[0]);
      } catch (error) {
        await dialog.showMessageBox({
          type: 'error',
          title: 'LightTodo',
          message: zh
            ? '无法读取所选清单，请选择其他备份。'
            : 'Cannot read this list. Choose another backup.',
          detail: error.message,
        });
        continue;
      }
    }
    // Always use a fresh directory: never overwrite a selected backup or the missing source.
    const dataDir = path.join(userData, `recovered-${randomUUID()}`);
    await atomicWrite(path.join(dataDir, 'lighttodo.json'), data, false);
    return { dataDir, loaded: { data, recovered: choice.response === 0 } };
  }
}
module.exports = { recoverMissingData };
