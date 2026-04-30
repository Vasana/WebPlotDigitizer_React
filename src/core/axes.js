import { mat, dist2d } from './math.js';
import { parseNumeric } from './calibration.js';
import { taninverse, getCircleFrom3Pts, normalizeAngleDeg, parseDateOrNumber, formatDateNumber } from './geometry.js';

export class XYAxes {
  constructor() { this.name = 'XY'; this.isReady = false; this.labels = ['x', 'y']; }
  calibrate(cal, { logX = false, logY = false, noRotation = false } = {}) {
    if (cal.getCount() < 4) throw new Error('XY calibration needs four points: Xmin, Xmax, Ymin, Ymax.');
    const [p1, p2, p3, p4] = [0, 1, 2, 3].map((i) => cal.getPoint(i));
    let xmin = parseNumeric(p1.dx), xmax = parseNumeric(p2.dx), ymin = parseNumeric(p3.dy), ymax = parseNumeric(p4.dy);
    this.logX = logX; this.logY = logY; this.logXNeg = false; this.logYNeg = false;
    if (logX) { this.logXNeg = xmin < 0 && xmax < 0; xmin = Math.log10(Math.abs(xmin)); xmax = Math.log10(Math.abs(xmax)); }
    if (logY) { this.logYNeg = ymin < 0 && ymax < 0; ymin = Math.log10(Math.abs(ymin)); ymax = Math.log10(Math.abs(ymax)); }
    const dataMat = [xmin - xmax, 0, 0, ymin - ymax];
    const pixMat = [p1.px - p2.px, p3.px - p4.px, p1.py - p2.py, p3.py - p4.py];
    this.a = mat.mult2x2(dataMat, mat.inv2x2(pixMat));
    if (noRotation) {
      if (Math.abs(this.a[0] * this.a[3]) > Math.abs(this.a[1] * this.a[2])) {
        this.a[1] = 0; this.a[2] = 0; this.a[0] = (xmax - xmin) / (p2.px - p1.px); this.a[3] = (ymax - ymin) / (p4.py - p3.py);
      } else {
        this.a[0] = 0; this.a[3] = 0; this.a[1] = (xmax - xmin) / (p2.py - p1.py); this.a[2] = (ymax - ymin) / (p4.px - p3.px);
      }
    }
    this.ai = mat.inv2x2(this.a);
    this.c = [xmin - this.a[0] * p1.px - this.a[1] * p1.py, ymin - this.a[2] * p3.px - this.a[3] * p3.py];
    this.bounds = { xmin, xmax, ymin, ymax };
    this.isReady = true;
  }
  pixelToData(px, py) {
    if (!this.isReady) return [null, null];
    const d = mat.mult2x2Vec(this.a, [Number(px), Number(py)]);
    let x = d[0] + this.c[0], y = d[1] + this.c[1];
    if (this.logX) x = (this.logXNeg ? -1 : 1) * 10 ** x;
    if (this.logY) y = (this.logYNeg ? -1 : 1) * 10 ** y;
    return [x, y];
  }
  dataToPixel(x, y) {
    let dx = Number(x), dy = Number(y);
    if (this.logX) dx = Math.log10(Math.abs(dx));
    if (this.logY) dy = Math.log10(Math.abs(dy));
    const p = mat.mult2x2Vec(this.ai, [dx - this.c[0], dy - this.c[1]]);
    return { x: p[0], y: p[1] };
  }
}

export class MapAxes {
  constructor() { this.name = 'Map'; this.isReady = false; this.labels = ['distance_x', 'distance_y']; }
  calibrate(cal) {
    if (cal.getCount() < 2) throw new Error('Map calibration needs two points and a known distance.');
    const p1 = cal.getPoint(0), p2 = cal.getPoint(1);
    const distance = parseNumeric(p2.dx || p1.dx);
    this.scale = distance / dist2d(p1.px, p1.py, p2.px, p2.py);
    this.origin = p1;
    this.isReady = true;
  }
  pixelToData(px, py) { return [(px - this.origin.px) * this.scale, (py - this.origin.py) * this.scale]; }
}

export class BarAxes {
  constructor() { this.name = 'Bar'; this.isReady = false; this.labels = ['pixel_x', 'value']; }
  calibrate(cal) {
    if (cal.getCount() < 2) throw new Error('Bar calibration needs baseline and a value point.');
    const base = cal.getPoint(0), val = cal.getPoint(1);
    this.baseY = base.py;
    this.valueAtPoint = parseNumeric(val.dy);
    this.scaleY = this.valueAtPoint / (this.baseY - val.py);
    this.isReady = true;
  }
  pixelToData(px, py) { return [px, (this.baseY - py) * this.scaleY]; }
}

export class ImageAxes {
  constructor() { this.name = 'Image'; this.isReady = true; this.labels = ['pixel_x', 'pixel_y']; }
  calibrate() { this.isReady = true; }
  pixelToData(px, py) { return [px, py]; }
}

export class PolarAxes {
  constructor() { this.name = 'Polar'; this.isReady = false; this.labels = ['r', 'theta']; }
  calibrate(cal, { thetaDegrees = true, thetaClockwise = false, radialLog = false } = {}) {
    if (cal.getCount() < 3) throw new Error('Polar calibration needs three points: origin, radial point 1 and radial point 2.');
    const cp0 = cal.getPoint(0), cp1 = cal.getPoint(1), cp2 = cal.getPoint(2);
    this.x0 = cp0.px; this.y0 = cp0.py; this.x1 = cp1.px; this.y1 = cp1.py; this.x2 = cp2.px; this.y2 = cp2.py;
    this.r1 = parseNumeric(cp1.dx); this.theta1 = parseNumeric(cp1.dy); this.r2 = parseNumeric(cp2.dx); this.theta2 = parseNumeric(cp2.dy);
    this.thetaDegrees = thetaDegrees; this.thetaClockwise = thetaClockwise; this.radialLog = radialLog;
    if (thetaDegrees) { this.theta1 *= Math.PI / 180; this.theta2 *= Math.PI / 180; }
    if (radialLog) { this.r1 = Math.log10(this.r1); this.r2 = Math.log10(this.r2); }
    this.dist10 = dist2d(this.x1, this.y1, this.x0, this.y0);
    this.dist20 = dist2d(this.x2, this.y2, this.x0, this.y0);
    this.dist12 = this.dist20 - this.dist10;
    this.phi0 = taninverse(-(this.y1 - this.y0), this.x1 - this.x0);
    this.alpha0 = thetaClockwise ? this.phi0 + this.theta1 : this.phi0 - this.theta1;
    this.isReady = true;
  }
  pixelToData(px, py) {
    let r = ((this.r2 - this.r1) / this.dist12) * (dist2d(px, py, this.x0, this.y0) - this.dist10) + this.r1;
    let theta = this.thetaClockwise ? this.alpha0 - taninverse(-(py - this.y0), px - this.x0) : taninverse(-(py - this.y0), px - this.x0) - this.alpha0;
    if (theta < 0) theta += 2 * Math.PI;
    if (this.thetaDegrees) theta = 180 * theta / Math.PI;
    if (this.radialLog) r = 10 ** r;
    return [r, theta];
  }
}

export class TernaryAxes {
  constructor() { this.name = 'Ternary'; this.isReady = false; this.labels = ['a', 'b', 'c']; }
  calibrate(cal, { range100 = true, ternaryNormal = true } = {}) {
    if (cal.getCount() < 3) throw new Error('Ternary calibration needs three corner points.');
    const cp0 = cal.getPoint(0), cp1 = cal.getPoint(1), cp2 = cal.getPoint(2);
    this.x0 = cp0.px; this.y0 = cp0.py; this.x1 = cp1.px; this.y1 = cp1.py; this.x2 = cp2.px; this.y2 = cp2.py;
    this.L = dist2d(this.x0, this.y0, this.x1, this.y1);
    this.phi0 = taninverse(-(this.y1 - this.y0), this.x1 - this.x0);
    this.root3 = Math.sqrt(3); this.range100 = range100; this.ternaryNormal = ternaryNormal; this.isReady = true;
  }
  pixelToData(px, py) {
    const rp = dist2d(px, py, this.x0, this.y0);
    const theta = taninverse(-(py - this.y0), px - this.x0) - this.phi0;
    const xx = (rp * Math.cos(theta)) / this.L;
    const yy = (rp * Math.sin(theta)) / this.L;
    let a = 1 - xx - yy / this.root3;
    let b = xx - yy / this.root3;
    let c = 2 * yy / this.root3;
    if (!this.ternaryNormal) { const oldB = b; b = a; a = c; c = oldB; }
    if (this.range100) { a *= 100; b *= 100; c *= 100; }
    return [a, b, c];
  }
}

export class CircularRecorderAxes {
  constructor() { this.name = 'Circular Recorder'; this.isReady = false; this.labels = ['time', 'magnitude']; }
  calibrate(cal, { startTime = '', rotationTime = 'week', rotationDirection = 'anticlockwise' } = {}) {
    if (cal.getCount() < 5) throw new Error('Circular recorder calibration needs five points: three pen arc points and two chart arc points.');
    const [cp0, cp1, cp2, cp3, cp4] = [0, 1, 2, 3, 4].map(i => cal.getPoint(i));
    const t0 = parseDateOrNumber(cp0.dx); const tStart = parseDateOrNumber(startTime || cp0.dx);
    this.time0 = t0.value; this.timeFormat = t0.format; this.tStart = tStart.value;
    const date0 = new Date(this.time0); const dateEnd = new Date(this.tStart);
    if (rotationTime === 'week') { this.timeMax = Number(date0.setDate(date0.getDate() + 7)); this.tEnd = Number(dateEnd.setDate(dateEnd.getDate() + 7)); }
    else { this.timeMax = Number(date0.setHours(date0.getHours() + 24)); this.tEnd = Number(dateEnd.setHours(dateEnd.getHours() + 24)); }
    const penCircle = getCircleFrom3Pts([[cp0.px, cp0.py], [cp1.px, cp1.py], [cp2.px, cp2.py]]);
    const chartCircle = getCircleFrom3Pts([[cp2.px, cp2.py], [cp3.px, cp3.py], [cp4.px, cp4.py]]);
    this.thetac0 = taninverse(penCircle.y0 - chartCircle.y0, penCircle.x0 - chartCircle.x0) * 180 / Math.PI;
    this.thetaStartOffset = 360 * (this.tStart - this.time0) / (this.timeMax - this.time0);
    this.xChart = chartCircle.x0; this.yChart = chartCircle.y0; this.xPen = penCircle.x0; this.yPen = penCircle.y0;
    this.rPen = penCircle.radius; this.rMin = parseNumeric(cp0.dy); this.rMax = parseNumeric(cp2.dy);
    this.rMinPx = dist2d(cp0.px, cp0.py, chartCircle.x0, chartCircle.y0); this.rMaxPx = dist2d(cp2.px, cp2.py, chartCircle.x0, chartCircle.y0);
    this.chartToPenDist = dist2d(chartCircle.x0, chartCircle.y0, penCircle.x0, penCircle.y0);
    this.rotationDirection = rotationDirection; this.rotationTime = rotationTime; this.isReady = true;
  }
  pixelToData(px, py) {
    const rPx = dist2d(px, py, this.xChart, this.yChart);
    const r = (this.rMax - this.rMin) * (rPx - this.rMinPx) / (this.rMaxPx - this.rMinPx) + this.rMin;
    const thetap = taninverse(py - this.yChart, px - this.xChart);
    const cosArg = Math.max(-1, Math.min(1, (this.chartToPenDist ** 2 + rPx ** 2 - this.rPen ** 2) / (2 * this.chartToPenDist * rPx)));
    const alpha = Math.acos(cosArg);
    let timeVal = 0;
    if (this.rotationDirection === 'anticlockwise') {
      const deg = normalizeAngleDeg((thetap + alpha) * 180 / Math.PI);
      timeVal = (this.tEnd - this.tStart) * normalizeAngleDeg(deg - this.thetac0 - this.thetaStartOffset) / 360 + this.tStart;
    } else {
      const deg = normalizeAngleDeg((thetap - alpha) * 180 / Math.PI);
      timeVal = (this.tEnd - this.tStart) * normalizeAngleDeg(-(deg - this.thetac0) - this.thetaStartOffset) / 360 + this.tStart;
    }
    return [this.timeFormat ? formatDateNumber(timeVal, this.timeFormat) : timeVal, r];
  }
}

export function createAxes(type) {
  if (type === 'Bar') return new BarAxes();
  if (type === 'Map') return new MapAxes();
  if (type === 'Polar') return new PolarAxes();
  if (type === 'Ternary') return new TernaryAxes();
  if (type === 'Circular Recorder') return new CircularRecorderAxes();
  if (type === 'Image') return new ImageAxes();
  return new XYAxes();
}
export function requiredCalibrationPoints(type) {
  if (type === 'Bar' || type === 'Map') return 2;
  if (type === 'Polar' || type === 'Ternary') return 3;
  if (type === 'Circular Recorder') return 5;
  if (type === 'Image') return 0;
  return 4;
}
export function labelsForAxes(axes, chartType) {
  return axes?.labels || (chartType === 'Ternary' ? ['a','b','c'] : ['x','y']);
}
