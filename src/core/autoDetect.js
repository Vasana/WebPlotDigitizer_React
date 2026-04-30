import { average } from './math.js';

export function samplePixel(imageData, x, y) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= imageData.width || iy >= imageData.height) return [0, 0, 0, 0];
  const i = (iy * imageData.width + ix) * 4;
  return [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2], imageData.data[i + 3]];
}
export function colorDistance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
export function buildMask(imageData, targetRgb, tolerance = 55, roi = null) {
  const { width: w, height: h, data } = imageData;
  const mask = new Uint8Array(w * h);
  const x0 = Math.max(0, Math.floor(roi?.x ?? 0));
  const y0 = Math.max(0, Math.floor(roi?.y ?? 0));
  const x1 = Math.min(w, Math.ceil(roi ? roi.x + roi.w : w));
  const y1 = Math.min(h, Math.ceil(roi ? roi.y + roi.h : h));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 0 && colorDistance([data[i], data[i + 1], data[i + 2]], targetRgb) <= tolerance) mask[y * w + x] = 1;
  }
  return mask;
}

export function detectColorPoints(imageData, targetRgb, options = {}) {
  const { tolerance = 55, step = 2, minClusterSize = 3, maxPoints = 2500, roi = null } = options;
  const w = imageData.width, h = imageData.height;
  const x0 = roi?.x ?? 0, y0 = roi?.y ?? 0, x1 = roi ? roi.x + roi.w : w, y1 = roi ? roi.y + roi.h : h;
  const hits = [];
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y += step) for (let x = Math.max(0, x0); x < Math.min(w, x1); x += step) {
    const p = samplePixel(imageData, x, y);
    if (p[3] > 0 && colorDistance(p, targetRgb) <= tolerance) hits.push({ x, y });
  }
  if (!hits.length) return [];
  const bucketSize = Math.max(3, step * 4), buckets = new Map();
  for (const p of hits) {
    const key = `${Math.floor(p.x / bucketSize)}:${Math.floor(p.y / bucketSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
  const points = [];
  for (const pts of buckets.values()) {
    if (pts.length < minClusterSize) continue;
    points.push({ px: average(pts.map(p => p.x)), py: average(pts.map(p => p.y)), source: 'auto-thinned' });
    if (points.length >= maxPoints) break;
  }
  return points.sort((a, b) => a.px - b.px || a.py - b.py);
}

export function detectBlobs(imageData, targetRgb, options = {}) {
  const { tolerance = 55, minArea = 4, maxArea = 100000, maxPoints = 2000, roi = null } = options;
  const w = imageData.width, h = imageData.height, mask = buildMask(imageData, targetRgb, tolerance, roi);
  const seen = new Uint8Array(w * h); const pts = [];
  const qx = [], qy = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const start = y * w + x;
    if (!mask[start] || seen[start]) continue;
    let count = 0, sx = 0, sy = 0, minX = x, maxX = x, minY = y, maxY = y;
    qx.length = 0; qy.length = 0; qx.push(x); qy.push(y); seen[start] = 1;
    while (qx.length) {
      const cx = qx.pop(), cy = qy.pop(); count++; sx += cx; sy += cy;
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx; if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (mask[ni] && !seen[ni]) { seen[ni] = 1; qx.push(nx); qy.push(ny); }
      }
    }
    if (count >= minArea && count <= maxArea) pts.push({ px: sx / count, py: sy / count, area: count, width: maxX - minX + 1, height: maxY - minY + 1, source: 'blob' });
    if (pts.length >= maxPoints) return pts;
  }
  return pts.sort((a, b) => a.px - b.px || a.py - b.py);
}

export function averagingWindow(imageData, targetRgb, options = {}) {
  const { tolerance = 55, windowSize = 8, step = 4, minPixels = 2 } = options;
  const w = imageData.width, h = imageData.height, mask = buildMask(imageData, targetRgb, tolerance, options.roi);
  const pts = [];
  for (let x = 0; x < w; x += step) {
    let ys = [];
    for (let yy = 0; yy < h; yy++) {
      let count = 0, sy = 0;
      for (let y = yy; y < Math.min(h, yy + windowSize); y++) if (mask[y * w + x]) { count++; sy += y; }
      if (count >= minPixels) ys.push(sy / count);
    }
    if (ys.length) pts.push({ px: x, py: average(ys), source: 'avg-window' });
  }
  return pts;
}

function groupRuns(values) {
  if (!values.length) return [];
  values.sort((a, b) => a - b);
  const runs = [];
  let start = values[0], end = values[0], count = 1, sum = values[0];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (v <= end + 1) { end = v; count++; sum += v; }
    else { runs.push({ start, end, count, mean: sum / count }); start = end = v; count = 1; sum = v; }
  }
  runs.push({ start, end, count, mean: sum / count });
  return runs;
}

function chooseRun(runs, previousY = null) {
  if (!runs.length) return null;
  if (previousY !== null && Number.isFinite(previousY)) {
    return runs.slice().sort((a, b) => Math.abs(a.mean - previousY) - Math.abs(b.mean - previousY) || b.count - a.count)[0];
  }
  return runs.slice().sort((a, b) => b.count - a.count)[0];
}

export function traceXYLine(imageData, targetRgb, options = {}) {
  const { tolerance = 55, xStep = 2, minPixels = 1, roi = null } = options;
  const w = imageData.width, h = imageData.height;
  const mask = buildMask(imageData, targetRgb, tolerance, roi);
  const x0 = Math.max(0, Math.floor(roi?.x ?? 0));
  const y0 = Math.max(0, Math.floor(roi?.y ?? 0));
  const x1 = Math.min(w - 1, Math.ceil(roi ? roi.x + roi.w : w - 1));
  const y1 = Math.min(h - 1, Math.ceil(roi ? roi.y + roi.h : h - 1));
  const step = Math.max(1, Number(xStep) || 1);
  const pts = [];
  let previousY = null;
  for (let x = x0; x <= x1; x += step) {
    const ys = [];
    for (let sx = x; sx < Math.min(x + step, x1 + 1); sx++) {
      for (let y = y0; y <= y1; y++) if (mask[y * w + sx]) ys.push(y);
    }
    const run = chooseRun(groupRuns(ys).filter(r => r.count >= minPixels), previousY);
    if (!run) continue;
    pts.push({ px: Math.min(x + (step - 1) / 2, x1), py: run.mean, pixels: run.count, source: 'xy-line-trace' });
    previousY = run.mean;
  }
  return pts;
}

export function xStepInterpolation(imageData, targetRgb, axes, options = {}) {
  if (!axes?.isReady || typeof axes.dataToPixel !== 'function') return [];
  const { tolerance = 55, xMin, xMax, xStep, yScanPixels = '' } = options;
  const mask = buildMask(imageData, targetRgb, tolerance, options.roi);
  const pts = [];
  const start = Number(xMin), end = Number(xMax), step = Number(xStep);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(step) || step === 0) return pts;

  const yMinData = Number.isFinite(axes.bounds?.ymin) ? axes.bounds.ymin : 0;
  const yMaxData = Number.isFinite(axes.bounds?.ymax) ? axes.bounds.ymax : 0;
  let previousY = null;

  for (let x = start; step > 0 ? x <= end + 1e-12 : x >= end - 1e-12; x += step) {
    const low = axes.dataToPixel(x, yMinData);
    const high = axes.dataToPixel(x, yMaxData);
    const px = Math.round(low.x);
    if (px < 0 || px >= imageData.width) continue;

    let y0, y1;
    const scan = Number(yScanPixels);
    if (Number.isFinite(scan) && scan > 0) {
      const mid = (low.y + high.y) / 2;
      y0 = Math.max(0, Math.round(mid - scan));
      y1 = Math.min(imageData.height - 1, Math.round(mid + scan));
    } else {
      y0 = Math.max(0, Math.floor(Math.min(low.y, high.y)) - 2);
      y1 = Math.min(imageData.height - 1, Math.ceil(Math.max(low.y, high.y)) + 2);
    }

    const ys = [];
    for (let y = y0; y <= y1; y++) if (mask[y * imageData.width + px]) ys.push(y);
    const run = chooseRun(groupRuns(ys), previousY);
    if (run) { pts.push({ px, py: run.mean, source: 'x-step' }); previousY = run.mean; }
  }
  return pts;
}
