import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneHandle } from 'src/app/shared/three/scene-types';
import { dragRotation } from 'src/app/shared/three/pointer-math';

const DECORATION_NAMES = ['Stripe', 'MintLine', 'WOGTitle', 'WOGText'] as const;

/** Per-game copy printed on the back of the case. `price` arrives pre-formatted (e.g. `€29.99`). */
export interface BackInfo {
  title: string;
  description: string;
  genre: string;
  price: string;
}

/** A texture plus the cloned material that owns it, so dispose() can free both. */
interface AppliedSkin {
  texture: THREE.Texture;
  material: THREE.Material;
}

const BACK_W = 512;
const BACK_H = 768;
const BACK_PAD = 24;
const BAND_H = 90;
const INK = '#13102a';
const MINT = '#5ee6c3';
const PAPER = '#f5f2ff';
const HAZE = '#a8a2cf';
const LINE = '#3b3466';
const VOLT = '#ff4f8b';
const VOLT_INK = '#1a0712';
const DISPLAY_FONT = "'Big Shoulders Display Variable', sans-serif";
const BODY_FONT = "'Figtree Variable', sans-serif";
const ELLIPSIS = '…';

/** Shortens `text` until `text…` fits in `maxWidth`. */
const fitWithEllipsis = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  let out = text.trimEnd();
  while (out.length > 0 && ctx.measureText(out + ELLIPSIS).width > maxWidth) {
    out = out.slice(0, -1).trimEnd();
  }
  return out + ELLIPSIS;
};

/** Word-wraps `text` with the current ctx font; overflow beyond `maxLines` is ellipsized. */
const wrapLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let i = 0;
  for (; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (!current || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = words[i];
    if (lines.length === maxLines) break;
  }
  const truncated = i < words.length;
  if (!truncated && current) lines.push(current);

  const result = lines.slice(0, maxLines).map((line) =>
    ctx.measureText(line).width > maxWidth ? fitWithEllipsis(ctx, line, maxWidth) : line,
  );
  if (truncated && result.length) {
    const last = result.length - 1;
    if (!result[last].endsWith(ELLIPSIS)) result[last] = fitWithEllipsis(ctx, result[last], maxWidth);
  }
  return result;
};

/** Deterministic PRNG (mulberry32) seeded from the title's char codes. */
const seededRandom = (seedText: string): (() => number) => {
  let seed = 0x9e3779b9;
  for (let i = 0; i < seedText.length; i++) seed = Math.imul(seed ^ seedText.charCodeAt(i), 0x85ebca6b);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Draws text with manual letter spacing, centred on `cx`. */
const drawSpacedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number,
): void => {
  const chars = [...text];
  const total =
    chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  for (const ch of chars) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
};

/**
 * Renders the "back of the box" art for a game: plain Canvas 2D, no three.js.
 * The GLB's BackPlate UVs are already mirrored, so this draws the layout normally.
 */
export const drawBackOfBox = (info: BackInfo): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = BACK_W;
  canvas.height = BACK_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  const contentW = BACK_W - BACK_PAD * 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, BACK_W, BACK_H);

  // Mint rule
  ctx.fillStyle = MINT;
  ctx.fillRect(BACK_PAD, 32, contentW, 6);

  // Title (max 2 lines)
  let y = 60;
  ctx.font = `700 44px ${DISPLAY_FONT}`;
  ctx.fillStyle = PAPER;
  for (const line of wrapLines(ctx, info.title, contentW, 2)) {
    ctx.fillText(line, BACK_PAD, y);
    y += 48;
  }

  // Description (max 7 lines, line-height 32)
  y += 18;
  ctx.font = `400 22px ${BODY_FONT}`;
  ctx.fillStyle = HAZE;
  for (const line of wrapLines(ctx, info.description, contentW, 7)) {
    ctx.fillText(line, BACK_PAD, y);
    y += 32;
  }

  // Genre chip
  const genre = info.genre.trim();
  if (genre) {
    y += 16;
    ctx.font = `600 16px ${BODY_FONT}`;
    const label = ctx.measureText(genre).width > contentW - 28 ? fitWithEllipsis(ctx, genre, contentW - 28) : genre;
    const chipW = ctx.measureText(label).width + 28;
    const chipH = 34;
    roundRectPath(ctx, BACK_PAD + 1, y + 1, chipW - 2, chipH - 2, chipH / 2 - 1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = LINE;
    ctx.stroke();
    ctx.fillStyle = MINT;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, BACK_PAD + 14, y + chipH / 2 + 1);
  }

  // Volt bottom band
  const bandY = BACK_H - BAND_H;
  ctx.fillStyle = VOLT;
  ctx.fillRect(0, bandY, BACK_W, BAND_H);

  // Barcode (right), seeded from the title so each game keeps its own pattern
  const rand = seededRandom(info.title);
  const barWidths = Array.from({ length: 28 }, () => 2 + Math.floor(rand() * 5)); // 2–6px
  const barGap = 2;
  const barcodeW = barWidths.reduce((sum, w) => sum + w, 0) + barGap * (barWidths.length - 1);
  const barcodeX = BACK_W - BACK_PAD - barcodeW;
  const barTop = bandY + 14;
  const barH = 46;
  ctx.fillStyle = VOLT_INK;
  let bx = barcodeX;
  for (const w of barWidths) {
    ctx.fillRect(bx, barTop, w, barH);
    bx += w + barGap;
  }
  ctx.font = `700 14px ${DISPLAY_FONT}`;
  ctx.textBaseline = 'top';
  drawSpacedText(ctx, 'WORLD OF GAMES', barcodeX + barcodeW / 2, barTop + barH + 4, 3);

  // Price (left)
  ctx.font = `800 40px ${DISPLAY_FONT}`;
  ctx.textBaseline = 'middle';
  const priceMaxW = barcodeX - BACK_PAD * 2;
  const price =
    ctx.measureText(info.price).width > priceMaxW ? fitWithEllipsis(ctx, info.price, priceMaxW) : info.price;
  ctx.fillText(price, BACK_PAD, bandY + BAND_H / 2 + 2);

  return canvas;
};

/**
 * Puts the game's cover art on the `Cover` mesh and hides the baked decorations.
 * Enhancement only: on any failure it warns, leaves the generic baked cover intact and returns null.
 */
const applyCoverArt = async (model: THREE.Group, coverUrl: string): Promise<AppliedSkin | null> => {
  try {
    const texture = await new THREE.TextureLoader().loadAsync(coverUrl);
    texture.flipY = false; // glTF UV convention
    texture.colorSpace = THREE.SRGBColorSpace;

    const cover = model.getObjectByName('Cover');
    if (!(cover instanceof THREE.Mesh) || Array.isArray(cover.material)) {
      texture.dispose();
      console.warn('[game-case] Cover mesh not found; keeping baked cover.');
      return null;
    }
    const material = (cover.material as THREE.MeshStandardMaterial).clone();
    material.map = texture;
    material.color.set('#ffffff');
    material.needsUpdate = true;
    cover.material = material;

    for (const name of DECORATION_NAMES) {
      const obj = model.getObjectByName(name);
      if (obj) obj.visible = false;
    }
    return { texture, material };
  } catch (err) {
    console.warn('[game-case] Cover art failed to load; keeping baked cover.', err);
    return null;
  }
};

/**
 * Paints the generated back-of-box art onto the `BackPlate` mesh.
 * Enhancement only: on any failure it warns, keeps the plain plate and returns null.
 */
const applyBackArt = async (model: THREE.Group, info: BackInfo): Promise<AppliedSkin | null> => {
  let texture: THREE.CanvasTexture | null = null;
  try {
    // Make sure the web fonts are ready so the canvas doesn't fall back to sans-serif.
    if (typeof document !== 'undefined' && document.fonts) {
      await Promise.all([
        document.fonts.load(`700 44px ${DISPLAY_FONT}`),
        document.fonts.load(`800 40px ${DISPLAY_FONT}`),
        document.fonts.load(`400 22px ${BODY_FONT}`),
        document.fonts.load(`600 16px ${BODY_FONT}`),
      ]).catch(() => undefined);
    }

    const plate = model.getObjectByName('BackPlate');
    if (!(plate instanceof THREE.Mesh) || Array.isArray(plate.material)) {
      console.warn('[game-case] BackPlate mesh not found; keeping plain plate.');
      return null;
    }
    texture = new THREE.CanvasTexture(drawBackOfBox(info));
    texture.flipY = false; // glTF UV convention
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = (plate.material as THREE.MeshStandardMaterial).clone();
    material.map = texture;
    material.color.set('#ffffff');
    material.needsUpdate = true;
    plate.material = material;
    return { texture, material };
  } catch (err) {
    texture?.dispose();
    console.warn('[game-case] Back-of-box art failed; keeping plain plate.', err);
    return null;
  }
};

export const createGameCaseScene = async (
  canvas: HTMLCanvasElement,
  coverUrl?: string,
  back?: BackInfo,
): Promise<SceneHandle> => {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 3.2);

  scene.add(new THREE.AmbientLight('#a8a2cf', 0.5));
  const key = new THREE.DirectionalLight('#f5f2ff', 1.6);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight('#ff4f8b', 2.4);
  rim.position.set(-3, 1, -2);
  const fill = new THREE.DirectionalLight('#5ee6c3', 0.6);
  fill.position.set(3, -1, -1);
  scene.add(key, rim, fill);

  let model: THREE.Group;
  try {
    const gltf = await new GLTFLoader().loadAsync('assets/3d/game-case.glb');
    model = gltf.scene;
  } catch (err) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw err;
  }
  scene.add(model);

  // Applied before the first render so reduced-motion users get the textured still frame.
  // applyCoverArt/applyBackArt never throw, so they cannot reach the renderer-dispose path above.
  const coverSkin = coverUrl ? await applyCoverArt(model, coverUrl) : null;
  const backSkin = back ? await applyBackArt(model, back) : null;

  let rotY = 0;
  let dragging = false;
  let raf = 0;

  const resize = () => {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!raf) renderer.render(scene, camera);
  };
  const frame = () => {
    if (!dragging) rotY += 0.006; // idle spin
    model.rotation.y += (rotY - model.rotation.y) * 0.12;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return {
    start: () => {
      if (!raf) raf = requestAnimationFrame(frame);
    },
    stop: () => {
      cancelAnimationFrame(raf);
      raf = 0;
    },
    renderOnce: () => {
      resize();
      renderer.render(scene, camera);
    },
    setPointer: () => {},
    setDrag: (dxPx) => {
      dragging = dxPx !== 0;
      rotY = dragRotation(rotY, dxPx);
      if (!raf) {
        model.rotation.y = rotY;
        renderer.render(scene, camera);
      }
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      for (const skin of [coverSkin, backSkin]) {
        if (!skin) continue;
        skin.texture.dispose();
        skin.material.dispose();
      }
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};
