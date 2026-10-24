import * as THREE from 'three';
import { GlobeHandle } from 'src/app/shared/three/scene-types';
import {
  SPIN_PER_MS,
  SPIN_START,
  ScreenPoint,
  TILT_DEFAULT,
  clampTilt,
  latLonToUnit,
  projectToScreen,
} from 'src/app/shared/three/globe/globe-math';
import { GLOBE_PINS } from 'src/app/shared/three/globe/globe-pins';

/** Sphere radius as a fraction of the canvas's shorter side (mockup: R = s * 0.4). */
const RADIUS_FRACTION = 0.4;
/** Halo reaches out to this multiple of the sphere radius (mockup: gradient R*0.95 -> R*1.25). */
const HALO_OUTER = 1.25;
const HALO_INNER = 0.95;
const HALO_ALPHA = 0.14;
/** Thin volt rim just outside the sphere edge (mockup: 1px stroke at R, rgba(255,79,139,.25)). */
const RIM_ALPHA = 0.25;
const RIM_PX = 1;
/** Radians per CSS px of pointer drag. */
const DRAG_GAIN = 0.005;
/** Tilt ease-back duration after release. */
const RELEASE_EASE_MS = 600;
/** Cap per-frame dt so a resumed loop (tab switch, scroll back) doesn't jump. */
const MAX_DT_MS = 100;
/**
 * Fixed mesh yaw that puts the equirectangular texture in the `latLonToUnit` frame.
 * SphereGeometry places UV u at phi = 2*pi*u with vertex (-cos phi, y, sin phi); the texture's
 * u maps to lon = 360u - 180, so texture longitude L sits at (cos L, y, -sin L). Rotating that by
 * -pi/2 about Y gives (sin L, y, cos L), which is exactly `latLonToUnit`'s x/z for lon L.
 */
const LON_ALIGN = -Math.PI / 2;

const GLOBE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Tint math copied from the approved 2D mockup (globe-tilt.html, mode 3). The texture is sampled
// raw (NoColorSpace) and written raw, so the byte-level formulas carry over 1:1.
const GLOBE_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 lightDir;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vec3 c = texture2D(map, vUv).rgb;
    float l = dot(c, vec3(0.3, 0.59, 0.11));
    bool water = c.b > c.r + 12.0 / 255.0 && c.b >= c.g - 4.0 / 255.0;
    bool land = !water && (c.r + c.g + c.b) > 60.0 / 255.0;
    vec3 tint = land
      ? (vec3(40.0, 30.0, 80.0) + l * vec3(215.0, 120.0, 160.0)) / 255.0
      : (vec3(22.0, 18.0, 50.0) + l * vec3(40.0, 30.0, 80.0)) / 255.0;
    float lit = max(0.0, dot(normalize(vNormal), lightDir));
    gl_FragColor = vec4(min(tint * (0.35 + 0.65 * lit), 1.0), 1.0);
  }
`;

const HALO_VERTEX = /* glsl */ `
  varying vec2 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = mv.xy;
    gl_Position = projectionMatrix * mv;
  }
`;

// Orthographic camera on the +z axis: view-space xy distance from the centre is the on-screen radius
// in sphere units, so this reproduces the mockup's radial gradient exactly.
const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 color;
  uniform float inner;
  uniform float outer;
  uniform float peak;
  uniform float rimAlpha;
  uniform float rimWidth;
  varying vec2 vView;
  void main() {
    float r = length(vView);
    float t = clamp((r - inner) / (outer - inner), 0.0, 1.0);
    float halo = peak * (1.0 - t);
    // Rim stroke sits just outside r = 1 (inside it, the globe occludes the halo); composited over
    // the halo like the mockup's stroke-over-gradient.
    float rim = rimAlpha * (1.0 - smoothstep(0.0, rimWidth, abs(r - 1.0 - 0.5 * rimWidth)));
    gl_FragColor = vec4(color, halo + rim * (1.0 - halo));
  }
`;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
/** Spin speed ramps from 0 to full over this long after every start(), so the globe eases into
 *  motion (first appearance, and resuming after a hover/focus pause) instead of jumping to speed. */
const SPIN_RAMP_MS = 2000;
const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * Tinted, spinning Earth for the landing hero.
 *
 * Alignment contract: the group/mesh rotations equal `projectToScreen` (group.rotation.x = tilt
 * wraps mesh.rotation.y = spin + LON_ALIGN, i.e. world = Rx(tilt) * Ry(spin) * v), and the
 * orthographic camera maps one world unit to `radiusPx` CSS px around the canvas centre, so DOM
 * pins placed with `projectToScreen` land on the rendered texture.
 */
export const createGlobeScene = async (
  canvas: HTMLCanvasElement,
  textureUrl: string,
): Promise<GlobeHandle> => {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  let texture: THREE.Texture;
  try {
    texture = await new THREE.TextureLoader().loadAsync(textureUrl);
  } catch (err) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw err;
  }
  texture.colorSpace = THREE.NoColorSpace; // sample raw bytes, like the mockup's getImageData
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  // Orthographic, not perspective: projectToScreen is an orthographic projection, and any
  // perspective would shift pins off their cities by several % of the radius away from the centre.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.set(0, 0, 5);

  const geometry = new THREE.SphereGeometry(1, 96, 64);
  const globeMaterial = new THREE.ShaderMaterial({
    vertexShader: GLOBE_VERTEX,
    fragmentShader: GLOBE_FRAGMENT,
    uniforms: {
      map: { value: texture },
      lightDir: { value: new THREE.Vector3(-0.5, 0.55, 0.67).normalize() },
    },
  });
  const globe = new THREE.Mesh(geometry, globeMaterial);
  const tiltGroup = new THREE.Group();
  tiltGroup.add(globe);
  scene.add(tiltGroup);

  const haloMaterial = new THREE.ShaderMaterial({
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    uniforms: {
      // Volt, kept raw (no sRGB->linear) because the shader output is not colour-managed either.
      color: { value: new THREE.Color().setStyle('#ff4f8b', THREE.NoColorSpace) },
      inner: { value: HALO_INNER },
      outer: { value: HALO_OUTER },
      peak: { value: HALO_ALPHA },
      rimAlpha: { value: RIM_ALPHA },
      rimWidth: { value: 0.01 }, // set per resize: RIM_PX in sphere units
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    // Normal (source-over) blending, not additive: on a transparent canvas additive output would be
    // invalid premultiplied colour; source-over matches the mockup's gradient-over-ink exactly.
    blending: THREE.NormalBlending,
  });
  const halo = new THREE.Mesh(geometry, haloMaterial);
  halo.scale.setScalar(HALO_OUTER);
  halo.renderOrder = 1;
  scene.add(halo);

  let spin = SPIN_START;
  let tilt = TILT_DEFAULT;
  let dragging = false;
  let ease: { from: number; start: number } | null = null;
  let raf = 0;
  /** Loop wanted (start() called, stop() not). Separate from `raf` so a stop()+start() from an
   *  onProject subscriber mid-frame never leaves two loops scheduled. */
  let running = false;
  /** Set by dispose(): every entry point no-ops afterwards (the context is lost). */
  let disposed = false;
  let lastTime = 0;
  let rampStart = 0;
  let width = 0;
  let height = 0;
  let lastPoints: ScreenPoint[] | null = null;
  const subscribers = new Set<(points: ScreenPoint[]) => void>();
  const pinVectors = GLOBE_PINS.map((p) => latLonToUnit(p.lat, p.lon));

  const draw = () => {
    if (!width || !height) return;
    globe.rotation.y = spin + LON_ALIGN;
    tiltGroup.rotation.x = tilt;
    renderer.render(scene, camera);

    const radiusPx = Math.min(width, height) * RADIUS_FRACTION;
    const points = pinVectors.map((v) =>
      projectToScreen(v, spin, tilt, radiusPx, width / 2, height / 2),
    );
    lastPoints = points;
    for (const cb of subscribers) cb(points);
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    // One world unit (the sphere radius) = radiusPx CSS px, centred on the canvas.
    const unitsPerPx = 1 / (Math.min(w, h) * RADIUS_FRACTION);
    haloMaterial.uniforms['rimWidth'].value = RIM_PX * unitsPerPx;
    camera.left = (-w / 2) * unitsPerPx;
    camera.right = (w / 2) * unitsPerPx;
    camera.top = (h / 2) * unitsPerPx;
    camera.bottom = (-h / 2) * unitsPerPx;
    camera.updateProjectionMatrix();
  };

  const frame = (now: number) => {
    if (disposed || !running) return;
    const self = raf;
    const dt = lastTime ? Math.min(now - lastTime, MAX_DT_MS) : 0;
    lastTime = now;
    if (!rampStart) rampStart = now;
    const ramp = smoothstep(Math.min(1, (now - rampStart) / SPIN_RAMP_MS));
    if (!dragging) spin += SPIN_PER_MS * dt * ramp;
    if (ease) {
      const t = Math.min(1, (now - ease.start) / RELEASE_EASE_MS);
      tilt = ease.from + (TILT_DEFAULT - ease.from) * easeOutCubic(t);
      if (t >= 1) ease = null;
    }
    draw();
    // A subscriber may have called stop()/dispose() (or stop()+start(), which already scheduled a
    // fresh frame) during draw(): only continue this loop if it is still the live one.
    if (running && !disposed && raf === self) raf = requestAnimationFrame(frame);
  };

  const renderOnce = () => {
    if (disposed) return;
    resize();
    draw();
  };

  const dragBy = (dxPx: number, dyPx: number) => {
    if (disposed) return;
    dragging = true;
    ease = null;
    spin += dxPx * DRAG_GAIN;
    tilt = clampTilt(tilt + dyPx * DRAG_GAIN);
    if (!running) draw();
  };

  resize();
  const ro = new ResizeObserver(() => {
    if (disposed) return;
    resize();
    if (!running) draw();
  });
  ro.observe(canvas);

  return {
    start: () => {
      // No-op after dispose so late IntersectionObserver / visibilitychange callbacks are safe.
      if (disposed || running) return;
      running = true;
      lastTime = 0;
      rampStart = 0;
      raf = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    },
    renderOnce,
    setPointer: () => {},
    setDrag: (dxPx) => dragBy(dxPx, 0),
    dragBy,
    release: () => {
      if (disposed) return;
      dragging = false;
      if (running) {
        ease = { from: tilt, start: performance.now() };
      } else {
        ease = null;
        tilt = TILT_DEFAULT;
        draw();
      }
    },
    onProject: (cb) => {
      subscribers.add(cb);
      // Late subscribers (e.g. after a reduced-motion renderOnce) get the current frame right away.
      if (lastPoints) cb(lastPoints);
      return () => {
        subscribers.delete(cb);
      };
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      subscribers.clear();
      geometry.dispose();
      globeMaterial.dispose();
      haloMaterial.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};
