import { dragRotation } from 'src/app/shared/three/pointer-math';

describe('pointer-math', () => {
  it('accumulates drag rotation with sensitivity', () => {
    expect(dragRotation(1, 100, 0.005)).toBeCloseTo(1.5);
  });
});
