import pathLayouts from './hero-path-layout.json';

export const pathNames = {
  white: 'Белая мраморная крошка',
  honey: 'Медовая мраморная крошка',
  black: 'Чёрная мраморная крошка',
};

const palettes = {
  white: ['#ece6d7', '#bbb09d', '#827967'],
  honey: ['#d8b68a', '#a1805a', '#65523b'],
  black: ['#8e8c85', '#56534e', '#252621'],
};
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (from, to, progress) => from + (to - from) * progress;
const landingStart = .2;
const landingEnd = .89;

function makeRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makePebbleSprites(finish) {
  const palette = palettes[finish];
  const random = makeRandom(735);
  return Array.from({ length: 7 }, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(6, 5, 17, 20);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(.54, palette[1]);
    gradient.addColorStop(1, palette[2]);
    context.fillStyle = gradient;
    context.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * i) / 4;
      const radius = 7 + random() * 3;
      const x = 12 + Math.cos(angle) * radius;
      const y = 12 + Math.sin(angle) * radius;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    return canvas;
  });
}

function buildPebbleFlow() {
  const random = makeRandom(23791);
  // Particles are repeatable on reverse scroll and grouped by landing position.
  return Array.from({ length: 18 }, (_, row) =>
    Array.from({ length: 13 }, (_, column) => ({
      depth: (row + random()) / 18,
      across: (column + .3 + random() * .4) / 13,
      duration: .145 + random() * .095,
      bounce: .035 + random() * .025,
      size: .65 + random() * .75,
      drift: (random() - .5) * 32,
      spin: (random() - .5) * 3,
      lift: .72 + random() * .55,
      sprite: Math.floor(random() * 7),
    })),
  ).flat();
}

export function createPathScene(layer, canvas) {
  const context = canvas.getContext('2d', { alpha: true });
  const pebbles = buildPebbleFlow();
  const sprites = new Map();
  let projection;
  let lastProgress = -1;
  let lastFinish;

  function position(format, layout, { scale, ox, oy, width, height }) {
    const { bounds: [x, y, w, h], corners } = pathLayouts[format];
    const imageWidth = layout.w * scale;
    const imageHeight = layout.h * scale;
    const left = ox + x * imageWidth;
    const top = oy + y * imageHeight;
    const layerWidth = w * imageWidth;
    const layerHeight = h * imageHeight;
    layer.style.left = `${left}px`;
    layer.style.top = `${top}px`;
    layer.style.width = `${layerWidth}px`;
    layer.style.height = `${layerHeight}px`;

    const [nearLeft, nearRight, frontRight, frontLeft] = corners.map(([px, py]) => ({
      x: ox + px * imageWidth,
      y: oy + py * imageHeight,
    }));
    const firstY = Math.min(nearLeft.y, nearRight.y);
    const lastY = Math.min(oy + imageHeight, height + 4);
    const fallHeight = Math.min(format === 'mobile' ? 122 : 164, height * .2);
    const margin = Math.ceil(layerWidth * .12 + 30);
    const canvasLeft = Math.max(0, Math.floor(left - margin));
    const canvasTop = Math.max(0, Math.floor(top - fallHeight * 1.35));
    const canvasWidth = Math.max(1, Math.min(width - canvasLeft, Math.ceil(layerWidth + margin * 2)));
    const canvasHeight = Math.max(1, Math.ceil(height - canvasTop));
    const dpr = Math.min(window.devicePixelRatio || 1, format === 'mobile' ? 1 : 1.25);
    canvas.style.cssText = `left:${canvasLeft}px;top:${canvasTop}px;width:${canvasWidth}px;height:${canvasHeight}px`;
    canvas.width = Math.ceil(canvasWidth * dpr);
    canvas.height = Math.ceil(canvasHeight * dpr);
    projection = {
      nearLeft, nearRight, frontLeft, frontRight, firstY, lastY, fallHeight, top, layerHeight,
      canvasLeft, canvasTop, dpr, format,
    };
    lastProgress = -1;
  }

  function render(progress, finish) {
    if (!projection || (progress === lastProgress && finish === lastFinish)) return;
    lastProgress = progress;
    lastFinish = finish;
    const g = projection;
    const spread = clamp((progress - landingStart) / (landingEnd - landingStart));
    const coveredTo = mix(g.firstY, g.lastY + 3, spread);
    layer.style.visibility = spread > 0 ? 'visible' : 'hidden';
    if (spread >= 1) {
      layer.style.clipPath = 'none';
    } else if (spread > 0) {
      const edge = (coveredTo - g.top) * 100 / g.layerHeight;
      const wave = Math.sin(Math.PI * spread);
      const at = offset => `${Math.max(0, Math.min(100, edge + offset * wave))}%`;
      layer.style.clipPath = `polygon(0 0,100% 0,100% ${at(-1)},82% ${at(1)},64% ${at(-2)},45% ${at(2)},26% ${at(-1)},0 ${at(1)})`;
    }

    if (!context) return;
    const active = progress > 0 && progress < 1 && g.lastY > g.firstY;
    canvas.style.visibility = active ? 'visible' : 'hidden';
    if (!active) return;
    context.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    context.clearRect(0, 0, canvas.width / g.dpr, canvas.height / g.dpr);
    if (!sprites.has(finish)) sprites.set(finish, makePebbleSprites(finish));
    const stones = sprites.get(finish);
    for (const pebble of pebbles) {
      const land = mix(landingStart, landingEnd, pebble.depth);
      const age = (progress - (land - pebble.duration)) / pebble.duration;
      const bounce = (progress - land) / pebble.bounce;
      if (age <= 0 || bounce >= 1) continue;
      const groundTop = mix(g.nearLeft.y, g.nearRight.y, pebble.across);
      const groundY = mix(groundTop, g.lastY, pebble.depth);
      const leftEdge = mix(g.nearLeft.x, g.frontLeft.x, clamp((groundY - g.nearLeft.y) / (g.frontLeft.y - g.nearLeft.y)));
      const rightEdge = mix(g.nearRight.x, g.frontRight.x, clamp((groundY - g.nearRight.y) / (g.frontRight.y - g.nearRight.y)));
      const groundX = mix(leftEdge, rightEdge, pebble.across);
      const lift = age < 1
        ? g.fallHeight * pebble.lift * (1 - age * age)
        : Math.sin(Math.PI * bounce) * (1 - bounce) * (4 + pebble.depth * 7);
      const size = (g.format === 'mobile' ? 4.5 : 5.5) * pebble.size * (1 + pebble.depth * .55);
      const x = groundX + pebble.drift * Math.max(0, 1 - age) - g.canvasLeft;
      const y = groundY - g.canvasTop;
      if (lift < 24) {
        context.globalAlpha = .3 * (1 - lift / 24);
        context.fillStyle = '#201812';
        context.beginPath();
        context.ellipse(groundX - g.canvasLeft, y + 1, size * .52, size * .17, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = Math.min(1, age * 8) * (1 - Math.max(0, bounce - .64) / .36);
      context.save();
      context.translate(x, y - lift);
      context.rotate(pebble.spin * age);
      context.drawImage(stones[pebble.sprite], -size * .6, -size * .6, size * 1.2, size * 1.2);
      context.restore();
    }
    context.globalAlpha = 1;
  }

  return { position, render };
}
