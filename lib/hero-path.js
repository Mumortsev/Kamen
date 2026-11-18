// The layer shares the poster's cover geometry. Coordinates describe the
// cropped texture asset inside each original photograph.
const bounds = {
  desktop: [0.36805556, 0.80123457, 0.28472222, 0.19876543],
  mobile: [0.00833333, 0.6390625, 0.44027778, 0.3609375],
};

export const pathNames = {
  white: 'Белая мраморная крошка',
  honey: 'Медовая мраморная крошка',
  black: 'Чёрная мраморная крошка',
};

export function positionPath(layer, format, layout, { scale, ox, oy }) {
  const [x, y, w, h] = bounds[format];
  layer.style.left = `${ox + x * layout.w * scale}px`;
  layer.style.top = `${oy + y * layout.h * scale}px`;
  layer.style.width = `${w * layout.w * scale}px`;
  layer.style.height = `${h * layout.h * scale}px`;
}

export function revealPath(layer, amount) {
  if (amount <= 0) {
    layer.style.visibility = 'hidden';
    return;
  }
  layer.style.visibility = 'visible';
  if (amount >= 1) {
    layer.style.clipPath = 'none';
    return;
  }
  // A shallow irregular edge travels along the spread, completely reversible
  // from the current scroll position. No grains are drawn at runtime.
  const edge = amount * 100;
  const y = offset => Math.max(0, Math.min(100, edge + offset * Math.sin(Math.PI * amount)));
  layer.style.clipPath = `polygon(0 0,100% 0,100% ${y(-3)}%,80% ${y(0)}%,60% ${y(2)}%,40% ${y(-1)}%,20% ${y(3)}%,0 ${y(-1)}%)`;
}
