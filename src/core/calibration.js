export class Calibration {
  constructor(dimensions = 2) {
    this.dimensions = dimensions;
    this.points = [];
  }
  addPoint(px, py, dx = null, dy = null, dz = null) {
    this.points.push({ px: Number(px), py: Number(py), dx, dy, dz });
  }
  setData(index, dx, dy, dz = null) {
    if (!this.points[index]) return;
    this.points[index] = { ...this.points[index], dx, dy, dz };
  }
  replacePoint(index, px, py) {
    if (!this.points[index]) return;
    this.points[index] = { ...this.points[index], px: Number(px), py: Number(py) };
  }
  clear() { this.points = []; }
  getCount() { return this.points.length; }
  getPoint(i) { return this.points[i]; }
}

export const parseNumeric = (value) => {
  if (value === '' || value === null || value === undefined) throw new Error('Missing calibration value');
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid numeric value: ${value}`);
  return n;
};
