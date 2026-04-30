export function dist2d(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }
export function taninverse(y, x) {
  let theta = Math.atan2(y, x);
  if (theta < 0) theta += 2 * Math.PI;
  return theta;
}
export function normalizeAngleDeg(theta) {
  let v = theta % 360;
  if (v < 0) v += 360;
  return v;
}
export function getCircleFrom3Pts(pts) {
  const [[x1, y1], [x2, y2], [x3, y3]] = pts;
  const a = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2;
  if (Math.abs(a) < 1e-9) throw new Error('Selected points are nearly collinear; choose three points on a clear arc.');
  const b = (x1 * x1 + y1 * y1) * (y3 - y2) + (x2 * x2 + y2 * y2) * (y1 - y3) + (x3 * x3 + y3 * y3) * (y2 - y1);
  const c = (x1 * x1 + y1 * y1) * (x2 - x3) + (x2 * x2 + y2 * y2) * (x3 - x1) + (x3 * x3 + y3 * y3) * (x1 - x2);
  const x0 = -b / (2 * a);
  const y0 = -c / (2 * a);
  return { x0, y0, radius: dist2d(x0, y0, x1, y1) };
}

export function parseDateOrNumber(value) {
  const raw = String(value ?? '').trim();
  const n = Number(raw);
  if (raw !== '' && Number.isFinite(n)) return { value: n, isDate: false, format: null };
  const t = Date.parse(raw);
  if (Number.isFinite(t)) return { value: t, isDate: true, format: raw.includes('T') ? 'datetime' : 'date' };
  throw new Error(`Could not parse "${raw}" as a number or date.`);
}

export function formatDateNumber(ms, format = 'datetime') {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return String(ms);
  if (format === 'date') return d.toISOString().slice(0, 10);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
