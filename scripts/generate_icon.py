"""Rebuild code-drawn application icons. Requires Pillow (pip install pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'build'
root.mkdir(exist_ok=True)
im = Image.new('RGBA', (2048, 2048), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rounded_rectangle((48, 48, 2000, 2000), radius=480, fill='#edf2e8')
d.rounded_rectangle((344, 344, 1704, 1704), radius=352, fill='#b9d7c8')
points = [(668, 1020), (910, 1268), (1384, 748)]
d.line(points, fill='#486c56', width=132, joint='curve')
for x, y in points:
    d.ellipse((x-66, y-66, x+66, y+66), fill='#486c56')
d.ellipse((1476, 344, 1704, 572), fill='#ebcfaa')
im = im.resize((1024, 1024), Image.Resampling.LANCZOS)
im.save(root / 'icon.png')
im.save(root / 'icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
