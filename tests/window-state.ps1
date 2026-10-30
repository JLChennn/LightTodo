param([long]$WindowHandle)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LightTodoWindowState {
    [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr hwnd);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")]
    public static extern IntPtr GetStyle(IntPtr hwnd, int index);
}
'@
$lightTodoHwnd = [IntPtr]::new($WindowHandle)
[ordered]@{
    parent = [LightTodoWindowState]::GetParent($lightTodoHwnd).ToInt64().ToString()
    child = ([LightTodoWindowState]::GetStyle($lightTodoHwnd, -16).ToInt64() -band 0x40000000) -ne 0
    toolWindow = ([LightTodoWindowState]::GetStyle($lightTodoHwnd, -20).ToInt64() -band 0x80) -ne 0
    topmost = ([LightTodoWindowState]::GetStyle($lightTodoHwnd, -20).ToInt64() -band 0x08) -ne 0
} | ConvertTo-Json -Compress
