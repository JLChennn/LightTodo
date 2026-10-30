// Native window operations remain in the main process. No native handles reach the renderer.
const koffi = require('koffi');

function nativeHandle(win) {
  const bytes = win.getNativeWindowHandle();
  return bytes.length === 8 ? bytes.readBigUInt64LE() : BigInt(bytes.readUInt32LE());
}

function createDesktop(win, platform = process.platform) {
  if (platform === 'win32') return windowsDesktop(win);
  if (platform === 'darwin') return macDesktop(win);
  return {
    apply: (pinned) => win.setAlwaysOnTop(pinned),
    minimize: () => win.minimize(),
    dispose() {},
  };
}

function windowsDesktop(win) {
  const user = koffi.load('user32.dll');
  const shellWindow = user.func('uintptr_t __stdcall GetShellWindow()');
  const getParent = user.func('uintptr_t __stdcall GetParent(uintptr_t hwnd)');
  const setParent = user.func('uintptr_t __stdcall SetParent(uintptr_t hwnd, uintptr_t parent)');
  const getLong = user.func('intptr_t __stdcall GetWindowLongPtrW(uintptr_t hwnd, int index)');
  const setLong = user.func(
    'intptr_t __stdcall SetWindowLongPtrW(uintptr_t hwnd, int index, intptr_t value)',
  );
  const setPos = user.func(
    'bool __stdcall SetWindowPos(uintptr_t hwnd, intptr_t after, int x, int y, int w, int h, uint32_t flags)',
  );
  const hwnd = nativeHandle(win);
  const originalStyle = BigInt(getLong(hwnd, -16));
  let attached = false;
  let desiredPinned = false;
  const adapter = {
    apply(pinned) {
      desiredPinned = pinned;
      const parent = BigInt(getParent(hwnd));
      const shell = BigInt(shellWindow());
      // Login can start the application before Explorer creates its desktop.
      // Keep an accessible ordinary window until the desktop becomes available.
      if (!pinned && !shell) {
        win.setAlwaysOnTop(false);
        win.setSkipTaskbar(false);
        return;
      }
      if (pinned && attached) {
        setParent(hwnd, 0);
        setLong(hwnd, -16, originalStyle);
        attached = false;
      } else if (!pinned && parent !== shell) {
        win.setAlwaysOnTop(false);
        // A genuine desktop child survives Win+D and cannot cover other applications.
        // Preserve a resizable Electron surface; do not alter the shell or wallpaper.
        setLong(hwnd, -16, (originalStyle & ~0x80000000n) | 0x40000000n);
        setParent(hwnd, shell);
        if (BigInt(getParent(hwnd)) !== shell) {
          setLong(hwnd, -16, originalStyle);
          throw new Error('Could not attach to desktop / 无法驻留桌面');
        }
        attached = true;
      }
      win.setSkipTaskbar(!pinned);
      if (pinned) win.setAlwaysOnTop(true);
      if (!pinned) setPos(hwnd, 0, 0, 0, 0, 0, 0x0033);
    },
    minimize: () => win.minimize(),
    dispose() {
      clearInterval(retry);
    },
  };
  const retry = setInterval(() => {
    if (!win.isDestroyed() && !desiredPinned && !attached && shellWindow()) adapter.apply(false);
    // Explorer can reorder its icon view during Show Desktop. Keep the component
    // above sibling desktop views without raising the desktop above applications.
    if (!win.isDestroyed() && attached && !win.isMinimized()) setPos(hwnd, 0, 0, 0, 0, 0, 0x0213);
  }, 500);
  retry.unref();
  return adapter;
}

function macDesktop(win) {
  const objc = koffi.load('/usr/lib/libobjc.A.dylib');
  const selector = objc.func('void *sel_registerName(const char *name)');
  const sendPointer = objc.func('objc_msgSend', 'void *', ['void *', 'void *']);
  const sendInteger = objc.func('objc_msgSend', 'void', ['void *', 'void *', 'intptr_t']);
  const view = nativeHandle(win);
  const window = sendPointer(view, selector('window'));
  if (!window) throw new Error('Native desktop window unavailable');
  const cg = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics');
  const level = cg.func('int32_t CGWindowLevelForKey(int32_t key)');
  return {
    minimize: () => win.minimize(),
    apply(pinned) {
      win.setAlwaysOnTop(pinned);
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: pinned });
      // kCGDesktopIconWindowLevelKey = 18. Query rather than hard-code the level.
      if (!pinned) sendInteger(window, selector('setLevel:'), level(18) + 1);
      // CanJoinAllSpaces | Stationary | IgnoresCycle (+ FullScreenAuxiliary when pinned).
      sendInteger(window, selector('setCollectionBehavior:'), 1 | 16 | 64 | (pinned ? 256 : 0));
    },
    dispose() {},
  };
}

module.exports = { createDesktop };
