export type Vec3 = [number, number, number];

export interface ScreenPoint {
  x: number;
  y: number;
  front: boolean;
  depth: number;
}

export const TILT_DEFAULT = 0.42;
export const TILT_MIN = -0.2;
export const TILT_MAX = 0.9;
export const SPIN_PER_MS = (2 * Math.PI) / 56000;
export const SPIN_START = (-10 * Math.PI) / 180;

const DEG = Math.PI / 180;

/** y up, lon 0 faces +z. */
export function latLonToUnit(lat: number, lon: number): Vec3 {
  const la = lat * DEG;
  const lo = lon * DEG;
  return [
    Math.cos(la) * Math.sin(lo),
    Math.sin(la),
    Math.cos(la) * Math.cos(lo),
  ];
}

export function clampTilt(t: number): number {
  return Math.min(TILT_MAX, Math.max(TILT_MIN, t));
}

// Convention: spin rotates about Y (x' = x cos + z sin), so the centred longitude is -spin and increasing spin carries points left->right (eastward Earth rotation); positive tilt rotates about X so the north pole moves toward the viewer (+z) and up the screen (screen y grows downward).
export function projectToScreen(
  v: Vec3,
  spin: number,
  tilt: number,
  radiusPx: number,
  cx: number,
  cy: number,
): ScreenPoint {
  const cs = Math.cos(spin);
  const ss = Math.sin(spin);
  const x1 = v[0] * cs + v[2] * ss;
  const z1 = -v[0] * ss + v[2] * cs;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const y2 = v[1] * ct - z1 * st;
  const z2 = v[1] * st + z1 * ct;
  return {
    x: cx + x1 * radiusPx,
    y: cy - y2 * radiusPx,
    front: z2 > 0.05,
    depth: z2,
  };
}
