export function dragRotation(current: number, dxPx: number, sensitivity = 0.005): number {
  return current + dxPx * sensitivity;
}
