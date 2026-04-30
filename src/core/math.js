export const mat = {
  det2x2: (m) => m[0] * m[3] - m[1] * m[2],
  inv2x2(m) {
    const det = this.det2x2(m);
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) throw new Error('Calibration points are degenerate. Pick points farther apart.');
    return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
  },
  mult2x2: (a, b) => [
    a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]
  ],
  mult2x2Vec: (m, v) => [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]]
};

export const dist2d = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const average = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
