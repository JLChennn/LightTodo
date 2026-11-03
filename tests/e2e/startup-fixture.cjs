const { dialog } = require('electron');
dialog.showMessageBox = async () => ({
  response: Number(process.env.LIGHTTODO_RECOVERY_CHOICE || 0),
});
dialog.showOpenDialog = async () => ({
  canceled: false,
  filePaths: [process.env.LIGHTTODO_RECOVERY_FILE],
});
dialog.showErrorBox = (_title, message) => console.error('STARTUP_ERROR:', message);
require('../../electron/main.cjs');
