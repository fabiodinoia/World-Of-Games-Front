import {
  SPIN_START,
  TILT_DEFAULT,
  TILT_MAX,
  TILT_MIN,
  clampTilt,
  latLonToUnit,
  projectToScreen,
} from 'src/app/shared/three/globe/globe-math';

describe('globe-math', () => {
  it('maps lat/lon 0,0 to +z and the north pole to +y', () => {
    expect(latLonToUnit(0, 0).map((n) => +n.toFixed(6))).toEqual([0, 0, 1]);
    expect(latLonToUnit(90, 0)[1]).toBeCloseTo(1, 6);
  });

  it('projects the facing point to the centre, in front', () => {
    const p = projectToScreen([0, 0, 1], 0, 0, 100, 200, 200);
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(200);
    expect(p.front).toBeTrue();
  });

  it('puts the far side behind', () => {
    expect(projectToScreen([0, 0, -1], 0, 0, 100, 200, 200).front).toBeFalse();
  });

  it('positive tilt brings the north pole toward the viewer and up the screen', () => {
    const p = projectToScreen([0, 1, 0], 0, TILT_DEFAULT, 100, 200, 200);
    expect(p.depth).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(200);
  });

  it('Europe faces the viewer at the start spin', () => {
    const berlin = projectToScreen(
      latLonToUnit(52.5, 13.4),
      SPIN_START,
      TILT_DEFAULT,
      100,
      0,
      0,
    );
    expect(berlin.front).toBeTrue();
  });

  it('clamps tilt', () => {
    expect(clampTilt(5)).toBe(TILT_MAX);
    expect(clampTilt(-5)).toBe(TILT_MIN);
    expect(clampTilt(0.3)).toBe(0.3);
  });
});
