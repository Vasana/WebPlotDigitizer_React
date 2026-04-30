import { Download, FolderOpen, ImagePlus, Magnet, RotateCcw, Save, Table2, Trash2, Wand2, ZoomIn, ZoomOut } from 'lucide-react';

const chartTypes = ['XY', 'Bar', 'Map', 'Polar', 'Ternary', 'Circular Recorder', 'Image'];
const algorithms = ['XY line trace', 'Color thinning', 'Blob detector', 'Averaging window', 'X-step interpolation'];

export default function Sidebar(props) {
  const { chartType, setChartType, mode, setMode, imageInfo, loadFile, loadProject, zoom, setZoom, calibration, requiredCalPoints, calValues, setCalValues, calibrate, axesReady, color, setColor, tolerance, setTolerance, autoDetect, clearPoints, clearCalibration, exportCsv, exportJson, saveProject, logX, setLogX, logY, setLogY, noRotation, setNoRotation, thetaDegrees, setThetaDegrees, thetaClockwise, setThetaClockwise, radialLog, setRadialLog, range100, setRange100, ternaryNormal, setTernaryNormal, startTime, setStartTime, rotationTime, setRotationTime, rotationDirection, setRotationDirection, algorithm, setAlgorithm, algorithmOptions, setAlgorithmOptions, seriesName, setSeriesName, addSeries, seriesList, activeSeries, setActiveSeries } = props;
  const updateAlgo = (key, value) => setAlgorithmOptions(prev => ({ ...prev, [key]: value }));
  return <aside className="sidebar">
    <section className="panel heroPanel">
      <h1>WebPlotDigitizer React</h1>
      <p>Computer-vision assisted data extraction for chart images.</p>
      <label className="uploadButton"><ImagePlus size={18}/> Upload image<input type="file" accept="image/*" onChange={e => loadFile(e.target.files?.[0])}/></label>
      <label className="uploadButton secondaryUpload"><FolderOpen size={18}/> Resume project<input type="file" accept="application/json" onChange={e => loadProject(e.target.files?.[0])}/></label>
      {imageInfo && <small>{imageInfo.name} · {imageInfo.width}×{imageInfo.height}</small>}
    </section>

    <section className="panel">
      <h2>1. Chart type</h2>
      <select value={chartType} onChange={e => setChartType(e.target.value)}>{chartTypes.map(t => <option key={t}>{t}</option>)}</select>
      <p className="note">Advanced axes now include Polar, Ternary and Circular Recorder conversion engines.</p>
    </section>

    <section className="panel">
      <h2>2. Calibrate axes</h2>
      <div className="buttonRow"><button className={mode === 'calibrate' ? 'active' : ''} onClick={() => setMode('calibrate')}><Magnet size={16}/> Pick calibration</button><button onClick={clearCalibration}><RotateCcw size={16}/> Reset</button></div>
      {chartType === 'XY' ? <XYCalibrationGrid calibration={calibration} calValues={calValues} setCalValues={setCalValues} /> : <div className="calGrid">
        {Array.from({ length: requiredCalPoints }).map((_, i) => <div className="calCard" key={i}>
          <b>C{i + 1}</b><span>{calibration.points[i] ? `${calibration.points[i].px.toFixed(0)}, ${calibration.points[i].py.toFixed(0)} px` : 'click canvas'}</span>
          <input placeholder={labelFor(chartType, i, 'x')} value={calValues[i]?.dx ?? ''} onChange={e => setCalValues(i, 'dx', e.target.value)} />
          <input placeholder={labelFor(chartType, i, 'y')} value={calValues[i]?.dy ?? ''} onChange={e => setCalValues(i, 'dy', e.target.value)} />
        </div>)}
      </div>}
      {chartType === 'XY' && <div className="checkGrid"><label><input type="checkbox" checked={logX} onChange={e => setLogX(e.target.checked)}/> Log X</label><label><input type="checkbox" checked={logY} onChange={e => setLogY(e.target.checked)}/> Log Y</label><label><input type="checkbox" checked={noRotation} onChange={e => setNoRotation(e.target.checked)}/> No rotation</label></div>}
      {chartType === 'Polar' && <div className="checkGrid"><label><input type="checkbox" checked={thetaDegrees} onChange={e => setThetaDegrees(e.target.checked)}/> Degrees</label><label><input type="checkbox" checked={thetaClockwise} onChange={e => setThetaClockwise(e.target.checked)}/> Clockwise</label><label><input type="checkbox" checked={radialLog} onChange={e => setRadialLog(e.target.checked)}/> Log radial</label></div>}
      {chartType === 'Ternary' && <div className="checkGrid"><label><input type="checkbox" checked={range100} onChange={e => setRange100(e.target.checked)}/> 0–100 range</label><label><input type="checkbox" checked={ternaryNormal} onChange={e => setTernaryNormal(e.target.checked)}/> Normal orientation</label></div>}
      {chartType === 'Circular Recorder' && <div className="advancedGrid"><label>Start time<input value={startTime} placeholder="2026-04-26 00:00" onChange={e => setStartTime(e.target.value)} /></label><label>Rotation period<select value={rotationTime} onChange={e => setRotationTime(e.target.value)}><option value="day">Day</option><option value="week">Week</option></select></label><label>Direction<select value={rotationDirection} onChange={e => setRotationDirection(e.target.value)}><option value="anticlockwise">Anticlockwise</option><option value="clockwise">Clockwise</option></select></label></div>}
      <button className="primary" disabled={requiredCalPoints > 0 && calibration.getCount() < requiredCalPoints} onClick={calibrate}><Save size={16}/> Apply calibration</button>
      <p className={axesReady ? 'status ok' : 'status'}>{axesReady ? 'Axes calibrated. Digitized pixels will be converted to numerical values.' : requiredCalPoints === 0 ? 'Image axes require no calibration.' : `Pick ${requiredCalPoints} calibration points and enter their known values.`}</p>
    </section>

    <section className="panel">
      <h2>3. Series & extraction</h2>
      <div className="advancedGrid"><label>Active series<select value={activeSeries} onChange={e => setActiveSeries(e.target.value)}>{seriesList.map(s => <option key={s}>{s}</option>)}</select></label><label>New series<input value={seriesName} onChange={e => setSeriesName(e.target.value)} placeholder="Series name" /></label><button onClick={addSeries}>Add series</button></div>
      <div className="buttonRow"><button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>Manual points</button><button className={mode === 'pick-color' ? 'active' : ''} onClick={() => setMode('pick-color')}>Pick color</button></div>
      <div className="detectControls"><label>Target color <input type="color" value={color} onChange={e => setColor(e.target.value)} /></label><label>Tolerance <input type="range" min="10" max="160" value={tolerance} onChange={e => setTolerance(Number(e.target.value))}/><span>{tolerance}</span></label></div>
      <label className="blockLabel">Algorithm<select value={algorithm} onChange={e => setAlgorithm(e.target.value)}>{algorithms.map(a => <option key={a}>{a}</option>)}</select></label>
      {algorithm === 'Blob detector' && <div className="advancedGrid"><label>Min area<input type="number" value={algorithmOptions.minArea} onChange={e => updateAlgo('minArea', Number(e.target.value))}/></label><label>Max area<input type="number" value={algorithmOptions.maxArea} onChange={e => updateAlgo('maxArea', Number(e.target.value))}/></label></div>}
      {algorithm === 'XY line trace' && <div className="advancedGrid"><label>X pixel step<input type="number" value={algorithmOptions.lineStep} onChange={e => updateAlgo('lineStep', Number(e.target.value))}/></label></div>}
      {algorithm === 'Averaging window' && <div className="advancedGrid"><label>Window<input type="number" value={algorithmOptions.windowSize} onChange={e => updateAlgo('windowSize', Number(e.target.value))}/></label><label>Step<input type="number" value={algorithmOptions.step} onChange={e => updateAlgo('step', Number(e.target.value))}/></label></div>}
      {algorithm === 'X-step interpolation' && <div className="advancedGrid"><label>X min<input value={algorithmOptions.xMin} onChange={e => updateAlgo('xMin', e.target.value)}/></label><label>X max<input value={algorithmOptions.xMax} onChange={e => updateAlgo('xMax', e.target.value)}/></label><label>X step<input value={algorithmOptions.xStep} onChange={e => updateAlgo('xStep', e.target.value)}/></label><label>Y scan px optional<input value={algorithmOptions.yScanPixels} onChange={e => updateAlgo('yScanPixels', e.target.value)} placeholder="blank = full Y range"/></label></div>}
      <button onClick={autoDetect}><Wand2 size={16}/> Run auto extraction</button>
      <button onClick={clearPoints}><Trash2 size={16}/> Clear data points</button>
    </section>

    <section className="panel">
      <h2>4. View & export</h2>
      <div className="buttonRow"><button onClick={() => setZoom(Math.max(.25, zoom - .25))}><ZoomOut size={16}/> Zoom out</button><button onClick={() => setZoom(Math.min(6, zoom + .25))}><ZoomIn size={16}/> Zoom in</button></div>
      <div className="buttonRow"><button onClick={exportCsv}><Table2 size={16}/> CSV</button><button onClick={exportJson}><Download size={16}/> JSON</button></div>
      <button onClick={saveProject}><Save size={16}/> Save resumable project</button>
    </section>
  </aside>;
}

const xyCalibrationRows = [
  { title: 'C1', hint: 'Click X-axis minimum tick', label: 'X minimum value', keyName: 'dx', placeholder: 'e.g. 0' },
  { title: 'C2', hint: 'Click X-axis maximum tick', label: 'X maximum value', keyName: 'dx', placeholder: 'e.g. 100' },
  { title: 'C3', hint: 'Click Y-axis minimum tick', label: 'Y minimum value', keyName: 'dy', placeholder: 'e.g. 0' },
  { title: 'C4', hint: 'Click Y-axis maximum tick', label: 'Y maximum value', keyName: 'dy', placeholder: 'e.g. 50' }
];

function XYCalibrationGrid({ calibration, calValues, setCalValues }) {
  return <div className="calGrid xyCalGrid">
    <p className="inlineHelp">Click the four calibration points in order. Enter only the real axis value for that point.</p>
    {xyCalibrationRows.map((row, i) => <div className="calCard xyCalCard" key={row.title}>
      <div className="calPointBadge"><b>{row.title}</b><span>{calibration.points[i] ? `${calibration.points[i].px.toFixed(0)}, ${calibration.points[i].py.toFixed(0)} px` : 'click canvas'}</span></div>
      <div className="calInstruction"><strong>{row.hint}</strong><small>{row.label}</small></div>
      <input
        aria-label={row.label}
        placeholder={row.placeholder}
        value={calValues[i]?.[row.keyName] ?? ''}
        onChange={e => setCalValues(i, row.keyName, e.target.value)}
      />
    </div>)}
  </div>;
}

function labelFor(type, i, axis) {
  if (type === 'XY') return axis === 'x' ? ['X min','X max','',''][i] || '' : ['', '', 'Y min','Y max'][i] || '';
  if (type === 'Bar') return axis === 'x' ? (i === 1 ? 'optional distance' : '') : (i === 1 ? 'known value' : 'baseline value');
  if (type === 'Map') return axis === 'x' && i === 1 ? 'known distance' : '';
  if (type === 'Polar') return axis === 'x' ? ['', 'r1', 'r2'][i] || '' : ['', 'θ1', 'θ2'][i] || '';
  if (type === 'Ternary') return axis === 'x' ? ['A corner','B corner','C corner'][i] || '' : '';
  if (type === 'Circular Recorder') return axis === 'x' ? ['time at inner arc','', '', '', ''][i] || '' : ['min value','', 'max value', '', ''][i] || '';
  return '';
}
