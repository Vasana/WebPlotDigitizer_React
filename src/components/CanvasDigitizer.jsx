import { useEffect, useMemo, useState } from 'react';
import { Crosshair, MousePointer2 } from 'lucide-react';
import { samplePixel } from '../core/autoDetect.js';

export default function CanvasDigitizer({ canvasRef, imageRef, imageInfo, zoom, mode, points, calibration, requiredCalPoints, axes, onCanvasPoint, onColorPick }) {
  const [cursor, setCursor] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    canvas.width = img.width * zoom;
    canvas.height = img.height * zoom;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoom, zoom);
    calibration.points.forEach((p, i) => drawMarker(ctx, p.px, p.py, '#f59e0b', `C${i + 1}`));
    points.forEach((p, i) => drawMarker(ctx, p.px, p.py, p.source === 'auto' ? '#22c55e' : '#38bdf8', String(i + 1), 3));
    ctx.restore();
  }, [canvasRef, imageRef, imageInfo, zoom, points, calibration.points]);

  const liveData = useMemo(() => {
    if (!cursor || !axes?.isReady) return null;
    const [x, y] = axes.pixelToData(cursor.x, cursor.y);
    return { x, y };
  }, [cursor, axes]);

  function pointerToImagePoint(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  }

  function handleMove(e) { setCursor(pointerToImagePoint(e)); }
  function handleClick(e) {
    const p = pointerToImagePoint(e);
    if (mode === 'pick-color') {
      const imgData = getCurrentImageData(imageRef.current);
      onColorPick(samplePixel(imgData, p.x, p.y));
      return;
    }
    onCanvasPoint(p);
  }

  return <div className="canvasShell">
    {!imageInfo && <div className="emptyCanvas"><Crosshair size={48} /><h3>Upload a chart image to begin</h3><p>Supports line/scatter plots, bars, maps, and simple image coordinate extraction.</p></div>}
    <canvas ref={canvasRef} onMouseMove={handleMove} onClick={handleClick} className={imageInfo ? 'digitizerCanvas' : 'hidden'} />
    {imageInfo && <div className="canvasHud">
      <span><MousePointer2 size={14}/> {cursor ? `${cursor.x.toFixed(1)}, ${cursor.y.toFixed(1)} px` : 'Move over image'}</span>
      <span>{liveData ? `data: ${fmt(liveData.x)}, ${fmt(liveData.y)}` : `calibration: ${calibration.getCount()}/${requiredCalPoints}`}</span>
      <span>{Math.round(zoom * 100)}%</span>
    </div>}
  </div>;
}

function drawMarker(ctx, x, y, color, label, r = 5) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r * 2, y); ctx.lineTo(x + r * 2, y); ctx.moveTo(x, y - r * 2); ctx.lineTo(x, y + r * 2); ctx.stroke();
  ctx.font = '12px Inter, system-ui'; ctx.fillText(label, x + 7, y - 7);
}
function fmt(v) { return Number.isFinite(v) ? Number(v).toPrecision(6) : '—'; }
function getCurrentImageData(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}
