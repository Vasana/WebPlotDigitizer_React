import { useMemo, useState } from 'react';
import CanvasDigitizer from './components/CanvasDigitizer.jsx';
import Sidebar from './components/Sidebar.jsx';
import DataTable from './components/DataTable.jsx';
import { useImageCanvas } from './hooks/useImageCanvas.js';
import { Calibration } from './core/calibration.js';
import { createAxes, requiredCalibrationPoints, labelsForAxes } from './core/axes.js';
import { averagingWindow, detectBlobs, detectColorPoints, traceXYLine, xStepInterpolation } from './core/autoDetect.js';
import { downloadText, toCsv } from './utils/exporters.js';
import './styles.css';

export default function App() {
  const { canvasRef, imageRef, imageInfo, zoom, setZoom, loadFile, getImageData } = useImageCanvas();
  const [chartType, setChartType] = useState('XY');
  const [mode, setMode] = useState('calibrate');
  const [calibration, setCalibration] = useState(() => new Calibration(2));
  const [calValues, setCalValuesState] = useState([]);
  const [axes, setAxes] = useState(createAxes('XY'));
  const [points, setPoints] = useState([]);
  const [seriesList, setSeriesList] = useState(['Series 1']);
  const [activeSeries, setActiveSeries] = useState('Series 1');
  const [seriesName, setSeriesName] = useState('Series 2');
  const [color, setColor] = useState('#000000');
  const [tolerance, setTolerance] = useState(55);
  const [logX, setLogX] = useState(false);
  const [logY, setLogY] = useState(false);
  const [noRotation, setNoRotation] = useState(false);
  const [thetaDegrees, setThetaDegrees] = useState(true);
  const [thetaClockwise, setThetaClockwise] = useState(false);
  const [radialLog, setRadialLog] = useState(false);
  const [range100, setRange100] = useState(true);
  const [ternaryNormal, setTernaryNormal] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [rotationTime, setRotationTime] = useState('week');
  const [rotationDirection, setRotationDirection] = useState('anticlockwise');
  const [algorithm, setAlgorithm] = useState('Color thinning');
  const [algorithmOptions, setAlgorithmOptions] = useState({ minArea: 4, maxArea: 100000, windowSize: 8, step: 4, lineStep: 2, xMin: '', xMax: '', xStep: '', yScanPixels: '' });
  const [message, setMessage] = useState('Upload an image and start calibration.');
  const requiredCalPoints = useMemo(() => requiredCalibrationPoints(chartType), [chartType]);
  const labels = useMemo(() => labelsForAxes(axes, chartType), [axes, chartType]);

  function resetForChart(type) {
    setChartType(type); setCalibration(new Calibration(2)); setCalValuesState([]); setAxes(createAxes(type)); setPoints([]); setMode(type === 'Image' ? 'manual' : 'calibrate');
    if (type === 'Image') setMessage('Image axes selected; pixel coordinates are exported directly.');
  }

  function setCalValues(i, key, value) { setCalValuesState(prev => { const next = [...prev]; next[i] = { ...(next[i] || {}), [key]: value }; return next; }); }

  function handleCanvasPoint(p) {
    if (!imageInfo) return;
    if (mode === 'calibrate') {
      const next = new Calibration(2);
      next.points = calibration.points.slice(0, requiredCalPoints);
      if (next.getCount() >= requiredCalPoints) next.points = [];
      const i = next.getCount(); const vals = calValues[i] || {};
      next.addPoint(p.x, p.y, vals.dx ?? '', vals.dy ?? ''); setCalibration(next);
      setMessage(`Calibration point ${next.getCount()} captured.`); return;
    }
    if (mode === 'manual') addDataPoints([{ px: p.x, py: p.y, source: 'manual' }]);
  }

  function calibrate() {
    try {
      const cal = new Calibration(2);
      calibration.points.forEach((p, i) => cal.addPoint(p.px, p.py, calValues[i]?.dx ?? p.dx, calValues[i]?.dy ?? p.dy));
      const ax = createAxes(chartType);
      ax.calibrate(cal, { logX, logY, noRotation, thetaDegrees, thetaClockwise, radialLog, range100, ternaryNormal, startTime, rotationTime, rotationDirection });
      setCalibration(cal); setAxes(ax); setMessage(`${chartType} axes calibrated successfully.`); setPoints(prev => convertPoints(prev, ax));
    } catch (err) { setMessage(err.message); }
  }

  function addDataPoints(raw) {
    const converted = convertPoints(raw, axes).map((p) => ({ ...p, series: activeSeries, id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}` }));
    setPoints(prev => [...prev, ...converted]);
  }
  function convertPoints(raw, ax = axes) {
    return raw.map(p => {
      const values = ax?.isReady ? ax.pixelToData(p.px, p.py) : [];
      return { ...p, x: values?.[0] ?? null, y: values?.[1] ?? null, values };
    });
  }
  function handleColorPick(rgba) { const hex = '#' + rgba.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join(''); setColor(hex); setMode('manual'); setMessage(`Picked ${hex}. Run auto extraction to extract matching marks.`); }

  function autoDetect() {
    const imageData = getImageData(); if (!imageData) { setMessage('Upload an image first.'); return; }
    const rgb = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    let detected = [];
    if (algorithm === 'XY line trace') detected = traceXYLine(imageData, rgb, { tolerance, xStep: algorithmOptions.lineStep, minPixels: 1 });
    else if (algorithm === 'Blob detector') detected = detectBlobs(imageData, rgb, { tolerance, minArea: algorithmOptions.minArea, maxArea: algorithmOptions.maxArea });
    else if (algorithm === 'Averaging window') detected = averagingWindow(imageData, rgb, { tolerance, windowSize: algorithmOptions.windowSize, step: algorithmOptions.step });
    else if (algorithm === 'X-step interpolation') detected = xStepInterpolation(imageData, rgb, axes, { tolerance, xMin: algorithmOptions.xMin, xMax: algorithmOptions.xMax, xStep: algorithmOptions.xStep, yScanPixels: algorithmOptions.yScanPixels });
    else detected = detectColorPoints(imageData, rgb, { tolerance, step: 2, minClusterSize: 2 });
    addDataPoints(detected); setMessage(`${algorithm} found ${detected.length} candidate point${detected.length === 1 ? '' : 's'}. Review the table and delete outliers.`);
  }

  function addSeries() { const name = seriesName.trim(); if (!name) return; if (!seriesList.includes(name)) setSeriesList(prev => [...prev, name]); setActiveSeries(name); setSeriesName(`Series ${seriesList.length + 2}`); }
  function clearCalibration() { setCalibration(new Calibration(2)); setAxes(createAxes(chartType)); setMessage('Calibration cleared.'); }
  function clearPoints() { setPoints([]); setMessage('Data points cleared.'); }
  function deletePoint(index) { setPoints(prev => prev.filter((_, i) => i !== index)); }
  function exportCsv() { downloadText('digitized-data.csv', toCsv(points, labels), 'text/csv'); }
  function exportJson() { downloadText('digitized-project.json', JSON.stringify(projectPayload(), null, 2), 'application/json'); }
  function saveProject() { downloadText('webplotdigitizer-react-project.json', JSON.stringify(projectPayload(), null, 2), 'application/json'); }
  function projectPayload() { return { version: 2, chartType, imageInfo, calibration: calibration.points, calValues, points, seriesList, activeSeries, settings: { logX, logY, noRotation, thetaDegrees, thetaClockwise, radialLog, range100, ternaryNormal, startTime, rotationTime, rotationDirection }, labels }; }
  async function loadProject(file) {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      setChartType(json.chartType || 'XY'); setCalibration(Object.assign(new Calibration(2), { points: json.calibration || [] })); setCalValuesState(json.calValues || []); setPoints(json.points || []); setSeriesList(json.seriesList || ['Series 1']); setActiveSeries(json.activeSeries || 'Series 1');
      const s = json.settings || {}; setLogX(!!s.logX); setLogY(!!s.logY); setNoRotation(!!s.noRotation); setThetaDegrees(s.thetaDegrees ?? true); setThetaClockwise(!!s.thetaClockwise); setRadialLog(!!s.radialLog); setRange100(s.range100 ?? true); setTernaryNormal(s.ternaryNormal ?? true); setStartTime(s.startTime || ''); setRotationTime(s.rotationTime || 'week'); setRotationDirection(s.rotationDirection || 'anticlockwise');
      setAxes(createAxes(json.chartType || 'XY')); setMessage('Project data loaded. Re-upload the source image if needed, then apply calibration to resume conversion.');
    } catch (err) { setMessage(`Could not load project: ${err.message}`); }
  }

  return <main className="app">
    <Sidebar chartType={chartType} setChartType={resetForChart} mode={mode} setMode={setMode} imageInfo={imageInfo} loadFile={loadFile} loadProject={loadProject} zoom={zoom} setZoom={setZoom} calibration={calibration} requiredCalPoints={requiredCalPoints} calValues={calValues} setCalValues={setCalValues} calibrate={calibrate} axesReady={axes?.isReady} color={color} setColor={setColor} tolerance={tolerance} setTolerance={setTolerance} autoDetect={autoDetect} clearPoints={clearPoints} clearCalibration={clearCalibration} exportCsv={exportCsv} exportJson={exportJson} saveProject={saveProject} logX={logX} setLogX={setLogX} logY={logY} setLogY={setLogY} noRotation={noRotation} setNoRotation={setNoRotation} thetaDegrees={thetaDegrees} setThetaDegrees={setThetaDegrees} thetaClockwise={thetaClockwise} setThetaClockwise={setThetaClockwise} radialLog={radialLog} setRadialLog={setRadialLog} range100={range100} setRange100={setRange100} ternaryNormal={ternaryNormal} setTernaryNormal={setTernaryNormal} startTime={startTime} setStartTime={setStartTime} rotationTime={rotationTime} setRotationTime={setRotationTime} rotationDirection={rotationDirection} setRotationDirection={setRotationDirection} algorithm={algorithm} setAlgorithm={setAlgorithm} algorithmOptions={algorithmOptions} setAlgorithmOptions={setAlgorithmOptions} seriesName={seriesName} setSeriesName={setSeriesName} addSeries={addSeries} seriesList={seriesList} activeSeries={activeSeries} setActiveSeries={setActiveSeries}/>
    <section className="workspace">
      <header className="topbar"><div><b>{chartType} extraction workspace</b><span>{message}</span></div><div className="modeBadge">Mode: {mode}</div></header>
      <CanvasDigitizer canvasRef={canvasRef} imageRef={imageRef} imageInfo={imageInfo} zoom={zoom} mode={mode} points={points} calibration={calibration} requiredCalPoints={requiredCalPoints} axes={axes} onCanvasPoint={handleCanvasPoint} onColorPick={handleColorPick}/>
      <DataTable points={points} labels={labels} onDelete={deletePoint}/>
    </section>
  </main>;
}
