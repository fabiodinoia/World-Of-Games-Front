import { InjectionToken } from '@angular/core';

export const WEBGL_SUPPORT = new InjectionToken<() => boolean>('WEBGL_SUPPORT', {
  factory: () => () => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      if (!gl) return false;
      gl.getExtension('WEBGL_lose_context')?.loseContext(); // release the probe context
      return true;
    } catch {
      return false;
    }
  },
});
