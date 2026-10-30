// Include both precompiled N-API bindings before building the Universal application.
// npm ordinarily installs only the host CPU's optional dependency.
const { execFileSync } = require('node:child_process');
if (process.platform !== 'darwin') throw new Error('Build the Mac installer on macOS.');
const version = require('koffi').version;
execFileSync(
  'npm',
  [
    'install',
    '--no-save',
    '--package-lock=false',
    '--force',
    `@koromix/koffi-darwin-x64@${version}`,
    `@koromix/koffi-darwin-arm64@${version}`,
  ],
  { stdio: 'inherit' },
);
