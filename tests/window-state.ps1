param([long]$WindowHandle)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LightTodoWindowState {
    [StructLayout(LayoutKind.Sequential)] public struct Rect {public int Left, Top, Right, Bottom;}
    [DllImport("user32.dll")] public static extern int GetWindowRgn(IntPtr hwnd, IntPtr region);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int a,int b,int c,int d);
    [DllImport("gdi32.dll")] public static extern int GetRgnBox(IntPtr region, out Rect box);
    [DllImport("gdi32.dll")] public static extern bool PtInRegion(IntPtr region, int x,int y);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr obj);
    public static bool HasRoundedCorners(IntPtr hwnd) {
        IntPtr r=CreateRectRgn(0,0,0,0);
        try { if(GetWindowRgn(hwnd,r)==0)return false; Rect b;GetRgnBox(r,out b);
          return !PtInRegion(r,b.Left,b.Top) && !PtInRegion(r,b.Right-1,b.Top)
            && !PtInRegion(r,b.Left,b.Bottom-1) && !PtInRegion(r,b.Right-1,b.Bottom-1)
            && PtInRegion(r,(b.Left+b.Right)/2,(b.Top+b.Bottom)/2);
        } finally {DeleteObject(r);}
    }
    [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr hwnd);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")]
    public static extern IntPtr GetStyle(IntPtr hwnd, int index);
}
'@
$lightTodoHwnd = [IntPtr]::new($WindowHandle)
[ordered]@{
    rounded = [LightTodoWindowState]::HasRoundedCorners($lightTodoHwnd)
    parent = [LightTodoWindowState]::GetParent($lightTodoHwnd).ToInt64().ToString()
    child = ([LightTodoWindowState]::GetStyle($lightTodoHwnd, -16).ToInt64() -band 0x40000000) -ne 0
    toolWindow = ([LightTodoWindowState]::GetStyle($lightTodoHwnd, -20).ToInt64() -band 0x80) -ne 0
    topmost = ([LightTodoWindowState]::GetStyle($lightTodoHwnd, -20).ToInt64() -band 0x08) -ne 0
} | ConvertTo-Json -Compress
