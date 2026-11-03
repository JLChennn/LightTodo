// Electron's shape coordinates are device-independent pixels, like getSize().
function roundedShape(width, height, radius = 22) {
  const r = Math.floor(Math.min(radius, width / 2, height / 2));
  const rects = [{ x: 0, y: r, width, height: height - 2 * r }];
  for (let y = 0; y < r; y++) {
    const inset = Math.ceil(r - Math.sqrt(r * r - (r - y - 0.5) ** 2));
    rects.push({ x: inset, y, width: width - 2 * inset, height: 1 });
    rects.push({ x: inset, y: height - y - 1, width: width - 2 * inset, height: 1 });
  }
  return rects;
}
module.exports = { roundedShape };
